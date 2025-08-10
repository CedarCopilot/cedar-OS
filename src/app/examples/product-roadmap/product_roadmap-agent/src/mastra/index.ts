import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { productRoadmapAgent } from './agents/product-roadmap-agent';
import { registerApiRoute } from '@mastra/core/server';
import { z } from 'zod';
import type { Context } from 'hono';
import {
	handleVoiceMessage,
	handleVoiceToText,
	handleVoiceExecute,
} from './voice';
import { Agent } from '@mastra/core';

// Define the chat request schema for Cedar compatibility
const ChatRequestSchema = z.object({
	prompt: z.string(), // Cedar sends 'prompt' not 'messages'
	model: z.string().optional(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
	systemPrompt: z.string().optional(),
	additionalContext: z.any().optional(),
	// For structured output
	output: z.any().optional(),
});

// Define schemas for product roadmap actions
const FeatureNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	status: z
		.enum(['done', 'planned', 'backlog', 'in progress'])
		.default('planned'),
	nodeType: z.literal('feature').default('feature'),
	upvotes: z.number().default(0),
	comments: z
		.array(
			z.object({
				id: z.string(),
				author: z.string(),
				text: z.string(),
			})
		)
		.default([]),
});

const NodeSchema = z.object({
	id: z.string().optional(),
	position: z
		.object({
			x: z.number(),
			y: z.number(),
		})
		.optional(),
	data: FeatureNodeDataSchema,
});

// Action schemas
const AddNodeActionSchema = z.object({
	type: z.literal('action'),
	stateKey: z.literal('nodes'),
	setterKey: z.literal('addNode'),
	args: z.array(NodeSchema),
	content: z.string(),
});

const RemoveNodeActionSchema = z.object({
	type: z.literal('action'),
	stateKey: z.literal('nodes'),
	setterKey: z.literal('removeNode'),
	args: z.array(z.string()), // Just the node ID
	content: z.string(),
});

const ChangeNodeActionSchema = z.object({
	type: z.literal('action'),
	stateKey: z.literal('nodes'),
	setterKey: z.literal('changeNode'),
	args: z.array(NodeSchema),
	content: z.string(),
});

const MessageResponseSchema = z.object({
	type: z.literal('message'),
	content: z.string(),
	role: z.literal('assistant').default('assistant'),
});

// Union of all possible responses
const ExecuteFunctionResponseSchema = z.union([
	AddNodeActionSchema,
	RemoveNodeActionSchema,
	ChangeNodeActionSchema,
	MessageResponseSchema,
]);

// Execute function handler - returns structured actions or messages
async function handleExecuteFunction(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt, additionalContext } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('productRoadmapAgent') as Agent;
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Enhanced system prompt to guide the agent to return structured actions
		const enhancedSystemPrompt = `${systemPrompt || ''}
You are a product roadmap assistant. When users ask you to modify the roadmap, you should return structured actions.

Available actions:
1. addNode - Add a new feature node to the roadmap
2. removeNode - Remove a feature node by ID
3. changeNode - Update an existing feature node

When returning an action, use this exact structure:
{
  "type": "action",
  "stateKey": "nodes",
  "setterKey": "addNode" | "removeNode" | "changeNode",
  "args": [appropriate arguments],
  "content": "A human-readable description of what you did"
}

For addNode, args should be: [{ data: { title, description, status, nodeType: "feature", upvotes: 0, comments: [] } }]
For removeNode, args should be: ["nodeId"]
For changeNode, args should be: [{ id: "nodeId", data: { ...updated fields } }]

If the user is just asking a question or making a comment, return:
{
  "type": "message",
  "content": "Your response",
  "role": "assistant"
}`;

		// Convert prompt to messages format for the agent
		const messages = [
			{ role: 'system' as const, content: enhancedSystemPrompt },
			{
				role: 'user' as const,
				content: `prompt: ${prompt}

				additionalContext: ${JSON.stringify(additionalContext)}`,
			},
		];

		const response = await agent.generate(messages, {
			temperature,
			maxTokens,
			// maxSteps: 3, // Allow tool usage
			experimental_output: ExecuteFunctionResponseSchema, // Use experimental_output for structured output with tools
		});

		console.log(response.object);

		// Return the structured response
		return c.json({
			// text: response.object?.content || '', // Extract content from the structured object
			object: response.object || {
				type: 'message',
				content: '',
				role: 'assistant',
			},
			usage: response.usage,
		});
	} catch (error) {
		console.error('Execute function error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Chat handler - regular text generation
async function handleChatMessage(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('productRoadmapAgent') as Agent;
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Convert prompt to messages format for the agent
		const messages = [
			...(systemPrompt
				? [{ role: 'system' as const, content: systemPrompt }]
				: []),
			{ role: 'user' as const, content: prompt },
		];

		const response = await agent.generate(messages, {
			temperature,
			maxTokens,
			maxSteps: 1,
			onStepFinish: ({ text, toolCalls, toolResults }) => {
				console.log('Step completed:', { text, toolCalls, toolResults });
			},
		});

		// Return in Cedar's expected format
		return c.json({
			text: response.text, // Cedar expects 'text' field
			usage: response.usage,
		});
	} catch (error) {
		console.error('Chat error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Streaming handler - for real-time responses
async function handleChatMessageStream(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('productRoadmapAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Convert prompt to messages format for the agent
		const messages = [
			...(systemPrompt
				? [{ role: 'system' as const, content: systemPrompt }]
				: []),
			{ role: 'user' as const, content: prompt },
		];

		const stream = await agent.stream(messages, {
			temperature,
			maxTokens,
		});

		// Create a TransformStream to convert the agent's stream to SSE format
		const encoder = new TextEncoder();
		const transformStream = new TransformStream({
			async transform(chunk, controller) {
				// Format as Server-Sent Events
				controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
			},
			flush(controller) {
				// Send the done event
				controller.enqueue(encoder.encode(`event: done\ndata: \n\n`));
			},
		});

		// Pipe the text stream through our transform
		const reader = stream.textStream.getReader();
		const writer = transformStream.writable.getWriter();

		(async () => {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					await writer.write(value);
				}
			} finally {
				await writer.close();
			}
		})();

		return new Response(transformStream.readable, {
			status: 200,
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('Stream error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Structured output handler - for JSON responses
async function handleStructuredOutput(c: Context) {
	try {
		const body = await c.req.json();
		const { prompt, temperature, maxTokens, systemPrompt, output } =
			ChatRequestSchema.parse(body);

		const agent = c.get('mastra').getAgent('productRoadmapAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// If no output schema is provided, return an error
		if (!output) {
			return c.json(
				{ error: 'Output schema is required for structured output' },
				400
			);
		}

		// Convert prompt to messages format for the agent
		const messages = [
			...(systemPrompt
				? [{ role: 'system' as const, content: systemPrompt }]
				: []),
			{ role: 'user' as const, content: prompt },
		];

		const response = await agent.generate(messages, {
			temperature,
			maxTokens,
			output, // Pass the schema for structured output
		});

		// The structured output is in response.object when using output schema
		return c.json({
			object: response.object,
			text: response.text, // Also include text for compatibility
			usage: response.usage,
		});
	} catch (error) {
		console.error('Structured output error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Define API routes before using them
const apiRoutes = [
	registerApiRoute('/chat', {
		method: 'POST',
		handler: handleChatMessage,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
								output: {
									type: 'object',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/stream', {
		method: 'POST',
		handler: handleChatMessageStream,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/structured', {
		method: 'POST',
		handler: handleStructuredOutput,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
								output: {
									type: 'object',
									description:
										'JSON Schema or Zod schema for structured output',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/voice', {
		method: 'POST',
		handler: handleVoiceMessage,
		openapi: {
			requestBody: {
				content: {
					'multipart/form-data': {
						schema: {
							type: 'object',
							properties: {
								audio: {
									type: 'string',
									format: 'binary',
									description: 'Audio file (WebM, MP3, etc.)',
								},
								settings: {
									type: 'string',
									description: 'JSON string of voice settings',
								},
							},
							required: ['audio'],
						},
					},
				},
			},
			responses: {
				'200': {
					description: 'JSON response with transcription, text, and audio data',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									transcription: {
										type: 'string',
										description: 'The transcribed text from the audio',
									},
									text: {
										type: 'string',
										description: 'The agent response',
									},
									usage: {
										type: 'object',
										description: 'Token usage information',
									},
									audioData: {
										type: 'string',
										description: 'Base64 encoded audio response',
									},
									audioFormat: {
										type: 'string',
										description: 'MIME type of the audio data',
									},
								},
							},
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/voice-to-text', {
		method: 'POST',
		handler: handleVoiceToText,
		openapi: {
			requestBody: {
				content: {
					'multipart/form-data': {
						schema: {
							type: 'object',
							properties: {
								audio: {
									type: 'string',
									format: 'binary',
									description: 'Audio file (WebM, MP3, etc.)',
								},
							},
							required: ['audio'],
						},
					},
				},
			},
			responses: {
				'200': {
					description: 'Text response with transcription',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									transcription: {
										type: 'string',
										description: 'The transcribed text from the audio',
									},
									text: {
										type: 'string',
										description: 'The agent response',
									},
									usage: {
										type: 'object',
										description: 'Token usage information',
									},
								},
							},
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/execute-function', {
		method: 'POST',
		handler: handleExecuteFunction,
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: {
							type: 'object',
							properties: {
								prompt: {
									type: 'string',
									description: 'The prompt to send to the agent',
								},
								model: {
									type: 'string',
								},
								temperature: {
									type: 'number',
								},
								maxTokens: {
									type: 'number',
								},
								systemPrompt: {
									type: 'string',
								},
							},
							required: ['prompt'],
						},
					},
				},
			},
		},
	}),
	registerApiRoute('/chat/voice-execute', {
		method: 'POST',
		handler: handleVoiceExecute,
		openapi: {
			requestBody: {
				content: {
					'multipart/form-data': {
						schema: {
							type: 'object',
							properties: {
								audio: {
									type: 'string',
									format: 'binary',
									description: 'Audio file (WebM, MP3, etc.)',
								},
								settings: {
									type: 'string',
									description: 'JSON string of voice settings',
								},
							},
							required: ['audio'],
						},
					},
				},
			},
			responses: {
				'200': {
					description:
						'Voice execute response with transcription, text, structured object, and audio data',
					content: {
						'application/json': {
							schema: {
								type: 'object',
								properties: {
									transcription: {
										type: 'string',
										description: 'The transcribed text from the audio',
									},
									text: {
										type: 'string',
										description: 'The content from the structured response',
									},
									object: {
										type: 'object',
										description: 'The structured action or message object',
									},
									usage: {
										type: 'object',
										description: 'Token usage information',
									},
									audioData: {
										type: 'string',
										description: 'Base64 encoded audio response',
									},
									audioFormat: {
										type: 'string',
										description: 'MIME type of the audio data',
									},
								},
							},
						},
					},
				},
			},
		},
	}),
];

export const mastra = new Mastra({
	// workflows: { productRoadmapWorkflow },
	agents: { productRoadmapAgent },
	storage: new LibSQLStore({
		// stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
		url: ':memory:',
	}),
	server: {
		apiRoutes,
		cors: {
			origin: '*',
			credentials: true,
		},
	},
	logger: new PinoLogger({
		name: 'Mastra',
		level: 'info',
	}),
});

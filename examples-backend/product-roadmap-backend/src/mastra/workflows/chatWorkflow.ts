// ---------------------------------------------
// Workflows are a Mastra primitive to orchestrate agents and complex sequences of tasks
// Docs: https://mastra.ai/en/docs/workflows/overview
// ---------------------------------------------

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { productRoadmapAgent } from '../agents/productRoadmapAgent';
import { handleTextStreamV2, streamJSONEvent } from '../../utils/streamUtils';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { handleVoiceOutput } from '../voiceUtils';

// ---------------------------------------------
// Mastra nested streaming – emit placeholder events
// ---------------------------------------------

/**
 * All possible event types that can be emitted by Mastra primitives when using the
 * new nested streaming support (see https://mastra.ai/blog/nested-streaming-support).
 */
// export type MastraEventType =
// 	| 'start'
// 	| 'step-start'
// 	| 'tool-call'
// 	| 'tool-result'
// 	| 'step-finish'
// 	| 'tool-output'
// 	| 'step-result'
// 	| 'step-output'
// 	| 'text-delta'
// 	| 'finish';

// // Helper array so we can iterate easily when emitting placeholder events.
// const mastraEventTypes: MastraEventType[] = [
// 	'start',
// 	'step-start',
// 	'tool-call',
// 	'tool-result',
// 	'step-finish',
// 	'tool-output',
// 	'step-result',
// 	'step-output',
// 	'text-delta',
// 	'finish',
// ];

// // Pre-defined sample event objects that follow the shapes shown in the
// // nested-streaming blog post. These are purely illustrative and use mock IDs.
// const sampleMastraEvents: Record<MastraEventType, Record<string, unknown>> = {
// 	start: {
// 		type: 'start',
// 		from: 'AGENT',
// 		payload: {},
// 	},
// 	'step-start': {
// 		type: 'step-start',
// 		from: 'AGENT',
// 		payload: {
// 			messageId: 'msg_123',
// 			request: { role: 'user', content: 'Hello, world!' },
// 			warnings: [],
// 		},
// 	},
// 	'tool-call': {
// 		type: 'tool-call',
// 		from: 'AGENT',
// 		payload: {
// 			toolCallId: 'tc_456',
// 			args: { foo: 'bar' },
// 			toolName: 'sampleTool',
// 		},
// 	},
// 	'tool-result': {
// 		type: 'tool-result',
// 		from: 'AGENT',
// 		payload: {
// 			toolCallId: 'tc_456',
// 			toolName: 'sampleTool',
// 			result: { success: true },
// 		},
// 	},
// 	'step-finish': {
// 		type: 'step-finish',
// 		from: 'AGENT',
// 		payload: {
// 			reason: 'completed',
// 			usage: {
// 				promptTokens: 10,
// 				completionTokens: 20,
// 				totalTokens: 30,
// 			},
// 			response: { text: 'Done!' },
// 			messageId: 'msg_123',
// 			providerMetadata: {
// 				openai: {
// 					reasoningTokens: 5,
// 					acceptedPredictionTokens: 10,
// 					rejectedPredictionTokens: 0,
// 					cachedPromptTokens: 0,
// 				},
// 			},
// 		},
// 	},
// 	'tool-output': {
// 		type: 'tool-output',
// 		from: 'USER',
// 		payload: {
// 			output: { text: 'Nested output from agent' },
// 			toolCallId: 'tc_456',
// 			toolName: 'sampleTool',
// 		},
// 	},
// 	'step-result': {
// 		type: 'step-result',
// 		from: 'WORKFLOW',
// 		payload: {
// 			stepName: 'exampleStep',
// 			result: { data: 'example' },
// 			stepCallId: 'sc_789',
// 			status: 'success',
// 			endedAt: Date.now(),
// 		},
// 	},
// 	'step-output': {
// 		type: 'step-output',
// 		from: 'USER',
// 		payload: {
// 			output: { text: 'Nested output from step' },
// 			toolCallId: 'tc_456',
// 			toolName: 'sampleTool',
// 		},
// 	},
// 	finish: {
// 		type: 'finish',
// 		from: 'WORKFLOW',
// 		payload: {
// 			totalUsage: {
// 				promptTokens: 15,
// 				completionTokens: 35,
// 				totalTokens: 50,
// 			},
// 		},
// 	},
// 	'text-delta': {
// 		type: 'text-delta',
// 		from: 'AGENT',
// 		payload: {
// 			text: 'Hello, world!',
// 		},
// 	},
// };

// The emitMastraEvents step will be declared after buildAgentContext to ensure
// buildAgentContext is defined before we reference it.

export const ChatInputSchema = z.object({
	prompt: z.string(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
	systemPrompt: z.string().optional(),
	additionalContext: z.any(),
	// Memory linkage (optional)
	resourceId: z.string().optional(),
	threadId: z.string().optional(),
	streamController: z.any().optional(),
	// Voice support
	isVoice: z.boolean().optional(),
	// For structured output
	output: z.any().optional(),
});

export const ChatOutputSchema = z.object({
	content: z.string(),
	usage: z.any().optional(),
});

export type ChatOutput = z.infer<typeof ChatOutputSchema>;

// 1. fetchContext – passthrough (placeholder)
const fetchContext = createStep({
	id: 'fetchContext',
	description:
		'Placeholder step – you might want to fetch some information for your agent here',
	inputSchema: ChatInputSchema,
	outputSchema: ChatInputSchema.extend({
		context: z.any().optional(),
	}),
	execute: async ({ inputData }) => {
		console.log('Chat workflow received input data', inputData);
		const frontendContext = inputData.prompt;

		// Merge, filter, or modify the frontend context as needed
		const unifiedContext = frontendContext;

		const result = { ...inputData, prompt: unifiedContext };

		return result;
	},
});

// 2. buildAgentContext – build message array
const buildAgentContext = createStep({
	id: 'buildAgentContext',
	description: 'Combine fetched information and build LLM messages',
	inputSchema: fetchContext.outputSchema,
	outputSchema: ChatInputSchema.extend({
		message: z.string(),
	}),
	execute: async ({ inputData }) => {
		const {
			prompt,
			temperature,
			maxTokens,
			streamController,
			resourceId,
			threadId,
			additionalContext,
			isVoice,
		} = inputData;

		const message = prompt;

		const result = {
			...inputData,
			message,
			additionalContext,
			temperature,
			maxTokens,
			streamController,
			resourceId,
			threadId,
			isVoice,
		};

		return result;
	},
});

// 2.5 emitMastraEvents – emit a placeholder event for every new Mastra event type
const emitMastraEvents = createStep({
	id: 'emitMastraEvents',
	description:
		'Emit placeholder JSON events for every Mastra nested streaming event type',
	inputSchema: buildAgentContext.outputSchema,
	outputSchema: buildAgentContext.outputSchema,
	execute: async ({ inputData }) => {
		// Pass data through untouched so subsequent steps receive the original input
		return inputData;
	},
});

// 3. callAgent – invoke chatAgent
const callAgent = createStep({
	id: 'callAgent',
	description: 'Invoke the chat agent with streaming and return final text',
	inputSchema: buildAgentContext.outputSchema,
	outputSchema: ChatOutputSchema,
	execute: async ({ inputData }) => {
		const {
			message,
			temperature,
			maxTokens,
			streamController,
			systemPrompt,
			resourceId,
			threadId,
			additionalContext,
			isVoice,
		} = inputData;

		const runtimeContext = new RuntimeContext();
		runtimeContext.set('streamController', streamController);

		const streamResult = await productRoadmapAgent.streamVNext(
			[message, 'Additional Context: ' + JSON.stringify(additionalContext)],
			{
				...(systemPrompt ? ({ instructions: systemPrompt } as const) : {}),
				modelSettings: {
					temperature,
					...(maxTokens && { maxTokens }),
				},
				...(resourceId &&
					threadId && { memory: { resource: resourceId, thread: threadId } }),
				runtimeContext,
			}
		);

		let finalText = '';
		let pendingText = '';

		for await (const chunk of streamResult.fullStream) {
			if (chunk.type === 'text-delta') {
				finalText += chunk.payload.text;

				if (isVoice && streamController) {
					// Accumulate text for voice synthesis
					pendingText += chunk.payload.text;
				} else {
					// Regular text streaming
					await handleTextStreamV2(chunk.payload.text, streamController);
				}
			} else if (chunk.type === 'tool-result' || chunk.type === 'tool-call') {
				// Handle any pending text before tool events for voice
				if (isVoice && streamController && pendingText) {
					await handleVoiceOutput(streamController, pendingText);
					pendingText = '';
				}

				streamJSONEvent(streamController, chunk.type, chunk);
			}
		}

		// Handle any remaining pending text for voice
		if (isVoice && streamController && pendingText) {
			await handleVoiceOutput(streamController, pendingText);
		}

		return { content: finalText };
	},
});

export const chatWorkflow = createWorkflow({
	id: 'chatWorkflow',
	description:
		'Chat workflow that replicates the old /chat/execute-function endpoint behaviour with optional streaming',
	inputSchema: ChatInputSchema,
	outputSchema: ChatOutputSchema,
})
	.then(fetchContext)
	.then(buildAgentContext)
	.then(emitMastraEvents)
	.then(callAgent)
	.commit();

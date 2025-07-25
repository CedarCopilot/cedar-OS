import { OpenAIVoice } from '@mastra/voice-openai';
import { Readable } from 'stream';
import type { Context } from 'hono';
import { env } from '../env';

// Initialize the voice provider
export const voice = new OpenAIVoice({
	speechModel: {
		apiKey: env.OPENAI_API_KEY!,
		name: 'tts-1',
	},
	listeningModel: {
		apiKey: env.OPENAI_API_KEY!,
		name: 'whisper-1',
	},
});

// Voice handler - for audio input/output
export async function handleVoiceMessage(c: Context) {
	try {
		// Parse multipart form data
		const formData = await c.req.formData();
		const audioFile = formData.get('audio') as File;
		const settingsStr = formData.get('settings') as string;

		if (!audioFile) {
			return c.json({ error: 'No audio file provided' }, 400);
		}

		const agent = c.get('mastra').getAgent('productRoadmapAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Parse voice settings
		const settings = settingsStr ? JSON.parse(settingsStr) : {};

		// Convert audio file to buffer
		const audioBuffer = await audioFile.arrayBuffer();
		const buffer = Buffer.from(audioBuffer);

		// Create a readable stream from the buffer
		const audioStream = Readable.from(buffer);

		// Transcribe audio using OpenAI Whisper
		const transcribedText = await voice.listen(audioStream, {
			filetype: 'webm', // The browser sends WebM format
		});

		console.log('Transcribed text:', transcribedText);

		// Process the text through the agent
		const messages = [{ role: 'user' as const, content: transcribedText }];

		const response = await agent.generate(messages, {
			temperature: 0.7,
			maxTokens: 500,
		});

		console.log('response', response.text);

		// Convert response to speech using OpenAI TTS
		const speechStream = await voice.speak(response.text, {
			voice: settings.voiceId || 'alloy', // Default to 'alloy' voice
			speed: settings.rate || 1.0,
		});

		// Convert stream to buffer for response
		const chunks: Buffer[] = [];
		for await (const chunk of speechStream) {
			chunks.push(Buffer.from(chunk));
		}
		const audioResponse = Buffer.concat(chunks);

		// Return JSON response with audio data, transcription, and text
		return c.json({
			transcription: transcribedText,
			text: response.text,
			usage: response.usage,
			audioData: audioResponse.toString('base64'),
			audioFormat: 'audio/mpeg',
		});
	} catch (error) {
		console.error('Voice error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Voice-to-text handler - returns text response instead of audio
export async function handleVoiceToText(c: Context) {
	try {
		// Parse multipart form data
		const formData = await c.req.formData();
		const audioFile = formData.get('audio') as File;

		if (!audioFile) {
			return c.json({ error: 'No audio file provided' }, 400);
		}

		const agent = c.get('mastra').getAgent('productRoadmapAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Convert audio file to buffer
		const audioBuffer = await audioFile.arrayBuffer();
		const buffer = Buffer.from(audioBuffer);

		// Create a readable stream from the buffer
		const audioStream = Readable.from(buffer);

		// Transcribe audio using OpenAI Whisper
		const transcribedText = await voice.listen(audioStream, {
			filetype: 'webm', // The browser sends WebM format
		});

		console.log('Transcribed text:', transcribedText);

		// Process the text through the agent
		const messages = [{ role: 'user' as const, content: transcribedText }];

		const response = await agent.generate(messages, {
			temperature: 0.7,
			maxTokens: 500,
		});

		console.log('response', response);

		// Return text response
		return c.json({
			transcription: transcribedText,
			text: response.text,
			usage: response.usage,
		});
	} catch (error) {
		console.error('Voice-to-text error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

// Voice execute handler - combines voice with execute-function logic
export async function handleVoiceExecute(c: Context) {
	try {
		// Parse multipart form data
		const formData = await c.req.formData();
		const audioFile = formData.get('audio') as File;
		const settingsStr = formData.get('settings') as string;
		const contextStr = formData.get('context') as string; // Get additional context

		if (!audioFile) {
			return c.json({ error: 'No audio file provided' }, 400);
		}

		const agent = c.get('mastra').getAgent('productRoadmapAgent');
		if (!agent) {
			return c.json({ error: 'Agent not found' }, 404);
		}

		// Parse voice settings
		const settings = settingsStr ? JSON.parse(settingsStr) : {};

		// Parse additional context if provided
		const additionalContext = contextStr ? JSON.parse(contextStr) : {};

		// Convert audio file to buffer
		const audioBuffer = await audioFile.arrayBuffer();
		const buffer = Buffer.from(audioBuffer);

		// Create a readable stream from the buffer
		const audioStream = Readable.from(buffer);

		// Transcribe audio using OpenAI Whisper
		const transcribedText = await voice.listen(audioStream, {
			filetype: 'webm', // The browser sends WebM format
		});

		console.log('Transcribed text:', transcribedText);

		// Build the full context similar to stringifyInputContext
		let fullPrompt = `User Text: ${transcribedText}\n\n`;

		// Add additional context if provided
		if (Object.keys(additionalContext).length > 0) {
			fullPrompt += `Additional Context: ${JSON.stringify(additionalContext, null, 2)}`;
		}

		// Enhanced system prompt to guide the agent to return structured actions
		const enhancedSystemPrompt = `You are a product roadmap assistant. When users ask you to modify the roadmap, you should return structured actions.

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

		// Process the text through the agent with structured output
		const messages = [
			{ role: 'system' as const, content: enhancedSystemPrompt },
			{ role: 'user' as const, content: fullPrompt }, // Use the full prompt with context
		];

		// Import the schema from the main index file
		const { z } = await import('zod');

		// Define the schemas inline (matching the execute-function schemas)
		const NodeSchema = z.object({
			id: z.string().optional(),
			data: z.object({
				title: z.string(),
				description: z.string(),
				status: z
					.enum(['planned', 'in-progress', 'completed', 'cancelled'])
					.optional(),
				nodeType: z.literal('feature').optional(),
				upvotes: z.number().optional(),
				comments: z.array(z.any()).optional(),
			}),
		});

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
			args: z.array(z.string()),
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

		const ExecuteFunctionResponseSchema = z.union([
			AddNodeActionSchema,
			RemoveNodeActionSchema,
			ChangeNodeActionSchema,
			MessageResponseSchema,
		]);

		const response = await agent.generate(messages, {
			temperature: settings.temperature || 0.7,
			maxTokens: 500,
			experimental_output: ExecuteFunctionResponseSchema,
		});

		console.log('response', response);

		// Extract the content for speech synthesis
		const textContent = response.object?.content || response.text || '';

		// Convert response to speech using OpenAI TTS
		const speechStream = await voice.speak(textContent, {
			voice: settings.voiceId || 'alloy', // Default to 'alloy' voice
			speed: settings.rate || 1.0,
		});

		// Convert stream to buffer for response
		const chunks: Buffer[] = [];
		for await (const chunk of speechStream) {
			chunks.push(Buffer.from(chunk));
		}
		const audioResponse = Buffer.concat(chunks);

		// Return JSON response with audio data, transcription, text, and structured object
		return c.json({
			transcription: transcribedText,
			text: textContent,
			object: response.object || {
				type: 'message',
				content: textContent,
				role: 'assistant',
			},
			usage: response.usage,
			audioData: audioResponse.toString('base64'),
			audioFormat: 'audio/mpeg',
		});
	} catch (error) {
		console.error('Voice execute error:', error);
		return c.json(
			{
				error: error instanceof Error ? error.message : 'Internal server error',
			},
			500
		);
	}
}

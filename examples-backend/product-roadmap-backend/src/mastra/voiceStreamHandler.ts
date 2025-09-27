import { Context } from 'hono';
import { Readable } from 'stream';
import { createSSEStream, streamJSONEvent } from '../utils/streamUtils';
import { chatWorkflow } from './workflows/chatWorkflow';
import { OpenAIVoice } from '@mastra/voice-openai';

export const voiceProvider = new OpenAIVoice({
	speechModel: { apiKey: process.env.OPENAI_API_KEY!, name: 'tts-1' },
	listeningModel: {
		apiKey: process.env.OPENAI_API_KEY!,
		name: 'whisper-1',
	},
});

/**
 * Create workflow input data from the voice streaming parameters
 */
function createWorkflowInput(
	baseInput: {
		prompt: string;
		additionalContext?: unknown;
		temperature?: number;
		maxTokens?: number;
		systemPrompt?: string;
		resourceId?: string;
		threadId?: string;
	},
	controller: ReadableStreamDefaultController<Uint8Array>,
	isStreaming: boolean = true,
	isVoice: boolean = false
) {
	return {
		...baseInput,
		streamController: isStreaming ? controller : undefined,
		isVoice,
	};
}

/**
 * Handle voice streaming request
 * Transcribes audio, then streams the LLM response back
 */
export async function handleVoiceStream(c: Context) {
	try {
		const form = await c.req.formData();
		const audioFile = form.get('audio') as File;
		const additionalContext = form.get('context') as string | null;
		const settings = form.get('settings') as string | null;

		let parsedAdditionalContext: unknown = undefined;
		let parsedSettings: {
			temperature?: number;
			maxTokens?: number;
			systemPrompt?: string;
			resourceId?: string;
			threadId?: string;
		} = {};

		// Parse additional context if provided
		if (additionalContext) {
			try {
				parsedAdditionalContext = JSON.parse(additionalContext);
			} catch {
				// leave undefined if not valid JSON
			}
		}

		// Parse voice settings if provided
		if (settings) {
			try {
				parsedSettings = JSON.parse(settings);
			} catch {
				// use empty object if not valid JSON
			}
		}

		if (!audioFile) {
			return c.json({ error: 'audio required' }, 400);
		}

		// Convert audio file to buffer and then to stream
		const buf = Buffer.from(await audioFile.arrayBuffer());

		// Transcribe the audio
		const transcription = await voiceProvider.listen(Readable.from(buf), {
			filetype: 'webm',
		});

		// Create SSE stream for real-time response
		return createSSEStream(async (controller) => {
			// Emit the transcription in the format that Cedar OS voice streaming expects
			console.log('Emitting voice transcription:', transcription);
			streamJSONEvent(controller, 'transcription', {
				type: 'transcription',
				transcription: transcription,
			});

			// Start the chat workflow with the transcription
			const run = await chatWorkflow.createRunAsync();
			const result = await run.start({
				inputData: createWorkflowInput(
					{
						prompt: transcription,
						additionalContext: parsedAdditionalContext ?? additionalContext,
						temperature: parsedSettings.temperature,
						maxTokens: parsedSettings.maxTokens,
						systemPrompt: parsedSettings.systemPrompt,
						resourceId: parsedSettings.resourceId,
						threadId: parsedSettings.threadId,
					},
					controller,
					true,
					true
				),
			});

			if (result.status !== 'success') {
				console.error('Workflow failed:', result.status);
				streamJSONEvent(controller, 'error', {
					type: 'error',
					error: `Workflow failed: ${result.status}`,
				});
			}

			// Emit completion event
			console.log('Voice stream completed successfully');
			streamJSONEvent(controller, 'done', {
				type: 'done',
				completedItems: [],
			});

			// The workflow handles streaming the response through the controller
			// No need to manually close here as the workflow will handle completion
		});
	} catch (error) {
		console.error('Voice stream error:', error);
		return c.json(
			{ error: error instanceof Error ? error.message : 'Internal error' },
			500
		);
	}
}

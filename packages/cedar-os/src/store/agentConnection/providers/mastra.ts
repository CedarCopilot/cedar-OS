import type {
	InferProviderConfig,
	MastraParams,
	ProviderImplementation,
	StructuredParams,
	VoiceStreamHandler,
} from '@/store/agentConnection/AgentConnectionTypes';
import { handleEventStream } from '@/store/agentConnection/agentUtils';

type MastraConfig = InferProviderConfig<'mastra'>;

/**
 * Handle voice streaming response from Mastra voice endpoint
 */
async function handleVoiceEventStream(
	response: Response,
	handler: VoiceStreamHandler
): Promise<void> {
	const reader = response.body?.getReader();
	if (!reader) {
		throw new Error('Response body is not readable');
	}

	const decoder = new TextDecoder();
	let buffer = ''; // Buffer to accumulate incomplete chunks

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });
			buffer += chunk;

			// Process complete lines
			const lines = buffer.split('\n');
			// Keep the last potentially incomplete line in the buffer
			buffer = lines.pop() || '';

			for (const line of lines) {
				const trimmedLine = line.trim();
				if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

				const data = trimmedLine.slice(6); // Remove 'data: ' prefix

				try {
					const parsed = JSON.parse(data);

					// Handle different event types
					if (parsed.type === 'transcription' && parsed.transcription) {
						handler({
							type: 'transcription',
							transcription: parsed.transcription,
						});
					} else if (parsed.type === 'audio' && parsed.audioData) {
						handler({
							type: 'audio',
							audioData: parsed.audioData,
							audioFormat: parsed.audioFormat,
							content: parsed.content,
						});
					} else if (parsed.type === 'chunk' && parsed.content) {
						handler({
							type: 'chunk',
							content: parsed.content,
						});
					} else if (parsed.type === 'object' && parsed.object) {
						handler({
							type: 'object',
							object: parsed.object,
						});
					} else if (parsed.type === 'error') {
						handler({
							type: 'error',
							error: new Error(parsed.error || 'Stream error'),
						});
					} else if (parsed.type === 'done') {
						handler({
							type: 'done',
							completedItems: parsed.completedItems || [],
						});
					}
				} catch (parseError) {
					console.warn('Failed to parse voice stream event:', parseError);
					console.warn('Problematic data length:', data.length);
				}
			}
		}

		// Process any remaining data in the buffer
		if (buffer.trim()) {
			const trimmedLine = buffer.trim();
			if (trimmedLine.startsWith('data: ')) {
				const data = trimmedLine.slice(6);
				try {
					const parsed = JSON.parse(data);
					// Handle the final event (same logic as above)
					if (parsed.type === 'transcription' && parsed.transcription) {
						handler({
							type: 'transcription',
							transcription: parsed.transcription,
						});
					} else if (parsed.type === 'audio' && parsed.audioData) {
						handler({
							type: 'audio',
							audioData: parsed.audioData,
							audioFormat: parsed.audioFormat,
							content: parsed.content,
						});
					} else if (parsed.type === 'chunk' && parsed.content) {
						handler({
							type: 'chunk',
							content: parsed.content,
						});
					} else if (parsed.type === 'object' && parsed.object) {
						handler({
							type: 'object',
							object: parsed.object,
						});
					} else if (parsed.type === 'error') {
						handler({
							type: 'error',
							error: new Error(parsed.error || 'Stream error'),
						});
					} else if (parsed.type === 'done') {
						handler({
							type: 'done',
							completedItems: parsed.completedItems || [],
						});
					}
				} catch (parseError) {
					console.warn('Failed to parse final voice stream event:', parseError);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
}

export const mastraProvider: ProviderImplementation<
	MastraParams,
	MastraConfig
> = {
	callLLM: async (params, config) => {
		const { route, prompt, systemPrompt, temperature, maxTokens, ...rest } =
			params;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		const response = await fetch(`${config.baseURL}${route}`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt,
				systemPrompt,
				temperature,
				maxTokens,
				...rest,
			}),
		});

		return mastraProvider.handleResponse(response);
	},

	callLLMStructured: async (params, config) => {
		const {
			route,
			prompt,
			systemPrompt,
			temperature,
			maxTokens,
			schema,
			schemaName,
			schemaDescription,
			...rest
		} = params as MastraParams & StructuredParams;

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		const body: Record<string, unknown> = {
			prompt,
			systemPrompt,
			temperature,
			maxTokens,
			...rest,
		};

		// Add schema information for structured output
		if (schema) {
			body.schema = schema;
			body.schemaName = schemaName;
			body.schemaDescription = schemaDescription;
		}

		const response = await fetch(`${config.baseURL}${route}`, {
			method: 'POST',
			headers,
			body: JSON.stringify(body),
		});

		return mastraProvider.handleResponse(response);
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const { route, prompt, systemPrompt, temperature, maxTokens, ...rest } =
					params;

				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};

				// Only add Authorization header if apiKey is provided
				if (config.apiKey) {
					headers.Authorization = `Bearer ${config.apiKey}`;
				}

				const response = await fetch(`${config.baseURL}${route}/stream`, {
					method: 'POST',
					headers,
					body: JSON.stringify({
						prompt,
						systemPrompt,
						temperature,
						maxTokens,
						...rest,
					}),
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				await handleEventStream(response, handler);
			} catch (error) {
				if (error instanceof Error && error.name !== 'AbortError') {
					handler({ type: 'error', error });
				}
			}
		})();

		return {
			abort: () => abortController.abort(),
			completion,
		};
	},

	voiceLLM: async (params, config) => {
		const { audioData, voiceSettings, context, ...rest } = params;

		const headers: Record<string, string> = {};

		// Only add Authorization header if apiKey is provided
		if (config.apiKey) {
			headers.Authorization = `Bearer ${config.apiKey}`;
		}

		// Use the endpoint from voiceSettings if provided, otherwise use voiceRoute from config
		const voiceEndpoint =
			voiceSettings.endpoint || config.voiceRoute || '/voice';
		const fullUrl = voiceEndpoint.startsWith('http')
			? voiceEndpoint
			: `${config.baseURL}${voiceEndpoint}`;

		const formData = new FormData();
		formData.append('audio', audioData, 'recording.webm');
		formData.append('settings', JSON.stringify(voiceSettings));
		if (context) {
			formData.append('context', JSON.stringify(context));
		}

		for (const [key, value] of Object.entries(rest)) {
			if (value === undefined || value === null) continue;
			if (typeof value === 'object') {
				formData.append(key, JSON.stringify(value));
			} else {
				formData.append(key, String(value));
			}
		}

		const response = await fetch(fullUrl, {
			method: 'POST',
			headers,
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Voice endpoint returned ${response.status}`);
		}

		// Handle different response types
		const contentType = response.headers.get('content-type');

		if (contentType?.includes('audio')) {
			// Audio response - return as base64
			const audioBuffer = await response.arrayBuffer();
			const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
			return {
				content: '',
				audioData: base64,
				audioFormat: contentType,
			};
		} else if (contentType?.includes('application/json')) {
			// JSON response
			const data = await response.json();
			return {
				content: data.text || data.content || '',
				transcription: data.transcription,
				audioData: data.audioData,
				audioUrl: data.audioUrl,
				audioFormat: data.audioFormat,
				usage: data.usage,
				metadata: data.metadata,
				object: data.object,
			};
		} else {
			// Plain text response
			const text = await response.text();
			return {
				content: text,
			};
		}
	},

	voiceStreamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const { audioData, voiceSettings, context, ...rest } = params;

				const headers: Record<string, string> = {};

				// Only add Authorization header if apiKey is provided
				if (config.apiKey) {
					headers.Authorization = `Bearer ${config.apiKey}`;
				}

				// Use the endpoint from voiceSettings if provided, otherwise use voiceRoute from config
				const voiceEndpoint =
					voiceSettings.endpoint || config.voiceRoute || '/voice';
				const fullUrl = voiceEndpoint.startsWith('http')
					? voiceEndpoint
					: `${config.baseURL}${voiceEndpoint}`;

				// Add /stream suffix for streaming endpoint
				const streamUrl = fullUrl.endsWith('/stream')
					? fullUrl
					: `${fullUrl}/stream`;

				const formData = new FormData();
				formData.append('audio', audioData, 'recording.webm');
				formData.append('settings', JSON.stringify(voiceSettings));
				if (context) {
					formData.append('context', JSON.stringify(context));
				}

				for (const [key, value] of Object.entries(rest)) {
					if (value === undefined || value === null) continue;
					if (typeof value === 'object') {
						formData.append(key, JSON.stringify(value));
					} else {
						formData.append(key, String(value));
					}
				}

				const response = await fetch(streamUrl, {
					method: 'POST',
					headers,
					body: formData,
					signal: abortController.signal,
				});

				if (!response.ok) {
					throw new Error(`Voice stream endpoint returned ${response.status}`);
				}

				// Handle streaming response
				await handleVoiceEventStream(response, handler);
			} catch (error) {
				if (error instanceof Error && error.name !== 'AbortError') {
					handler({ type: 'error', error });
				}
			}
		})();

		return {
			abort: () => abortController.abort(),
			completion,
		};
	},

	handleResponse: async (response) => {
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Mastra returns structured output in the 'object' field when using JSON Schema
		return {
			content: data.text || data.content || '',
			usage: data.usage,
			metadata: {
				model: data.model,
				id: data.id,
			},
			object: data.object, // Include the structured output if present
		};
	},
};

/**
 * All event types emitted by a Mastra agent stream.
 */
export type MastraStreamedResponseType =
	| 'start'
	| 'step-start'
	| 'tool-call'
	| 'tool-result'
	| 'step-finish'
	| 'tool-output'
	| 'step-result'
	| 'step-output'
	| 'finish';

/**
 * Strongly-typed wrapper around a Mastra structured response message.
 * Extends Cedar's `CustomMessage` so it is compatible with the message system.
 */
export type MastraStreamedResponse<
	T extends MastraStreamedResponseType = MastraStreamedResponseType
> = {
	type: T;
	runId: string;
	from: string;
	// TODO: update once Mastra releases new types
	payload: Record<string, unknown>;
};

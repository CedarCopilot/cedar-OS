import type {
	MastraParams,
	ProviderImplementation,
	InferProviderConfig,
	StructuredParams,
} from '../types';
import { handleEventStream, createDefaultStreamHandlers } from '../agentUtils';

type MastraConfig = InferProviderConfig<'mastra'>;

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

				const streamHandlers = createDefaultStreamHandlers(handler, 'Mastra');

				await handleEventStream(response, streamHandlers);
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

	handleStreamResponse: (chunk) => {
		return { type: 'chunk', content: chunk };
	},
};

// Helper function to initialise a chat session with Mastra
export const initialiseChat = async (
	config: MastraConfig,
	params?: {
		conversationId?: string;
		metadata?: Record<string, unknown>;
	}
): Promise<{ conversationId: string; metadata?: Record<string, unknown> }> => {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (config.apiKey) {
		headers.Authorization = `Bearer ${config.apiKey}`;
	}

	// Isabelle check how to initialise
	const chatPath = config.chatPath || '/chat';
	const response = await fetch(`${config.baseURL}${chatPath}/init`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			conversationId: params?.conversationId,
			metadata: params?.metadata,
		}),
	});

	if (!response.ok) {
		throw new Error(`Failed to initialise chat: ${response.status}`);
	}

	return response.json();
};

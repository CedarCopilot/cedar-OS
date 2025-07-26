import type {
	MastraParams,
	ProviderImplementation,
	InferProviderConfig,
} from '../types';
import { handleEventStream } from '../agentUtils';

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

				await handleEventStream(response, {
					onMessage: (chunk) => {
						handler({ type: 'chunk', content: chunk });
					},
					onDone: () => {
						handler({ type: 'done' });
					},
				});
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

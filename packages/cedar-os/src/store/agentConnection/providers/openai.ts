import type {
	OpenAIParams,
	ProviderImplementation,
	InferProviderConfig,
	StructuredParams,
} from '../types';
import { handleEventStream } from '../agentUtils';

type OpenAIConfig = InferProviderConfig<'openai'>;

export const openAIProvider: ProviderImplementation<
	OpenAIParams,
	OpenAIConfig
> = {
	callLLM: async (params, config) => {
		const { prompt, model, systemPrompt, temperature, maxTokens, ...rest } =
			params;

		const messages = [
			...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
			{ role: 'user', content: prompt },
		];

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages,
				temperature,
				max_tokens: maxTokens,
				...rest,
			}),
		});

		return openAIProvider.handleResponse(response);
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const { prompt, model, systemPrompt, temperature, maxTokens, ...rest } =
					params;

				const messages = [
					...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
					{ role: 'user', content: prompt },
				];

				const response = await fetch(
					'https://api.openai.com/v1/chat/completions',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${config.apiKey}`,
						},
						body: JSON.stringify({
							model,
							messages,
							temperature,
							max_tokens: maxTokens,
							stream: true,
							...rest,
						}),
						signal: abortController.signal,
					}
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				await handleEventStream(response, {
					onMessage: (chunk) => {
						// Parse OpenAI's SSE format
						try {
							const data = JSON.parse(chunk);
							const content = data.choices?.[0]?.delta?.content || '';
							if (content) {
								handler({ type: 'chunk', content });
							}
						} catch {
							// Skip parsing errors
						}
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
		return {
			content: data.choices?.[0]?.message?.content || '',
			usage: data.usage
				? {
						promptTokens: data.usage.prompt_tokens,
						completionTokens: data.usage.completion_tokens,
						totalTokens: data.usage.total_tokens,
				  }
				: undefined,
			metadata: {
				model: data.model,
				id: data.id,
			},
		};
	},

	handleStreamResponse: (chunk) => {
		try {
			const data = JSON.parse(chunk);
			const content = data.choices?.[0]?.delta?.content || '';
			return { type: 'chunk', content };
		} catch (error) {
			return { type: 'error', error: error as Error };
		}
	},

	callLLMStructured: async (params, config) => {
		const {
			prompt,
			model,
			systemPrompt,
			temperature,
			maxTokens,
			schema,
			schemaName,
			schemaDescription,
			...rest
		} = params as OpenAIParams & StructuredParams;

		const messages = [
			...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
			{ role: 'user', content: prompt },
		];

		const body: Record<string, unknown> = {
			model,
			messages,
			temperature,
			max_tokens: maxTokens,
			...rest,
		};

		// Add response_format for structured output if schema is provided
		if (schema) {
			body.response_format = {
				type: 'json_schema',
				json_schema: {
					name: schemaName || 'response',
					description: schemaDescription,
					schema: schema,
					strict: true,
				},
			};
		}

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${config.apiKey}`,
			},
			body: JSON.stringify(body),
		});

		const result = await openAIProvider.handleResponse(response);

		// If we have structured output, parse it and add to object field
		if (schema && result.content) {
			try {
				result.object = JSON.parse(result.content);
			} catch {
				// If parsing fails, leave object undefined
			}
		}

		return result;
	},
};

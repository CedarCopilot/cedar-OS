import type {
	AISDKParams,
	InferProviderConfig,
	AISDKStructuredParams,
	LLMResponse,
	StreamHandler,
	StreamResponse,
	StreamEvent,
} from '../types';
import {
	generateText,
	streamText,
	type LanguageModel,
	generateObject,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createMistral } from '@ai-sdk/mistral';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';

type AISDKConfig = InferProviderConfig<'ai-sdk'>;

// Specialized provider implementation for AI SDK
export interface AISDKProviderImplementation {
	callLLM: (params: AISDKParams, config: AISDKConfig) => Promise<LLMResponse>;
	callLLMStructured: (
		params: AISDKStructuredParams,
		config: AISDKConfig
	) => Promise<LLMResponse>;
	streamLLM: (
		params: AISDKParams,
		config: AISDKConfig,
		handler: StreamHandler
	) => StreamResponse;
	handleResponse: (response: Response) => Promise<LLMResponse>;
	handleStreamResponse: (chunk: string) => StreamEvent;
}

// Direct mapping of provider names to their implementations
const providerImplementations = {
	openai: (apiKey: string) => createOpenAI({ apiKey }),
	anthropic: (apiKey: string) => createAnthropic({ apiKey }),
	google: (apiKey: string) => createGoogleGenerativeAI({ apiKey }),
	mistral: (apiKey: string) => createMistral({ apiKey }),
	groq: (apiKey: string) => createGroq({ apiKey }),
} as const;

// Helper function to parse model string and get provider/model
function parseModelString(modelString: string) {
	const [provider, ...modelParts] = modelString.split('/');
	const model = modelParts.join('/'); // Handle cases like "openai/gpt-4o-mini"

	if (!provider || !model) {
		throw new Error(
			`Invalid model format: ${modelString}. Expected format: "provider/model" (e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet")`
		);
	}

	return { provider, model };
}

export const aiSDKProvider: AISDKProviderImplementation = {
	callLLM: async (params, config) => {
		const {
			model: modelString,
			prompt,
			systemPrompt,
			temperature,
			...rest
		} = params;

		// Parse the model string to get provider and model
		const { provider: providerName, model } = parseModelString(modelString);

		// Get the provider config
		const providerConfig =
			config.providers[providerName as keyof typeof config.providers];
		if (!providerConfig) {
			throw new Error(
				`Provider ${providerName} not configured. Available providers: ${Object.keys(
					config.providers
				).join(', ')}`
			);
		}

		// Get the provider implementation
		const getProvider =
			providerImplementations[
				providerName as keyof typeof providerImplementations
			];
		if (!getProvider) {
			throw new Error(
				`Provider ${providerName} not supported. Supported providers: ${Object.keys(
					providerImplementations
				).join(', ')}`
			);
		}

		const provider = getProvider(providerConfig.apiKey);

		// For Google, we need to handle the model name differently
		const modelName =
			providerName === 'google'
				? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
				: model;

		// Get the model instance - cast to LanguageModel (V2)
		const modelInstance = provider(modelName) as LanguageModel;

		const result = await generateText({
			model: modelInstance,
			prompt,
			system: systemPrompt,
			temperature,
			maxRetries: 3,
			...rest,
		});

		return {
			content: result.text,
			usage: result.usage
				? {
						promptTokens:
							(result.usage as { promptTokens?: number }).promptTokens || 0,
						completionTokens:
							(result.usage as { completionTokens?: number })
								.completionTokens || 0,
						totalTokens: result.usage.totalTokens || 0,
				  }
				: undefined,
			metadata: {
				model: modelString,
				finishReason: result.finishReason,
			},
		};
	},

	callLLMStructured: async (params, config) => {
		const {
			model: modelString,
			prompt,
			systemPrompt,
			temperature,
			schema, // This is now statically typed as z.ZodType<unknown>
			schemaName,
			schemaDescription,
			...rest
		} = params;

		// Parse the model string to get provider and model
		const { provider: providerName, model } = parseModelString(modelString);

		// Get the provider config
		const providerConfig =
			config.providers[providerName as keyof typeof config.providers];
		if (!providerConfig) {
			throw new Error(
				`Provider ${providerName} not configured. Available providers: ${Object.keys(
					config.providers
				).join(', ')}`
			);
		}

		// Get the provider implementation
		const getProvider =
			providerImplementations[
				providerName as keyof typeof providerImplementations
			];
		if (!getProvider) {
			throw new Error(
				`Provider ${providerName} not supported. Supported providers: ${Object.keys(
					providerImplementations
				).join(', ')}`
			);
		}

		const provider = getProvider(providerConfig.apiKey);

		// For Google, we need to handle the model name differently
		const modelName =
			providerName === 'google'
				? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
				: model;

		// Get the model instance - cast to LanguageModel (V2)
		const modelInstance = provider(modelName) as LanguageModel;

		// Use generateObject with the Zod schema (no runtime validation needed, it's statically typed)
		const result = await generateObject({
			model: modelInstance,
			prompt,
			system: systemPrompt,
			temperature,
			schema, // Already typed as z.ZodType<unknown>
			...(schemaName ? { schemaName } : {}),
			...(schemaDescription ? { schemaDescription } : {}),
			maxRetries: 3,
			...rest,
		});

		return {
			content: JSON.stringify(result.object),
			object: result.object,
			usage: result.usage
				? {
						promptTokens:
							(result.usage as { promptTokens?: number }).promptTokens || 0,
						completionTokens:
							(result.usage as { completionTokens?: number })
								.completionTokens || 0,
						totalTokens: result.usage.totalTokens || 0,
				  }
				: undefined,
			metadata: {
				model: modelString,
				finishReason: result.finishReason,
			},
		};
	},

	streamLLM: (params, config, handler) => {
		const abortController = new AbortController();

		const completion = (async () => {
			try {
				const {
					model: modelString,
					prompt,
					systemPrompt,
					temperature,
					...rest
				} = params;

				// Parse the model string to get provider and model
				const { provider: providerName, model } = parseModelString(modelString);

				// Get the provider config
				const providerConfig =
					config.providers[providerName as keyof typeof config.providers];
				if (!providerConfig) {
					throw new Error(
						`Provider ${providerName} not configured. Available providers: ${Object.keys(
							config.providers
						).join(', ')}`
					);
				}

				// Get the provider implementation
				const getProvider =
					providerImplementations[
						providerName as keyof typeof providerImplementations
					];
				if (!getProvider) {
					throw new Error(
						`Provider ${providerName} not supported. Supported providers: ${Object.keys(
							providerImplementations
						).join(', ')}`
					);
				}

				const provider = getProvider(providerConfig.apiKey);

				// For Google, we need to handle the model name differently
				const modelName =
					providerName === 'google'
						? model.replace('gemini-', '') // Google SDK expects model without 'gemini-' prefix
						: model;

				// Get the model instance - cast to LanguageModel (V2)
				const modelInstance = provider(modelName) as LanguageModel;

				const result = await streamText({
					model: modelInstance,
					prompt,
					system: systemPrompt,
					temperature,
					maxRetries: 3,
					abortSignal: abortController.signal,
					...rest,
				});

				for await (const chunk of result.textStream) {
					handler({ type: 'chunk', content: chunk });
				}

				handler({ type: 'done' });
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
		// AI SDK handles responses internally, this is for custom implementations
		const data = await response.json();
		return {
			content: data.text || '',
			usage: data.usage,
			metadata: data.metadata,
		};
	},

	handleStreamResponse: (chunk) => {
		// AI SDK handles streaming internally
		return { type: 'chunk', content: chunk };
	},
};

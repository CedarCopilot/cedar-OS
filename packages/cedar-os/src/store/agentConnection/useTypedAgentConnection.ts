import { useCedarStore } from '@/store/CedarStore';
import type {
	ProviderConfig,
	OpenAIParams,
	AnthropicParams,
	MastraParams,
	AISDKParams,
	CustomParams,
	LLMResponse,
	StreamHandler,
	StreamResponse,
} from './types';

// Helper to get the right params type based on provider
type GetParamsForProvider<T extends ProviderConfig['provider']> =
	T extends 'openai'
		? OpenAIParams
		: T extends 'anthropic'
		? AnthropicParams
		: T extends 'mastra'
		? MastraParams
		: T extends 'ai-sdk'
		? AISDKParams
		: T extends 'custom'
		? CustomParams
		: never;

// Typed connection interface
interface TypedAgentConnection<T extends ProviderConfig['provider']> {
	callLLM: (params: GetParamsForProvider<T>) => Promise<LLMResponse>;
	streamLLM: (
		params: GetParamsForProvider<T>,
		handler: StreamHandler
	) => StreamResponse;
	isConnected: boolean;
	isStreaming: boolean;
}

/**
 * Hook that provides properly typed agent connection methods based on the provider type
 *
 * @example
 * ```typescript
 * // With OpenAI provider
 * const { callLLM } = useTypedAgentConnection('openai');
 * // TypeScript knows that callLLM requires { prompt, model, ... }
 *
 * // With Mastra provider
 * const { callLLM } = useTypedAgentConnection('mastra');
 * // TypeScript knows that callLLM requires { prompt, route, ... }
 * ```
 */
export function useTypedAgentConnection<T extends ProviderConfig['provider']>(
	providerType: T
): TypedAgentConnection<T> {
	const store = useCedarStore();

	// Verify the provider matches
	const currentProvider = store.providerConfig?.provider;
	if (currentProvider !== providerType) {
		console.warn(
			`Provider mismatch: expected ${providerType}, but current provider is ${currentProvider}`
		);
	}

	return {
		callLLM: store.callLLM as (
			params: GetParamsForProvider<T>
		) => Promise<LLMResponse>,
		streamLLM: store.streamLLM as (
			params: GetParamsForProvider<T>,
			handler: StreamHandler
		) => StreamResponse,
		isConnected: store.isConnected,
		isStreaming: store.isStreaming,
	};
}

/**
 * Hook that infers the provider type from the current configuration
 *
 * @example
 * ```typescript
 * const connection = useAgentConnection();
 * if (connection.provider === 'openai') {
 *   // TypeScript narrows the type
 *   connection.callLLM({ prompt: '...', model: 'gpt-4' });
 * }
 * ```
 */
export function useAgentConnection() {
	const store = useCedarStore();
	const provider = store.providerConfig?.provider;

	if (!provider) {
		throw new Error('No provider configured');
	}

	return {
		provider,
		...useTypedAgentConnection(provider),
	};
}

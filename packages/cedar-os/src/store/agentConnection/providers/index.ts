import { openAIProvider } from '@/store/agentConnection/providers/openai';
import { mastraProvider } from '@/store/agentConnection/providers/mastra';
import { aiSDKProvider } from '@/store/agentConnection/providers/ai-sdk';
import { customProvider } from '@/store/agentConnection/providers/custom';
import type { ProviderConfig } from '@/store/agentConnection/AgentConnectionTypes';

// Provider registry - direct mapping of provider types to implementations
export const providerRegistry = {
	openai: openAIProvider,
	anthropic: openAIProvider, // Anthropic can use OpenAI-compatible endpoints
	mastra: mastraProvider,
	'ai-sdk': aiSDKProvider,
	custom: customProvider, // Custom providers use their own implementation
} as const;

// Type helper to get the correct provider implementation
export type ProviderRegistry = typeof providerRegistry;

// Get provider implementation based on config
export function getProviderImplementation<T extends ProviderConfig>(
	config: T
): ProviderRegistry[T['provider']] {
	return providerRegistry[config.provider] as ProviderRegistry[T['provider']];
}

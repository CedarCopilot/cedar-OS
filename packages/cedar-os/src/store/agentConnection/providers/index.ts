import { openAIProvider } from './openai';
import { mastraProvider } from './mastra';
import { aiSDKProvider } from './ai-sdk';
import type { ProviderConfig } from '../types';

// Provider registry - direct mapping of provider types to implementations
export const providerRegistry = {
	openai: openAIProvider,
	anthropic: openAIProvider, // Anthropic can use OpenAI-compatible endpoints
	mastra: mastraProvider,
	'ai-sdk': aiSDKProvider,
	custom: openAIProvider, // Custom providers default to OpenAI format
} as const;

// Type helper to get the correct provider implementation
export type ProviderRegistry = typeof providerRegistry;

// Get provider implementation based on config
export function getProviderImplementation<T extends ProviderConfig>(
	config: T
): ProviderRegistry[T['provider']] {
	return providerRegistry[config.provider] as ProviderRegistry[T['provider']];
}

// Re-export Mastra-specific utilities
export { initialiseChat } from './mastra';

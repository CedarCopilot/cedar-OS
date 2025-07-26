# Cedar Agent Connection Architecture

## Overview

Cedar is a package designed to help developers build AI-native frontends (similar to Cursor). The `agentConnectionSlice` is a critical component that provides a flexible, type-safe interface for connecting to various LLM providers and agents.

## Core Concept

The agent connection layer abstracts away the complexity of different LLM providers while maintaining full flexibility and type safety. Whether developers use Vercel's AI SDK, Mastra, OpenAI directly, or custom implementations, Cedar provides a unified interface with provider-specific typing.

## Key Requirements

1. **Provider Flexibility**: Support multiple LLM providers (OpenAI, Anthropic, Vercel AI SDK, Mastra, custom)
2. **Type Safety**: Provider-specific parameters should be fully typed
3. **Streaming Support**: First-class support for streaming responses
4. **Configuration**: Easy setup with minimal boilerplate
5. **Extensibility**: Allow custom providers and configurations

## Architecture Design

### 1. Provider Template System

The `agentConnectionSlice` will contain template functions that all providers must implement:

```typescript
interface ProviderTemplate {
	callLLM: (params: ProviderSpecificParams) => Promise<LLMResponse>;
	streamLLM: (
		params: ProviderSpecificParams,
		handler: StreamHandler
	) => StreamResponse;
	handleResponse: (response: any) => LLMResponse;
	handleStreamResponse: (chunk: any) => StreamEvent;
}
```

### 2. Provider Registry

A typed object map that associates provider types with their implementations:

```typescript
const providerRegistry = {
  openai: {
    callLLM: openAICallLLM,
    streamLLM: openAIStreamLLM,
    handleResponse: openAIHandleResponse,
    handleStreamResponse: openAIHandleStreamResponse,
  },
  anthropic: { ... },
  mastra: { ... },
  'ai-sdk': { ... },
  custom: { ... }
} as const
```

### 3. Discriminated Union Configuration

The `CedarCopilot` component will accept a discriminated union for provider configuration:

```typescript
// Provider to API key mapping for AI SDK
type AISDKProviderConfig = {
	openai?: {
		apiKey: string;
	};
	anthropic?: {
		apiKey: string;
	};
	google?: {
		apiKey: string;
	};
	mistral?: {
		apiKey: string;
	};
};

type ProviderConfig =
	| { provider: 'openai'; apiKey: string }
	| { provider: 'anthropic'; apiKey: string }
	| { provider: 'mastra'; apiKey?: string; baseURL: string }
	| { provider: 'ai-sdk'; providers: AISDKProviderConfig }
	| { provider: 'custom'; config: CustomProviderConfig };
```

### 4. Type-Safe Function Signatures

Based on the initialized provider, the `callLLM` and `streamLLM` functions will have correctly typed parameters:

```typescript
// Provider-specific parameter types
type OpenAIParams = {
	prompt: string;
	model: string;
	temperature?: number;
	maxTokens?: number;
};

type MastraParams = {
	prompt: string;
	model: string;
	route: string; // Route is a parameter, not config
	temperature?: number;
	maxTokens?: number;
};

type AISDKParams = {
	prompt: string;
	model: string; // Format: "provider/model" e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet"
	temperature?: number;
	maxTokens?: number;
};

// Usage examples:
// If provider is 'mastra', callLLM requires 'route' parameter
callLLM({ prompt: 'Hello', model: 'gpt-4', route: '/chat/completions' });

// If provider is 'openai', no route required
callLLM({ prompt: 'Hello', model: 'gpt-4' });

// If provider is 'ai-sdk', it uses the model string to determine provider and model
callLLM({ prompt: 'Hello', model: 'openai/gpt-4o' }); // Uses providers.openai config
callLLM({ prompt: 'Hello', model: 'anthropic/claude-3-sonnet' }); // Uses providers.anthropic config
```

## Implementation Strategy

### Phase 1: Core Types and Interfaces

- Define provider-specific parameter types
- Create discriminated union for provider configs
- Define response types and stream events

### Phase 2: Provider Implementations

- Implement provider-specific functions for each supported provider
- Create the provider registry with type mappings
- Ensure proper error handling and response normalization

### Phase 3: Store Integration

- Update `agentConnectionSlice` to use the provider registry
- Implement dynamic function binding based on provider type
- Add proper TypeScript generics for type inference

### Phase 4: Component Integration

- Update `CedarCopilot` to accept discriminated union props
- Ensure provider config flows through to the store
- Add validation and error boundaries

## Type Safety Mechanism

To achieve proper typing based on the initialized provider:

1. **Generic Store Slice**: The store slice will be generic over the provider type
2. **Conditional Types**: Use TypeScript conditional types to map provider to params
3. **Type Guards**: Runtime type guards to ensure correct provider usage
4. **Inference**: Leverage TypeScript's type inference from the discriminated union

```typescript
type InferProviderParams<T extends ProviderConfig> = T extends {
	provider: 'mastra';
}
	? MastraParams
	: T extends { provider: 'openai' }
	? OpenAIParams
	: T extends { provider: 'ai-sdk' }
	? AISDKParams
	: T extends { provider: 'anthropic' }
	? AnthropicParams
	: never;
```

## Implementation Pseudocode

### AI SDK Provider Implementation

```typescript
// AI SDK provider with static imports
import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

const providerImplementations = {
	openai: (apiKey: string) => createOpenAI({ apiKey }),
	anthropic: (apiKey: string) => createAnthropic({ apiKey }),
	// ... other providers
};

// Helper function to parse model string
function parseModelString(modelString: string) {
	const [provider, ...modelParts] = modelString.split('/');
	const model = modelParts.join('/');

	if (!provider || !model) {
		throw new Error(`Invalid model format: ${modelString}`);
	}

	return { provider, model };
}

const aiSDKProvider: ProviderTemplate<AISDKParams> = {
	callLLM: async (params, config) => {
		const { model: modelString, prompt, ...options } = params;

		// Parse "openai/gpt-4o" -> { provider: "openai", model: "gpt-4o" }
		const { provider: providerName, model } = parseModelString(modelString);

		// Get the provider config
		const providerConfig = config.providers[providerName];
		if (!providerConfig) {
			throw new Error(`Provider ${providerName} not configured`);
		}

		// Get the provider implementation
		const getProvider = providerImplementations[providerName];
		if (!getProvider) {
			throw new Error(`Provider ${providerName} not supported`);
		}

		const provider = getProvider(providerConfig.apiKey);

		const result = await generateText({
			model: provider(model),
			prompt,
			...options,
		});

		return {
			content: result.text,
			usage: result.usage,
			metadata: { model: modelString, finishReason: result.finishReason },
		};
	},

	streamLLM: async (params, config, handler) => {
		// Similar implementation with streaming
	},
};
```

### Mastra Provider Implementation

```typescript
// Mastra provider takes route as a parameter
const mastraProvider: ProviderTemplate<MastraParams> = {
	callLLM: async (params, config) => {
		const { route, prompt, model, ...options } = params;

		const response = await fetch(`${config.baseURL}${route}`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${config.apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ prompt, model, ...options }),
		});

		return handleResponse(response);
	},

	streamLLM: async (params, config, handler) => {
		const { route, ...restParams } = params;
		// Stream implementation with route
	},
};
```

## Benefits

1. **Developer Experience**: Autocomplete and type checking for provider-specific params
2. **Flexibility**: Easy to add new providers without breaking existing code
3. **Safety**: Compile-time guarantees about parameter requirements
4. **Maintainability**: Clear separation of provider logic
5. **Extensibility**: Custom providers can be added with full type support

## Future Considerations

- **Provider Plugins**: Allow runtime registration of new providers
- **Middleware**: Support for request/response interceptors
- **Caching**: Built-in response caching mechanisms
- **Retry Logic**: Configurable retry strategies per provider
- **Analytics**: Usage tracking and performance monitoring

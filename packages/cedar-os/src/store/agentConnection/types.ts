// Base types for LLM responses and events
export interface LLMResponse {
	content: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
	metadata?: Record<string, unknown>;
	// The object field contains structured output when using JSON Schema or Zod
	object?: any;
}

export type StreamEvent =
	| { type: 'chunk'; content: string }
	| { type: 'done' }
	| { type: 'error'; error: Error }
	| { type: 'metadata'; data: unknown };

export type StreamHandler = (event: StreamEvent) => void | Promise<void>;

export interface StreamResponse {
	abort: () => void;
	completion: Promise<void>;
}

// Provider-specific parameter types
export interface BaseParams {
	prompt: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	[key: string]: unknown;
}

export interface OpenAIParams extends BaseParams {
	model: string;
}

export interface AnthropicParams extends BaseParams {
	model: string;
}

export interface MastraParams extends BaseParams {
	route: string;
	// Mastra doesn't require model as a param
}

export interface AISDKParams extends BaseParams {
	model: string; // Format: "provider/model" e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet"
}

export interface CustomParams extends BaseParams {
	[key: string]: unknown;
}

// Model to API key mapping for AI SDK
export type AISDKProviderConfig = {
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

// Provider configurations
export type ProviderConfig =
	| { provider: 'openai'; apiKey: string }
	| { provider: 'anthropic'; apiKey: string }
	| { provider: 'mastra'; apiKey?: string; baseURL: string }
	| { provider: 'ai-sdk'; providers: AISDKProviderConfig }
	| { provider: 'custom'; config: Record<string, unknown> };

// Type inference helpers
export type InferProviderType<T extends ProviderConfig> = T['provider'];

export type InferProviderParams<T extends ProviderConfig> = T extends {
	provider: 'openai';
}
	? OpenAIParams
	: T extends { provider: 'anthropic' }
	? AnthropicParams
	: T extends { provider: 'mastra' }
	? MastraParams
	: T extends { provider: 'ai-sdk' }
	? AISDKParams
	: T extends { provider: 'custom' }
	? CustomParams
	: never;

export type InferProviderConfig<P extends ProviderConfig['provider']> = Extract<
	ProviderConfig,
	{ provider: P }
>;

// Provider implementation template
export interface ProviderImplementation<
	TParams extends BaseParams,
	TConfig extends ProviderConfig
> {
	callLLM: (params: TParams, config: TConfig) => Promise<LLMResponse>;
	streamLLM: (
		params: TParams,
		config: TConfig,
		handler: StreamHandler
	) => StreamResponse;
	handleResponse: (response: Response) => Promise<LLMResponse>;
	handleStreamResponse: (chunk: string) => StreamEvent;
}

import { z } from 'zod';
import type { CedarStore } from '@/store/CedarOSTypes';

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
	// Can be a single object or an array of objects for multiple operations
	object?: StructuredResponseType | StructuredResponseType[];
}

// Voice-specific response type
export interface VoiceLLMResponse extends LLMResponse {
	// Voice-specific fields
	transcription?: string;
	audioData?: string; // Base64 encoded audio
	audioUrl?: string;
	audioFormat?: string;
}

// Voice parameters for LLM calls
export type VoiceParams<E = object> = BaseParams<E> & {
	audioData: Blob;
	voiceSettings: {
		language: string;
		voiceId?: string;
		pitch?: number;
		rate?: number;
		volume?: number;
		useBrowserTTS?: boolean;
		autoAddToMessages?: boolean;
		endpoint?: string;
	};
	context?: string;
};

export type StreamEvent =
	| { type: 'chunk'; content: string }
	| {
			type: 'object';
			object: StructuredResponseType | StructuredResponseType[];
	  }
	| { type: 'done'; completedItems: (string | object)[] }
	| { type: 'error'; error: Error }
	| { type: 'metadata'; data: unknown };

export type StreamHandler = (event: StreamEvent) => void | Promise<void>;

export interface StreamResponse {
	abort: () => void;
	completion: Promise<void>;
}

// Provider-specific parameter types
export type BaseParams<E = object> = {
	prompt?: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
} & E; // User-defined extra fields with full type safety

export interface OpenAIParams extends BaseParams {
	model: string;
}

export interface AnthropicParams extends BaseParams {
	model: string;
}

export type MastraParams<T = unknown, E = object> = BaseParams<E> & {
	route: string;
	resourceId?: string;
	threadId?: string;
	additionalContext?: T; // Typed additional context
};

export interface AISDKParams extends BaseParams {
	model: string; // Format: "provider/model" e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet"
}

export type CustomParams<T = unknown, E = object> = BaseParams<E> & {
	userId?: string;
	threadId?: string;
	additionalContext?: T; // Typed additional context
};

// Structured output params extend base params with schema
export type StructuredParams<T = unknown, E = object> = BaseParams<E> & {
	schema?: T; // JSON Schema or Zod schema
	schemaName?: string;
	schemaDescription?: string;
};

// AI SDK specific structured params that require Zod schemas
export interface AISDKStructuredParams extends BaseParams {
	model: string;
	schema: z.ZodType<unknown>; // Required Zod schema for AI SDK - must be a Zod type, not JSON schema
	schemaName?: string;
	schemaDescription?: string;
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
	xai?: {
		apiKey: string;
	};
};

// Provider configurations
export type ProviderConfig =
	| { provider: 'openai'; apiKey: string }
	| { provider: 'anthropic'; apiKey: string }
	| {
			provider: 'mastra';
			apiKey?: string;
			baseURL: string;
			chatPath?: string;
			voiceRoute?: string;
	  }
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
	callLLMStructured: (
		params: TParams & StructuredParams,
		config: TConfig
	) => Promise<LLMResponse>;
	streamLLM: (
		params: TParams,
		config: TConfig,
		handler: StreamHandler
	) => StreamResponse;
	voiceLLM: (params: VoiceParams, config: TConfig) => Promise<VoiceLLMResponse>;
	handleResponse: (response: Response) => Promise<LLMResponse>;
	handleStreamResponse: (chunk: string) => StreamEvent;
}

// Response processor types
export interface BaseStructuredResponseType {
	type: string;
	content?: string;
}

// Default response type with fields from LLMResponse (excluding 'object')
export interface DefaultStructuredResponseType
	extends BaseStructuredResponseType {
	content: string;
}

export type CustomStructuredResponseType<
	T extends string,
	P extends object = Record<string, never>
> = BaseStructuredResponseType & { type: T } & P;

// Union of default and custom response types
export type StructuredResponseType =
	| DefaultStructuredResponseType
	| CustomStructuredResponseType<string, object>;

export interface ResponseProcessor<
	T extends StructuredResponseType = StructuredResponseType
> {
	type: string;
	namespace?: string;
	execute: (obj: T, store: CedarStore) => void | Promise<void>;
	validate?: (obj: StructuredResponseType) => obj is T;
}

export type ResponseProcessorExecute<
	T extends StructuredResponseType = StructuredResponseType
> = (obj: T, store: CedarStore) => void | Promise<void>;

export type ResponseProcessorRegistry = Record<
	string,
	ResponseProcessor | undefined
>;

// Generic Zod schema factory for BaseParams that matches the updated interface
export const BaseParamsSchema = <E extends z.ZodTypeAny = z.ZodType<object>>(
	extraFieldsSchema?: E
) =>
	z
		.object({
			prompt: z.string().optional(),
			systemPrompt: z.string().optional(),
			temperature: z.number().optional(),
			maxTokens: z.number().optional(),
			stream: z.boolean().optional(),
		})
		.and(extraFieldsSchema || z.object({})); // Merge with user-defined extra fields schema

// Convenience export for basic BaseParams schema (no extra fields)
export const BasicBaseParamsSchema = BaseParamsSchema();

// Provider-specific schema factories that use the generic BaseParams
export const MastraParamsSchema = <
	T extends z.ZodTypeAny = z.ZodUnknown,
	E extends z.ZodTypeAny = z.ZodType<object>
>(
	additionalContextSchema?: T,
	extraFieldsSchema?: E
) =>
	BaseParamsSchema(extraFieldsSchema).and(
		z.object({
			route: z.string(),
			resourceId: z.string().optional(),
			threadId: z.string().optional(),
			additionalContext: (additionalContextSchema || z.unknown()).optional(),
		})
	);

export const CustomParamsSchema = <
	T extends z.ZodTypeAny = z.ZodUnknown,
	E extends z.ZodTypeAny = z.ZodType<object>
>(
	additionalContextSchema?: T,
	extraFieldsSchema?: E
) =>
	BaseParamsSchema(extraFieldsSchema).and(
		z.object({
			userId: z.string().optional(),
			threadId: z.string().optional(),
			additionalContext: (additionalContextSchema || z.unknown()).optional(),
		})
	);

// Standardized provider schemas (no custom fields - they have fixed APIs)
export const OpenAIParamsSchema = BasicBaseParamsSchema.and(
	z.object({
		model: z.string(),
	})
);

export const AnthropicParamsSchema = BasicBaseParamsSchema.and(
	z.object({
		model: z.string(),
	})
);

export const AISDKParamsSchema = BasicBaseParamsSchema.and(
	z.object({
		model: z.string(), // Format: "provider/model" e.g., "openai/gpt-4o"
	})
);

// Convenience exports for configurable providers (no extra fields)
export const BasicMastraParamsSchema = MastraParamsSchema();
export const BasicCustomParamsSchema = CustomParamsSchema();

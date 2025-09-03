import { z } from 'zod';
import type { CedarStore } from '@/store/CedarOSTypes';
import type { AdditionalContextParam } from '@/store/agentContext/AgentContextTypes';
import { AdditionalContextParamSchema } from '@/store/agentContext/AgentContextTypes';

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
export type VoiceParams<
	T extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E = object
> = BaseParams<T, E> & {
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
	context?: object | string;
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
// Updated to use AdditionalContextParam for better type safety
export type BaseParams<
	T extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E = object
> = {
	prompt?: string;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	stream?: boolean;
	additionalContext?: AdditionalContextParam<T>;
} & E; // User-defined extra fields with full type safety

// Standardized providers have fixed APIs (no custom context data)
export interface OpenAIParams extends BaseParams {
	model: string;
}

export interface AnthropicParams extends BaseParams {
	model: string;
}

export interface AISDKParams extends BaseParams {
	model: string; // Format: "provider/model" e.g., "openai/gpt-4o", "anthropic/claude-3-sonnet"
}

// Configurable providers support custom context data
export type MastraParams<
	T extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E = object
> = BaseParams<T, E> & {
	route: string;
	resourceId?: string;
	threadId?: string;
};

export type CustomParams<
	T extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E = object
> = BaseParams<T, E> & {
	userId?: string;
	threadId?: string;
};

// Structured output params extend base params with schema
export type StructuredParams<
	T extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E = object,
	TSchema = unknown
> = BaseParams<T, E> & {
	schema?: TSchema; // JSON Schema or Zod schema
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
			resumePath?: string; // Human-in-the-loop workflow resume endpoint
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

// ==========================================================================================
// Zod typing for agent requests
// ==========================================================================================

export const BaseParamsSchema = <
	TData extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E extends z.ZodTypeAny = z.ZodType<object>
>(
	dataSchemas?: TData,
	extraFieldsSchema?: E
) =>
	z
		.object({
			prompt: z.string().optional(),
			systemPrompt: z.string().optional(),
			temperature: z.number().optional(),
			maxTokens: z.number().optional(),
			stream: z.boolean().optional(),
			additionalContext: dataSchemas
				? AdditionalContextParamSchema(dataSchemas).optional()
				: z.unknown().optional(),
		})
		.and(extraFieldsSchema || z.object({})); // Merge with user-defined extra fields schema

export const MastraParamsSchema = <
	TData extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E extends z.ZodTypeAny = z.ZodType<object>
>(
	dataSchemas?: TData,
	extraFieldsSchema?: E
) =>
	BaseParamsSchema(dataSchemas, extraFieldsSchema).and(
		z.object({
			route: z.string(),
			resourceId: z.string().optional(),
			threadId: z.string().optional(),
		})
	);

export const CustomParamsSchema = <
	TData extends Record<string, z.ZodTypeAny> = Record<string, never>,
	E extends z.ZodTypeAny = z.ZodType<object>
>(
	dataSchemas?: TData,
	extraFieldsSchema?: E
) =>
	BaseParamsSchema(dataSchemas, extraFieldsSchema).and(
		z.object({
			userId: z.string().optional(),
			threadId: z.string().optional(),
		})
	);

// Standardized provider schemas (no custom fields - they have fixed APIs)
export const OpenAIParamsSchema = BaseParamsSchema().and(
	z.object({
		model: z.string(),
	})
);

export const AnthropicParamsSchema = BaseParamsSchema().and(
	z.object({
		model: z.string(),
	})
);

export const AISDKParamsSchema = BaseParamsSchema().and(
	z.object({
		model: z.string(), // Format: "provider/model" e.g., "openai/gpt-4o"
	})
);

// ==========================================================================================
// Zod typing for agent responses
// ==========================================================================================

// Generic structured response schema (matches BaseStructuredResponseType)
export const BaseStructuredResponseSchema = z
	.object({
		type: z.string(),
		content: z.string().optional(),
	})
	.passthrough(); // Allow additional fields for CustomStructuredResponseType

// Structured response schema for specific types
export const StructuredResponseSchema = <T extends string>(type: T) =>
	z
		.object({
			type: z.literal(type),
			content: z.string().optional(),
		})
		.passthrough(); // Allow additional fields for CustomStructuredResponseType

// Response schema using custom object responses
export const LLMResponseSchema = <T extends z.ZodTypeAny = z.ZodUnknown>(
	objectSchema?: T
) =>
	z.object({
		content: z.string(),
		object: objectSchema
			? z.union([objectSchema, z.array(objectSchema)]).optional()
			: z
					.union([
						BaseStructuredResponseSchema,
						z.array(BaseStructuredResponseSchema),
					])
					.optional(),
		usage: z
			.object({
				promptTokens: z.number(),
				completionTokens: z.number(),
				totalTokens: z.number(),
			})
			.optional(),
		metadata: z.record(z.unknown()).optional(),
	});
// Event based schema for streaming responses
export const StreamEventSchema = z.discriminatedUnion('type', [
	// Content chunk event
	z.object({
		type: z.literal('chunk'),
		content: z.string(),
	}),
	// Structured object event
	z.object({
		type: z.literal('object'),
		object: z.union([
			BaseStructuredResponseSchema,
			z.array(BaseStructuredResponseSchema),
		]),
	}),
	// Completion event
	z.object({
		type: z.literal('done'),
		completedItems: z.array(z.union([z.string(), z.record(z.unknown())])), // Used for logging
	}),
	// Error event
	z.object({
		type: z.literal('error'),
		error: z.unknown(), // Could be Error object or string
	}),
]);

export const VoiceLLMResponseSchema = <T extends z.ZodTypeAny = z.ZodUnknown>(
	objectSchema?: T
) =>
	LLMResponseSchema(objectSchema).and(
		z.object({
			transcription: z.string().optional(),
			audioData: z.string().optional(), // Base64 encoded audio
			audioUrl: z.string().optional(),
			audioFormat: z.string().optional(),
		})
	);

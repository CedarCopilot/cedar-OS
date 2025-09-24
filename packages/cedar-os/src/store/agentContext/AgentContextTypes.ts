import type { ReactNode } from 'react';
import z from 'zod';

// -------- Backend context structure (after compileAdditionalContext transformation) -----------
// Note: These are different from the stateSlice Setter types - these are for serialized context
export interface BackendStateSetterSchema {
	name: string;
	stateKey: string;
	description: string;
	argsSchema?: unknown;
}

export interface BackendStateSchema {
	stateKey: string;
	description?: string;
	schema: unknown;
}

export interface BackendFrontendToolSchema {
	name: string;
	description?: string;
	argsSchema: Record<string, unknown>; // JSON Schema
}

/**
 * Backend Context Entry with proper generic typing
 */
export interface BackendContextEntry<TData = unknown> {
	data: TData;
	source: 'mention' | 'subscription' | 'manual' | 'function';
}

/**
 * The transformed backend type - what backends actually receive when parsing the additionalContext field
 */
export type AdditionalContextParam<
	TSchemas extends Record<string, z.ZodTypeAny>
> = {
	frontendTools?: Record<string, unknown>;
	stateSetters?: Record<string, unknown>;
	schemas?: Record<string, unknown>;
} & {
	[K in keyof TSchemas]: TSchemas[K] extends z.ZodOptional<z.ZodArray<infer U>>
		? BackendContextEntry<z.infer<U>>[] | undefined
		: TSchemas[K] extends z.ZodArray<infer U>
		? BackendContextEntry<z.infer<U>>[]
		: BackendContextEntry<z.infer<TSchemas[K]>>;
};

/**
 * Represents an entry in the additional context
 */
export interface ContextEntry {
	id: string;
	source: 'mention' | 'subscription' | 'manual' | 'function';
	data: any;
	metadata?: {
		label?: string;
		icon?: ReactNode;
		color?: string; // Hex color
		/** Whether this entry should be shown in the chat UI (ContextBadgeRow). Defaults to true */
		showInChat?: boolean;
		order?: number; // Order for display (lower numbers appear first)
		[key: string]: unknown;
	};
}

/**
 * Additional context structure - supports both single entries and arrays
 */
export interface AdditionalContext {
	[key: string]: ContextEntry | ContextEntry[];
}

/**
 * Represents an item in the mention list
 */
export interface MentionItem {
	id: string | null;
	label?: string | null;
	data?: unknown;
	metadata?: {
		icon?: ReactNode;
		color?: string; // Hex color
		/** Whether this mention item should be shown as a badge after insertion (default true) */
		showInChat?: boolean;
		[key: string]: unknown;
	};
	providerId?: string; // Internal use only
}

/**
 * Interface for mention providers
 */
export interface MentionProvider {
	id: string;
	trigger: string;
	label?: string;
	description?: string;
	color?: string;
	icon?: ReactNode;
	getItems: (query: string) => MentionItem[] | Promise<MentionItem[]>;
	toContextEntry: (item: MentionItem) => ContextEntry;
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (
		item: MentionItem,
		attrs: Record<string, unknown>
	) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

/**
 * Configuration for state-based mention providers
 */
export interface StateBasedMentionProviderConfig<T> {
	stateKey: string;
	trigger?: string;
	labelField?: string | ((item: T) => string);
	searchFields?: string[];
	description?: string;
	icon?: ReactNode;
	color?: string; // Hex color
	order?: number; // Order for display (lower numbers appear first)
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (
		item: MentionItem,
		attrs: Record<string, unknown>
	) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

// Schema for the existing ContextEntry type
export const ContextEntrySchema = z.object({
	id: z.string(),
	source: z.enum(['mention', 'subscription', 'manual', 'function']),
	data: z.unknown(),
	metadata: z
		.object({
			label: z.string().optional(),
			icon: z.unknown().optional(), // ReactNode - can't validate with Zod
			color: z.string().optional(),
			showInChat: z.boolean().optional(),
			order: z.number().optional(),
		})
		.catchall(z.unknown())
		.optional(),
});

// Schema for the existing AdditionalContext type
export const AdditionalContextSchema = z.record(
	z.union([ContextEntrySchema, z.array(ContextEntrySchema)])
);

// Generic chat request schema factory for backends
export const createChatRequestSchema = <
	T extends z.ZodTypeAny = typeof AdditionalContextSchema
>(
	additionalContextSchema?: T
) =>
	z.object({
		message: z.string(),
		systemPrompt: z.string().optional(),
		temperature: z.number().min(0).max(2).optional(),
		maxTokens: z.number().positive().optional(),
		stream: z.boolean().optional(),
		additionalContext: (
			additionalContextSchema || AdditionalContextSchema
		).optional(),
	});

// Standard chat request schema using the existing AdditionalContext
export const ChatRequestSchema = createChatRequestSchema();

// Generic response schema for backends
export const ChatResponseSchema = z.object({
	content: z.string(),
	usage: z
		.object({
			promptTokens: z.number(),
			completionTokens: z.number(),
			totalTokens: z.number(),
		})
		.optional(),
	metadata: z.record(z.unknown()).optional(),
	object: z
		.union([z.record(z.unknown()), z.array(z.record(z.unknown()))])
		.optional(),
});

// -------- Zod Types for AdditionalContextParam -----------
/**
 * AdditionalContextParam that the backend receives (factory function)
 */
export function AdditionalContextParamSchema<
	TSchemas extends Record<string, z.ZodTypeAny>
>(dataSchemas: TSchemas) {
	const contextEntrySchema = z.object({
		data: z.unknown(),
		source: z.enum(['mention', 'subscription', 'manual', 'function']),
	});

	const schemaFields: Record<string, z.ZodTypeAny> = {
		frontendTools: z.record(z.string(), z.unknown()).optional(),
		stateSetters: z.record(z.string(), z.unknown()).optional(),
		schemas: z.record(z.string(), z.unknown()).optional(),
	};

	// Transform each data schema to be wrapped in BackendContextEntry
	for (const [key, schema] of Object.entries(dataSchemas)) {
		if (schema instanceof z.ZodOptional) {
			// Handle optional arrays: z.array(T).optional() -> z.array(BackendContextEntry<T>).optional()
			const innerSchema = schema.unwrap();
			if (innerSchema instanceof z.ZodArray) {
				schemaFields[key] = z
					.array(
						contextEntrySchema.extend({
							data: innerSchema.element,
						})
					)
					.optional();
			} else {
				schemaFields[key] = contextEntrySchema
					.extend({
						data: innerSchema,
					})
					.optional();
			}
		} else if (schema instanceof z.ZodArray) {
			// Handle required arrays: z.array(T) -> z.array(BackendContextEntry<T>)
			schemaFields[key] = z.array(
				contextEntrySchema.extend({
					data: schema.element,
				})
			);
		} else {
			// Handle single values: T -> BackendContextEntry<T>
			schemaFields[key] = contextEntrySchema.extend({
				data: schema,
			});
		}
	}

	return z.object(schemaFields);
}

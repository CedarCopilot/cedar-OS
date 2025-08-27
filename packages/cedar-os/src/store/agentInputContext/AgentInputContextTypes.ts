import type { ReactNode } from 'react';
import z from 'zod';

// -------- Backend context structure (after stringifyAdditionalContext transformation) -----------
// Note: These are different from the stateSlice Setter types - these are for serialized context
export interface BackendSetterSchema {
	name: string;
	stateKey: string;
	description: string;
	schema?: unknown;
}

export interface BackendStateSchema {
	stateKey: string;
	description?: string;
	schema: unknown;
}

// Backend context entry (simplified format sent to backend)
export interface BackendContextEntry {
	data: unknown;
	source: 'mention' | 'subscription' | 'manual' | 'function';
}

// The transformed backend type - what backends actually receive when parsing the additionalContext field
export type AdditionalContextParam<
	TData extends Record<string, z.ZodTypeAny> = Record<string, never>
> = {
	// Cedar OS system fields (added by stringifyAdditionalContext)
	setters?: Record<string, BackendSetterSchema>;
	schemas?: Record<string, BackendStateSchema>;
} & {
	// User context fields - auto-transformed to backend format
	[K in keyof TData]: TData[K] extends z.ZodArray<z.ZodTypeAny>
		? BackendContextEntry[]
		: BackendContextEntry;
};

/**
 * Represents an entry in the additional context
 */
export interface ContextEntry {
	id: string;
	source: 'mention' | 'subscription' | 'manual' | 'function';
	data: unknown;
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
		attrs: Record<string, any>
	) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

/**
 * Configuration for state-based mention providers
 */
export interface StateBasedMentionProviderConfig {
	stateKey: string;
	trigger?: string;
	labelField?: string | ((item: any) => string);
	searchFields?: string[];
	description?: string;
	icon?: ReactNode;
	color?: string; // Hex color
	order?: number; // Order for display (lower numbers appear first)
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (
		item: MentionItem,
		attrs: Record<string, any>
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
// Schema factory for AdditionalContextParam - handles backend context structure
export const AdditionalContextParamSchema = <
	TData extends Record<string, z.ZodTypeAny>
>(
	dataSchemas: TData
) =>
	z
		.object({
			// Cedar OS system fields (added by stringifyAdditionalContext)
			setters: z
				.record(
					z.object({
						name: z.string(),
						stateKey: z.string(),
						description: z.string(),
						schema: z.unknown().optional(),
					})
				)
				.optional(),
			schemas: z
				.record(
					z.object({
						stateKey: z.string(),
						description: z.string().optional(),
						schema: z.unknown(),
					})
				)
				.optional(),
		})
		.and(
			// Transform user data schemas to backend format
			z.object(
				Object.fromEntries(
					Object.entries(dataSchemas).map(([key, schema]) => [
						key,
						schema instanceof z.ZodArray
							? z.array(
									z.object({
										data: schema.element,
										source: z.enum([
											'mention',
											'subscription',
											'manual',
											'function',
										]),
									})
							  )
							: z.object({
									data: schema,
									source: z.enum([
										'mention',
										'subscription',
										'manual',
										'function',
									]),
							  }),
					])
				)
			)
		);

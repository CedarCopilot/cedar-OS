import { z } from 'zod';

// ================= GENERIC CEDAR-OS TYPES =================

/**
 * Backend Context Entry with proper generic typing
 */
export interface BackendContextEntry<TData = unknown> {
	data: TData;
	source: 'mention' | 'subscription' | 'manual' | 'function';
}

/**
 * Improved Additional Context Param type with proper inference
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

/**
 * Improved schema factory function
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

// Type definitions for the structured data within frontendTools and stateSetters
export interface FrontendToolData {
	name: string;
	description?: string;
	argsSchema: Record<string, unknown>; // JSON Schema
}

export interface StateSetterData {
	name: string;
	stateKey: string;
	description: string;
	argsSchema?: unknown; // JSON Schema
}

// ================= REQUEST BODY TYPE =================

export interface CedarRequestBody<
	TSchemas extends Record<string, z.ZodTypeAny> = Record<string, never>
> {
	prompt?: string;
	message?: string;
	additionalContext?: AdditionalContextParam<TSchemas>;
	[key: string]: unknown;
}

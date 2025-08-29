import { z } from 'zod';

export interface CedarRequestBody {
	prompt?: string;
	message?: string;
	additionalContext?: AdditionalContext;
	[key: string]: unknown;
}

export interface AdditionalContext {
	frontendTools?: Record<string, FrontendToolInfo>;
	stateSetters?: Record<string, StateSetterInfo>;
	schemas?: Record<string, StateSchemaInfo>;
	[key: string]: unknown;
}

export interface FrontendToolInfo {
	name: string;
	description?: string;
	argsSchema: Record<string, unknown>; // JSON Schema
}

export interface StateSetterInfo {
	name: string;
	stateKey: string;
	description: string;
	argsSchema?: unknown; // JSON Schema
}

export interface StateSchemaInfo {
	stateKey: string;
	description?: string;
	schema: unknown; // JSON Schema
}

export interface CedarStructuredSchemas {
	frontendToolSchema: z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>;
	setStateSchema: z.ZodUnion<[z.ZodTypeAny, ...z.ZodTypeAny[]]>;
	combinedSchema: z.ZodUnion<[z.ZodTypeAny, z.ZodTypeAny]>;
}

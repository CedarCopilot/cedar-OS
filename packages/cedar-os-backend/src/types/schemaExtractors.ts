import { getJsonSchema } from '@/utils/getJsonSchema';
import type {
	CedarRequestBody,
	FrontendToolData,
	StateSetterData,
} from '@/types';
import type { JSONSchema7 } from 'json-schema';
import { z } from 'zod';

/**
 * Extract a single frontend tool schema from additionalContext
 * Returns JSON Schema directly (for use with experimental_output)
 */
export function getFrontendToolSchema<
	TSchemas extends Record<string, z.ZodTypeAny> = Record<string, never>
>(
	requestBody: CedarRequestBody<TSchemas>,
	toolName: string
): JSONSchema7 | null {
	const additionalContext = requestBody.additionalContext;
	if (!additionalContext?.frontendTools?.[toolName]) {
		return null;
	}

	const tool = additionalContext.frontendTools[toolName] as FrontendToolData;
	if (!tool?.argsSchema) {
		return null;
	}

	return getJsonSchema(tool.argsSchema);
}

/**
 * Extract all frontend tool schemas from additionalContext
 * Returns JSON Schemas directly (for use with experimental_output)
 */
export function getFrontendToolSchemas<
	TSchemas extends Record<string, z.ZodTypeAny> = Record<string, never>
>(requestBody: CedarRequestBody<TSchemas>): Record<string, JSONSchema7> {
	const additionalContext = requestBody.additionalContext;
	if (!additionalContext?.frontendTools) {
		return {};
	}

	const schemas: Record<string, JSONSchema7> = {};

	for (const [toolName, tool] of Object.entries(
		additionalContext.frontendTools
	)) {
		const toolData = tool as FrontendToolData;
		if (toolData?.argsSchema) {
			const jsonSchema = getJsonSchema(toolData.argsSchema);
			if (jsonSchema) {
				schemas[toolName] = jsonSchema;
			}
		}
	}

	return schemas;
}

/**
 * Extract a single state setter schema from additionalContext
 * Returns JSON Schema directly (for use with experimental_output)
 */
export function getStateSetterSchema<
	TSchemas extends Record<string, z.ZodTypeAny> = Record<string, never>
>(args: {
	requestBody: CedarRequestBody<TSchemas>;
	setterKey: string;
	stateKey: string;
}): JSONSchema7 | null {
	const { requestBody, setterKey } = args;
	const additionalContext = requestBody.additionalContext;
	const stateSetters = additionalContext?.stateSetters;

	if (!stateSetters?.[setterKey]) {
		return null;
	}

	const setter = stateSetters[setterKey] as StateSetterData;
	const schema = setter?.argsSchema;

	if (!schema) {
		return null;
	}

	return getJsonSchema(schema);
}

/**
 * Extract all state setter schemas from additionalContext
 * Returns JSON Schemas directly (for use with experimental_output)
 */
export function getStateSetterSchemas<
	TSchemas extends Record<string, z.ZodTypeAny> = Record<string, never>
>(requestBody: CedarRequestBody<TSchemas>): Record<string, JSONSchema7> {
	const additionalContext = requestBody.additionalContext;
	const stateSetters = additionalContext?.stateSetters;

	if (!stateSetters) {
		return {};
	}

	const schemas: Record<string, JSONSchema7> = {};

	for (const [setterKey, setter] of Object.entries(stateSetters)) {
		const setterData = setter as StateSetterData;
		const schema = setterData?.argsSchema;
		if (schema) {
			const jsonSchema = getJsonSchema(schema);
			if (jsonSchema) {
				schemas[setterKey] = jsonSchema;
			}
		}
	}

	return schemas;
}

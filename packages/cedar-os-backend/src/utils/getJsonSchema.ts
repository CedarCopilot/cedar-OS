import type { JSONSchema7 } from 'json-schema';

/**
 * Get JSON Schema directly - this is what you'll typically want for experimental_output
 */
export function getJsonSchema(jsonSchema: unknown): JSONSchema7 | null {
	if (!jsonSchema || typeof jsonSchema !== 'object') {
		return null;
	}

	return jsonSchema as JSONSchema7;
}

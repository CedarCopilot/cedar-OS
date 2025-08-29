/**
 * Get JSON Schema directly - this is what you'll typically want for experimental_output
 */
export function getJsonSchema(
	jsonSchema: unknown
): Record<string, unknown> | null {
	if (!jsonSchema || typeof jsonSchema !== 'object') {
		return null;
	}

	return jsonSchema as Record<string, unknown>;
}

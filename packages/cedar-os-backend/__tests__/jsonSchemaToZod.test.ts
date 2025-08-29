import { getJsonSchema } from '../src/utils/getJsonSchema';

describe('getJsonSchema', () => {
	it('should return JSON schema for valid object input', () => {
		const jsonSchema = { type: 'string' };
		const result = getJsonSchema(jsonSchema);
		expect(result).toEqual({ type: 'string' });
	});

	it('should return complex JSON schema unchanged', () => {
		const jsonSchema = {
			type: 'object',
			properties: {
				name: { type: 'string' },
				age: { type: 'number' },
			},
			required: ['name'],
		};
		const result = getJsonSchema(jsonSchema);
		expect(result).toEqual(jsonSchema);
	});

	it('should return null for invalid input', () => {
		expect(getJsonSchema(null)).toBeNull();
		expect(getJsonSchema(undefined)).toBeNull();
		expect(getJsonSchema('string')).toBeNull();
		expect(getJsonSchema(123)).toBeNull();
	});

	it('should handle nested object schemas', () => {
		const jsonSchema = {
			type: 'object',
			properties: {
				user: {
					type: 'object',
					properties: {
						name: { type: 'string' },
						preferences: {
							type: 'object',
							properties: {
								theme: { type: 'string' },
							},
						},
					},
				},
			},
		};
		const result = getJsonSchema(jsonSchema);
		expect(result).toEqual(jsonSchema);
	});

	it('should handle array schemas', () => {
		const jsonSchema = {
			type: 'array',
			items: { type: 'string' },
		};
		const result = getJsonSchema(jsonSchema);
		expect(result).toEqual(jsonSchema);
	});

	it('should handle enum schemas', () => {
		const jsonSchema = {
			type: 'string',
			enum: ['success', 'error', 'info'],
		};
		const result = getJsonSchema(jsonSchema);
		expect(result).toEqual(jsonSchema);
	});
});

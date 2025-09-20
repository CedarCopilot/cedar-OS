import {
	getFrontendToolSchema,
	getFrontendToolSchemas,
	getStateSetterSchema,
	getStateSetterSchemas,
} from '../src/types/schemaExtractors';
import type { CedarRequestBody } from '../src/types';

describe('Schema Extractors', () => {
	const mockRequestBody: CedarRequestBody = {
		prompt: 'test prompt',
		additionalContext: {
			frontendTools: {
				showNotification: {
					name: 'showNotification',
					description: 'Show a notification to the user',
					argsSchema: {
						type: 'object',
						properties: {
							message: { type: 'string' },
							type: { type: 'string', enum: ['success', 'error', 'info'] },
						},
					},
				},
				updateChart: {
					name: 'updateChart',
					description: 'Update chart data',
					argsSchema: {
						type: 'object',
						properties: {
							data: { type: 'array', items: { type: 'number' } },
						},
					},
				},
			},
			stateSetters: {
				addNode: {
					name: 'addNode',
					stateKey: 'nodes',
					description: 'Add a new node',
					argsSchema: {
						type: 'object',
						properties: {
							id: { type: 'string' },
							position: {
								type: 'object',
								properties: {
									x: { type: 'number' },
									y: { type: 'number' },
								},
							},
						},
					},
				},
				setTitle: {
					name: 'setTitle',
					stateKey: 'title',
					description: 'Set the title',
					argsSchema: {
						type: 'string',
					},
				},
			},
		},
	};

	describe('getFrontendToolSchema', () => {
		it('should extract a frontend tool schema', () => {
			const schema = getFrontendToolSchema(mockRequestBody, 'showNotification');
			expect(schema).toBeDefined();
			expect(typeof schema).toBe('object');
			expect(schema).toHaveProperty('type', 'object');
		});

		it('should return null for non-existent tool', () => {
			const schema = getFrontendToolSchema(mockRequestBody, 'nonExistentTool');
			expect(schema).toBeNull();
		});

		it('should return empty object for tool with empty schema', () => {
			const requestBodyWithoutSchema: CedarRequestBody = {
				additionalContext: {
					frontendTools: {
						noSchemaTool: {
							name: 'noSchemaTool',
							argsSchema: {},
						},
					},
				},
			};
			const schema = getFrontendToolSchema(
				requestBodyWithoutSchema,
				'noSchemaTool'
			);
			expect(schema).toEqual({});
		});
	});

	describe('getFrontendToolSchemas', () => {
		it('should extract all frontend tool schemas', () => {
			const schemas = getFrontendToolSchemas(mockRequestBody);
			expect(Object.keys(schemas)).toHaveLength(2);
			expect(schemas).toHaveProperty('showNotification');
			expect(schemas).toHaveProperty('updateChart');
			expect(typeof schemas.showNotification).toBe('object');
			expect(typeof schemas.updateChart).toBe('object');
		});

		it('should return empty object when no frontend tools exist', () => {
			const requestBodyWithoutTools: CedarRequestBody = {
				additionalContext: {},
			};
			const schemas = getFrontendToolSchemas(requestBodyWithoutTools);
			expect(schemas).toEqual({});
		});
	});

	describe('getStateSetterSchema', () => {
		it('should extract a state setter schema', () => {
			const schema = getStateSetterSchema({
				requestBody: mockRequestBody,
				setterKey: 'addNode',
				stateKey: 'nodes',
			});
			expect(schema).toBeDefined();
			expect(typeof schema).toBe('object');
			expect(schema).toHaveProperty('type', 'object');
		});

		it('should return null for non-existent setter', () => {
			const schema = getStateSetterSchema({
				requestBody: mockRequestBody,
				setterKey: 'nonExistentSetter',
				stateKey: 'someState',
			});
			expect(schema).toBeNull();
		});

		it('should return null for setter without schema', () => {
			const requestBodyWithoutSchema: CedarRequestBody = {
				additionalContext: {
					stateSetters: {
						noSchemaSetter: {
							name: 'noSchemaSetter',
							stateKey: 'someState',
							description: 'A setter without schema',
						},
					},
				},
			};
			const schema = getStateSetterSchema({
				requestBody: requestBodyWithoutSchema,
				setterKey: 'noSchemaSetter',
				stateKey: 'someState',
			});
			expect(schema).toBeNull();
		});
	});

	describe('getStateSetterSchemas', () => {
		it('should extract all state setter schemas', () => {
			const schemas = getStateSetterSchemas(mockRequestBody);
			expect(Object.keys(schemas)).toHaveLength(2);
			expect(schemas).toHaveProperty('addNode');
			expect(schemas).toHaveProperty('setTitle');
			expect(typeof schemas.addNode).toBe('object');
			expect(typeof schemas.setTitle).toBe('object'); // setTitle schema is { type: 'string' }
			expect(schemas.setTitle).toHaveProperty('type', 'string');
		});

		it('should return empty object when no state setters exist', () => {
			const requestBodyWithoutSetters: CedarRequestBody = {
				additionalContext: {},
			};
			const schemas = getStateSetterSchemas(requestBodyWithoutSetters);
			expect(schemas).toEqual({});
		});
	});
});

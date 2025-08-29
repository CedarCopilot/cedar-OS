import { act } from 'react-dom/test-utils';
import { z } from 'zod/v4';
import { useCedarStore } from '../../../src/store/CedarStore';
import type { Setter } from '../../../src/store/stateSlice/stateSlice';

/**
 * Tests for the StateSlice to verify that state re-registration
 * properly updates all fields including function closures.
 * This is critical for components that remount with new closures.
 */

describe('StateSlice – state re-registration', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			registeredStates: {},
		}));
	});

	it('should update setValue and customSetters when re-registering', () => {
		const mockSetValue1 = jest.fn();
		const mockSetValue2 = jest.fn();
		const mockCustomSetter1 = jest.fn();
		const mockCustomSetter2 = jest.fn();

		// First registration (simulating initial mount)
		act(() => {
			useCedarStore.getState().registerState({
				key: 'testState',
				value: 'initial',
				setValue: mockSetValue1,
				customSetters: {
					testSetter: {
						name: 'testSetter',
						description: 'Test setter',
						execute: mockCustomSetter1,
					},
				},
			});
		});

		// Verify initial registration
		const state1 = useCedarStore.getState().registeredStates['testState'];
		expect(state1.setValue).toBe(mockSetValue1);
		expect(state1.customSetters?.testSetter.execute).toBe(mockCustomSetter1);

		// Re-register with new functions (simulating remount with new closures)
		act(() => {
			useCedarStore.getState().registerState({
				key: 'testState',
				value: 'updated',
				setValue: mockSetValue2,
				customSetters: {
					testSetter: {
						name: 'testSetter',
						description: 'Test setter',
						execute: mockCustomSetter2,
					},
				},
			});
		});

		// Verify ALL fields were updated, especially the function references
		const state2 = useCedarStore.getState().registeredStates['testState'];
		expect(state2.value).toBe('updated');
		expect(state2.setValue).toBe(mockSetValue2); // Should be the NEW function
		expect(state2.customSetters?.testSetter.execute).toBe(mockCustomSetter2); // Should be the NEW function

		// Test that the new functions are actually used
		act(() => {
			useCedarStore.getState().setCedarState('testState', 'newValue');
		});
		expect(mockSetValue2).toHaveBeenCalledWith('newValue');
		expect(mockSetValue1).not.toHaveBeenCalled(); // Old function should NOT be called

		act(() => {
			useCedarStore.getState().executeCustomSetter({
				key: 'testState',
				setterKey: 'testSetter',
				args: ['arg'],
			});
		});
		// The custom setter receives the current value and args as a single parameter
		expect(mockCustomSetter2).toHaveBeenCalledWith('newValue', ['arg']);
		expect(mockCustomSetter1).not.toHaveBeenCalled(); // Old function should NOT be called
	});
});

describe('StateSlice – Custom Setter Arguments', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			registeredStates: {},
		}));
	});

	describe('Object Arguments', () => {
		it('should handle object args with proper typing', () => {
			const mockSetter = jest.fn();
			const objectArgsSchema = z.object({
				id: z.string(),
				label: z.string(),
				position: z.object({ x: z.number(), y: z.number() }),
			});

			const setter: Setter<string[], typeof objectArgsSchema> = {
				name: 'addItem',
				description: 'Add an item with object args',
				argsSchema: objectArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'objectTest',
					value: [],
					customSetters: { addItem: setter },
				});
			});

			const testArgs = {
				id: 'item1',
				label: 'Test Item',
				position: { x: 100, y: 200 },
			};

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'objectTest',
					setterKey: 'addItem',
					args: testArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith([], testArgs);
		});

		it('should handle nested object args', () => {
			const mockSetter = jest.fn();
			const nestedArgsSchema = z.object({
				user: z.object({
					name: z.string(),
					age: z.number(),
					preferences: z.object({
						theme: z.enum(['light', 'dark']),
						notifications: z.boolean(),
					}),
				}),
				metadata: z.record(z.string(), z.string()),
			});

			const setter: Setter<unknown, typeof nestedArgsSchema> = {
				name: 'updateUser',
				description: 'Update user with nested object args',
				argsSchema: nestedArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'nestedTest',
					value: null,
					customSetters: { updateUser: setter },
				});
			});

			const testArgs = {
				user: {
					name: 'John Doe',
					age: 30,
					preferences: {
						theme: 'dark' as const,
						notifications: true,
					},
				},
				metadata: {
					lastLogin: '2024-01-01',
					source: 'web',
				},
			};

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'nestedTest',
					setterKey: 'updateUser',
					args: testArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(null, testArgs);
		});
	});

	describe('Array Arguments', () => {
		it('should handle array args as single parameter', () => {
			const mockSetter = jest.fn();
			const arrayArgsSchema = z.array(z.string());

			const setter: Setter<string[], typeof arrayArgsSchema> = {
				name: 'addItems',
				description: 'Add multiple items',
				argsSchema: arrayArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'arrayTest',
					value: [],
					customSetters: { addItems: setter },
				});
			});

			const testArgs = ['item1', 'item2', 'item3'];

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'arrayTest',
					setterKey: 'addItems',
					args: testArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith([], testArgs);
		});

		it('should handle tuple args as single parameter', () => {
			const mockSetter = jest.fn();
			const tupleArgsSchema = z.tuple([z.string(), z.number(), z.boolean()]);

			const setter: Setter<unknown, typeof tupleArgsSchema> = {
				name: 'updateWithTuple',
				description: 'Update with tuple args',
				argsSchema: tupleArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'tupleTest',
					value: null,
					customSetters: { updateWithTuple: setter },
				});
			});

			const testArgs: [string, number, boolean] = ['test', 42, true];

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'tupleTest',
					setterKey: 'updateWithTuple',
					args: testArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(null, testArgs);
		});
	});

	describe('Primitive Arguments', () => {
		it('should handle string args', () => {
			const mockSetter = jest.fn();
			const stringArgsSchema = z.string();

			const setter: Setter<string, typeof stringArgsSchema> = {
				name: 'setName',
				description: 'Set name with string arg',
				argsSchema: stringArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'stringTest',
					value: '',
					customSetters: { setName: setter },
				});
			});

			const testArg = 'John Doe';

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'stringTest',
					setterKey: 'setName',
					args: testArg,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith('', testArg);
		});

		it('should handle number args', () => {
			const mockSetter = jest.fn();
			const numberArgsSchema = z.number();

			const setter: Setter<number, typeof numberArgsSchema> = {
				name: 'increment',
				description: 'Increment by number arg',
				argsSchema: numberArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'numberTest',
					value: 0,
					customSetters: { increment: setter },
				});
			});

			const testArg = 5;

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'numberTest',
					setterKey: 'increment',
					args: testArg,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(0, testArg);
		});

		it('should handle boolean args', () => {
			const mockSetter = jest.fn();
			const booleanArgsSchema = z.boolean();

			const setter: Setter<boolean, typeof booleanArgsSchema> = {
				name: 'toggle',
				description: 'Set boolean value',
				argsSchema: booleanArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'booleanTest',
					value: false,
					customSetters: { toggle: setter },
				});
			});

			const testArg = true;

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'booleanTest',
					setterKey: 'toggle',
					args: testArg,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(false, testArg);
		});
	});

	describe('Void Arguments', () => {
		it('should handle no args (void)', () => {
			const mockSetter = jest.fn();
			const voidArgsSchema = z.void();

			const setter: Setter<string[], typeof voidArgsSchema> = {
				name: 'clear',
				description: 'Clear all items',
				argsSchema: voidArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'voidTest',
					value: ['item1', 'item2'],
					customSetters: { clear: setter },
				});
			});

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'voidTest',
					setterKey: 'clear',
					// No args provided
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(['item1', 'item2']);
		});

		it('should handle undefined args as void', () => {
			const mockSetter = jest.fn();

			const setter: Setter<number, z.ZodVoid> = {
				name: 'reset',
				description: 'Reset counter',
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'undefinedTest',
					value: 42,
					customSetters: { reset: setter },
				});
			});

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'undefinedTest',
					setterKey: 'reset',
					args: undefined,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(42);
		});
	});

	describe('Complex Type Arguments', () => {
		it('should handle union type args', () => {
			const mockSetter = jest.fn();
			const unionArgsSchema = z.union([z.string(), z.number(), z.boolean()]);

			const setter: Setter<unknown, typeof unionArgsSchema> = {
				name: 'setValue',
				description: 'Set value with union type',
				argsSchema: unionArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'unionTest',
					value: null,
					customSetters: { setValue: setter },
				});
			});

			// Test with string
			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'unionTest',
					setterKey: 'setValue',
					args: 'hello',
				});
			});
			expect(mockSetter).toHaveBeenCalledWith(null, 'hello');

			// Test with number
			mockSetter.mockClear();
			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'unionTest',
					setterKey: 'setValue',
					args: 42,
				});
			});
			expect(mockSetter).toHaveBeenCalledWith(null, 42);

			// Test with boolean
			mockSetter.mockClear();
			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'unionTest',
					setterKey: 'setValue',
					args: true,
				});
			});
			expect(mockSetter).toHaveBeenCalledWith(null, true);
		});

		it('should handle enum args', () => {
			const mockSetter = jest.fn();
			const enumArgsSchema = z.enum(['small', 'medium', 'large']);

			const setter: Setter<string, typeof enumArgsSchema> = {
				name: 'setSize',
				description: 'Set size with enum arg',
				argsSchema: enumArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'enumTest',
					value: 'medium',
					customSetters: { setSize: setter },
				});
			});

			const testArg = 'large';

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'enumTest',
					setterKey: 'setSize',
					args: testArg,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith('medium', testArg);
		});

		it('should handle optional args', () => {
			const mockSetter = jest.fn();
			const optionalArgsSchema = z.object({
				required: z.string(),
				optional: z.string().optional(),
			});

			const setter: Setter<unknown, typeof optionalArgsSchema> = {
				name: 'updateData',
				description: 'Update with optional fields',
				argsSchema: optionalArgsSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'optionalTest',
					value: null,
					customSetters: { updateData: setter },
				});
			});

			const testArgs = {
				required: 'test',
				optional: 'optional value',
			};

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'optionalTest',
					setterKey: 'updateData',
					args: testArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith(null, testArgs);
		});
	});

	describe('Legacy Schema Support', () => {
		it('should support deprecated schema property', () => {
			const mockSetter = jest.fn();
			const testSchema = z.string();

			// Using deprecated 'schema' property instead of 'argsSchema'
			const setter: Setter<string, typeof testSchema> = {
				name: 'legacySet',
				description: 'Test legacy schema support',
				schema: testSchema, // deprecated property
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'legacyTest',
					value: '',
					customSetters: { legacySet: setter },
				});
			});

			const testArg = 'legacy test';

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'legacyTest',
					setterKey: 'legacySet',
					args: testArg,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith('', testArg);
		});
	});

	describe('Args Validation', () => {
		let consoleSpy: jest.SpyInstance;

		beforeEach(() => {
			consoleSpy = jest.spyOn(console, 'error').mockImplementation();
		});

		afterEach(() => {
			consoleSpy.mockRestore();
		});

		it('should validate args against schema and execute on valid args', () => {
			const mockSetter = jest.fn();
			const validationSchema = z.object({
				id: z.string(),
				name: z.string(),
				age: z.number(),
			});

			const setter: Setter<unknown[], typeof validationSchema> = {
				name: 'addUser',
				description: 'Add a user with validation',
				argsSchema: validationSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'validationTest',
					value: [],
					customSetters: { addUser: setter },
				});
			});

			const validArgs = { id: '123', name: 'John', age: 30 };

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'validationTest',
					setterKey: 'addUser',
					args: validArgs,
				});
			});

			expect(mockSetter).toHaveBeenCalledWith([], validArgs);
			// No validation errors should be logged for valid args
			expect(consoleSpy).not.toHaveBeenCalledWith(
				expect.stringContaining('Args validation failed')
			);
		});

		it('should log error and not execute setter on invalid args', () => {
			const mockSetter = jest.fn();
			const validationSchema = z.object({
				id: z.string(),
				name: z.string(),
				age: z.number(),
			});

			const setter: Setter<unknown[], typeof validationSchema> = {
				name: 'addUser',
				description: 'Add a user with validation',
				argsSchema: validationSchema,
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'validationTest',
					value: [],
					customSetters: { addUser: setter },
				});
			});

			// Invalid args - age is string instead of number
			const invalidArgs = { id: '123', name: 'John', age: 'thirty' };

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'validationTest',
					setterKey: 'addUser',
					args: invalidArgs,
				});
			});

			// Setter should not be called with invalid args
			expect(mockSetter).not.toHaveBeenCalled();

			// Error should be logged in a single consolidated message
			expect(consoleSpy).toHaveBeenCalledTimes(1);
			const errorMessage = consoleSpy.mock.calls[0][0];

			// Check that the consolidated error message contains all expected parts
			expect(errorMessage).toContain(
				'Args validation failed for setter "addUser" on state "validationTest"'
			);
			expect(errorMessage).toContain('📥 Received args:');
			expect(errorMessage).toContain('📋 Expected schema:');
			expect(errorMessage).toContain('🔍 Validation errors:');
			expect(errorMessage).toContain(
				'💡 Tip: Check your backend response format'
			);

			// Check that the received args are included in the message
			expect(errorMessage).toContain('"age": "thirty"'); // Part of the invalid args
			expect(errorMessage).toContain('"name": "John"'); // Part of the invalid args

			// Log the actual error message format for documentation purposes
			console.log('\n=== VALIDATION ERROR MESSAGE FORMAT ===');
			console.log(errorMessage);
			console.log('=== END ERROR MESSAGE ===\n');
		});

		it('should log warning for setters without schema', () => {
			const mockSetter = jest.fn();
			const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

			const setter: Setter<unknown[], z.ZodTypeAny> = {
				name: 'noSchemaTest',
				description: 'Test setter without schema',
				// No argsSchema provided
				execute: mockSetter,
			};

			act(() => {
				useCedarStore.getState().registerState({
					key: 'noSchemaTest',
					value: [],
					customSetters: { noSchemaTest: setter },
				});
			});

			const testArgs = { anything: 'goes' };

			act(() => {
				useCedarStore.getState().executeCustomSetter({
					key: 'noSchemaTest',
					setterKey: 'noSchemaTest',
					args: testArgs,
				});
			});

			// Setter should still be called
			expect(mockSetter).toHaveBeenCalledWith([], testArgs);

			// Warning should be logged
			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					'No schema validation for setter "noSchemaTest" on state "noSchemaTest"'
				)
			);

			warnSpy.mockRestore();
		});
	});
});

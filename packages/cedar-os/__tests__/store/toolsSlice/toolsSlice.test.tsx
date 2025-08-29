import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import { useRegisterFrontendTool } from '@/store/toolsSlice/useRegisterFrontendTool';

describe('ToolsSlice', () => {
	beforeEach(() => {
		// Clear tools before each test
		act(() => {
			useCedarStore.getState().clearTools();
		});
	});

	describe('Basic tool registration', () => {
		it('should register and unregister a tool', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register a tool
			act(() => {
				result.current.registerTool({
					name: 'testTool',
					execute: (args: { message: string }) => {
						return `Received: ${args.message}`;
					},
					argsSchema: z.object({
						message: z.string(),
					}),
					description: 'A test tool',
				});
			});

			// Check that tool is registered
			const tools = result.current.getRegisteredTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('testTool');
			expect(tools[0].description).toBe('A test tool');

			// Unregister the tool
			act(() => {
				result.current.unregisterTool('testTool');
			});

			// Check that tool is unregistered
			const toolsAfter = result.current.getRegisteredTools();
			expect(toolsAfter).toHaveLength(0);
		});

		it('should execute a registered tool with validation', async () => {
			const { result } = renderHook(() => useCedarStore());
			const mockCallback = jest.fn((args) => `Hello, ${args.name}!`);

			// Register a tool
			act(() => {
				result.current.registerTool({
					name: 'greetingTool',
					execute: mockCallback,
					argsSchema: z.object({
						name: z.string(),
					}),
				});
			});

			// Execute the tool with valid arguments
			let executeResult;
			await act(async () => {
				executeResult = await result.current.executeTool('greetingTool', {
					name: 'World',
				});
			});

			expect(mockCallback).toHaveBeenCalledWith({ name: 'World' });
			expect(executeResult).toBe('Hello, World!');
		});

		it('should handle validation errors when executing tools', async () => {
			const { result } = renderHook(() => useCedarStore());
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			// Register a tool with strict schema
			act(() => {
				result.current.registerTool({
					name: 'strictTool',
					execute: (args: { count: number }) => args.count * 2,
					argsSchema: z.object({
						count: z.number(),
					}),
				});
			});

			// Execute with invalid arguments
			let executeResult;
			await act(async () => {
				executeResult = await result.current.executeTool('strictTool', {
					count: 'not a number', // Invalid type
				});
			});

			expect(executeResult).toBeUndefined();
			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});
	});

	describe('useRegisterFrontendTool hook', () => {
		it('should auto-register and unregister tool on mount/unmount', () => {
			const TestComponent = () => {
				useRegisterFrontendTool({
					name: 'componentTool',
					execute: (args: { value: number }) => args.value + 1,
					argsSchema: z.object({
						value: z.number(),
					}),
					description: 'Tool from component',
				});
				return null;
			};

			// Mount component
			const { unmount } = renderHook(() => TestComponent());

			// Check tool is registered
			const tools = useCedarStore.getState().getRegisteredTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('componentTool');

			// Unmount component
			unmount();

			// Check tool is unregistered
			const toolsAfter = useCedarStore.getState().getRegisteredTools();
			expect(toolsAfter).toHaveLength(0);
		});

		it('should handle enabled flag correctly', () => {
			const TestComponent = ({ enabled }: { enabled: boolean }) => {
				useRegisterFrontendTool({
					name: 'conditionalTool',
					execute: () => 'test',
					argsSchema: z.object({}),
					enabled,
				});
				return null;
			};

			// Mount with enabled=false
			const { rerender } = renderHook(
				({ enabled }) => TestComponent({ enabled }),
				{
					initialProps: { enabled: false },
				}
			);

			// Tool should not be registered
			let tools = useCedarStore.getState().getRegisteredTools();
			expect(tools).toHaveLength(0);

			// Enable the tool
			rerender({ enabled: true });

			// Tool should now be registered
			tools = useCedarStore.getState().getRegisteredTools();
			expect(tools).toHaveLength(1);
			expect(tools[0].name).toBe('conditionalTool');
		});

		it('should use latest callback without re-registering', async () => {
			let callbackValue = 'initial';

			const TestComponent = () => {
				useRegisterFrontendTool({
					name: 'dynamicTool',
					execute: () => callbackValue,
					argsSchema: z.object({}),
				});
				return null;
			};

			renderHook(() => TestComponent());

			// Execute with initial value
			let result = await useCedarStore
				.getState()
				.executeTool('dynamicTool', {});
			expect(result).toBe('initial');

			// Change the callback value
			callbackValue = 'updated';

			// Execute again - should use new value without re-registering
			result = await useCedarStore.getState().executeTool('dynamicTool', {});
			expect(result).toBe('updated');
		});
	});

	describe('Tool schema conversion', () => {
		it('should convert Zod schemas to JSON schema format', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register a tool with complex schema
			act(() => {
				result.current.registerTool({
					name: 'complexTool',
					execute: (args: unknown) => args,
					argsSchema: z.object({
						name: z.string(),
						age: z.number(),
						isActive: z.boolean(),
						tags: z.array(z.string()),
					}),
				});
			});

			const tools = result.current.getRegisteredTools();
			const schema = tools[0].argsSchema;

			expect(schema).toEqual({
				type: 'object',
				properties: {
					name: { type: 'string', required: true },
					age: { type: 'number', required: true },
					isActive: { type: 'boolean', required: true },
					tags: { type: 'array', required: true },
				},
			});
		});
	});
});

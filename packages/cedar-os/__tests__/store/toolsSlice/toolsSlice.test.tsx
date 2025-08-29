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
<<<<<<< HEAD
						console.log(`Received: ${args.message}`);
=======
						return `Received: ${args.message}`;
>>>>>>> origin/main
					},
					argsSchema: z.object({
						message: z.string(),
					}),
					description: 'A test tool',
				});
			});

			// Check that tool is registered
			const tools = result.current.registeredTools;
			expect(tools.size).toBe(1);
			expect(tools.has('testTool')).toBe(true);
			expect(tools.get('testTool')?.description).toBe('A test tool');

			// Unregister the tool
			act(() => {
				result.current.unregisterTool('testTool');
			});

			// Check that tool is unregistered
			const toolsAfter = result.current.registeredTools;
			expect(toolsAfter.size).toBe(0);
		});

		it('should execute a registered tool with validation', async () => {
			const { result } = renderHook(() => useCedarStore());
			const mockExecute = jest.fn();

			// Register a tool
			act(() => {
				result.current.registerTool({
					name: 'greetingTool',
<<<<<<< HEAD
					execute: mockExecute,
=======
					execute: mockCallback,
>>>>>>> origin/main
					argsSchema: z.object({
						name: z.string(),
					}),
				});
			});

			// Execute the tool with valid arguments
			await act(async () => {
				await result.current.executeTool('greetingTool', {
					name: 'World',
				});
			});

			expect(mockExecute).toHaveBeenCalledWith({ name: 'World' });
		});

		it('should handle validation errors when executing tools', async () => {
			const { result } = renderHook(() => useCedarStore());
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

			// Register a tool with strict schema
			act(() => {
				result.current.registerTool({
					name: 'strictTool',
<<<<<<< HEAD
					execute: (args: { count: number }) => {
						console.log(args.count * 2);
					},
=======
					execute: (args: { count: number }) => args.count * 2,
>>>>>>> origin/main
					argsSchema: z.object({
						count: z.number(),
					}),
				});
			});

			// Execute with invalid arguments
			await act(async () => {
				await result.current.executeTool('strictTool', {
					count: 'not a number', // Invalid type
				});
			});

			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});
	});

	describe('useRegisterFrontendTool hook', () => {
		it('should auto-register and unregister tool on mount/unmount', () => {
			const TestComponent = () => {
				useRegisterFrontendTool({
					name: 'componentTool',
<<<<<<< HEAD
					execute: (args: { value: number }) => {
						console.log(args.value + 1);
					},
=======
					execute: (args: { value: number }) => args.value + 1,
>>>>>>> origin/main
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
			const tools = useCedarStore.getState().registeredTools;
			expect(tools.size).toBe(1);
			expect(tools.has('componentTool')).toBe(true);

			// Unmount component
			unmount();

			// Check tool is unregistered
			const toolsAfter = useCedarStore.getState().registeredTools;
			expect(toolsAfter.size).toBe(0);
		});

		it('should handle enabled flag correctly', () => {
			const TestComponent = ({ enabled }: { enabled: boolean }) => {
				useRegisterFrontendTool({
					name: 'conditionalTool',
<<<<<<< HEAD
					execute: () => console.log('test'),
=======
					execute: () => 'test',
>>>>>>> origin/main
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
			let tools = useCedarStore.getState().registeredTools;
			expect(tools.size).toBe(0);

			// Enable the tool
			rerender({ enabled: true });

			// Tool should now be registered
			tools = useCedarStore.getState().registeredTools;
			expect(tools.size).toBe(1);
			expect(tools.has('conditionalTool')).toBe(true);
		});

		it('should use latest execute function without re-registering', async () => {
			let callbackValue = 'initial';
			const mockLog = jest.spyOn(console, 'log').mockImplementation();

			const TestComponent = () => {
				useRegisterFrontendTool({
					name: 'dynamicTool',
<<<<<<< HEAD
					execute: () => console.log(callbackValue),
=======
					execute: () => callbackValue,
>>>>>>> origin/main
					argsSchema: z.object({}),
				});
				return null;
			};

			renderHook(() => TestComponent());

			// Execute with initial value
			await useCedarStore.getState().executeTool('dynamicTool', {});
			expect(mockLog).toHaveBeenCalledWith('initial');

			// Change the callback value
			callbackValue = 'updated';

			// Execute again - should use new value without re-registering
			await useCedarStore.getState().executeTool('dynamicTool', {});
			expect(mockLog).toHaveBeenCalledWith('updated');

			mockLog.mockRestore();
		});
	});

	describe('Tool error handling', () => {
		it('should handle non-existent tool execution', async () => {
			const { result } = renderHook(() => useCedarStore());
			const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

<<<<<<< HEAD
			// Try to execute a tool that doesn't exist
			await act(async () => {
				await result.current.executeTool('nonExistentTool', {});
=======
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
>>>>>>> origin/main
			});

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Tool "nonExistentTool" not found'
			);

			consoleErrorSpy.mockRestore();
		});
	});
});

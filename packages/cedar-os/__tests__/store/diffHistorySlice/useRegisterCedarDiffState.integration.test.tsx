import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
	useRegisterCedarDiffState,
	addDiffToArrayObjs,
} from '../../../src/store/diffHistoryStateSlice/useRegisterCedarDiffState';
import { CedarCopilot } from '../../../src/components/CedarCopilot';
import { useCedarStore } from '../../../src/store/CedarStore';

interface TestNode extends Record<string, unknown> {
	id: string;
	data: {
		title: string;
		diff?: 'added' | 'changed' | 'removed';
	};
}

describe('useRegisterCedarDiffState Integration', () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<CedarCopilot>{children}</CedarCopilot>
	);

	it('should register state with custom setters and apply computeState transformations', async () => {
		const mockSetNodes = jest.fn();
		const initialNodes: TestNode[] = [
			{ id: '1', data: { title: 'Node 1' } },
			{ id: '2', data: { title: 'Node 2' } },
		];

		const { result } = renderHook(
			() => {
				const [nodes, setNodes] = React.useState(initialNodes);

				// Mock setNodes to capture calls and update state
				const mockSetNodesImpl = React.useCallback(
					(newNodes: TestNode[] | ((prev: TestNode[]) => TestNode[])) => {
						if (typeof newNodes === 'function') {
							setNodes(newNodes);
						} else {
							setNodes(newNodes);
						}
						// Also call the mock to track calls
						mockSetNodes(newNodes);
					},
					[]
				);

				// Create a ref to hold the current setValue function
				const setValueRef = React.useRef(mockSetNodesImpl);

				// Update the ref whenever mockSetNodesImpl changes
				React.useEffect(() => {
					setValueRef.current = mockSetNodesImpl;
				}, [mockSetNodesImpl]);

				const diffState = useRegisterCedarDiffState({
					key: 'testNodes',
					value: nodes,
					setValue: (newNodes) => {
						// This will be replaced by enhancedSetValue
						// But we still want to track calls for testing
						mockSetNodesImpl(newNodes);
					},
					description: 'Test nodes with diff tracking',
					computeState: (oldState, newState) => {
						return addDiffToArrayObjs(oldState, newState, 'id', '/data');
					},
					customSetters: {
						addNode: {
							name: 'addNode',
							description: 'Add a new node',
							parameters: [
								{
									name: 'node',
									type: 'TestNode',
									description: 'Node to add',
								},
							],
							execute: function (currentNodes, node) {
								const newNode = node as TestNode;
								// Get the registered state's setValue
								const store = useCedarStore.getState();
								const state = store.getState('testNodes');
								if (state?.setValue) {
									const newNodes = [...(currentNodes as TestNode[]), newNode];
									state.setValue(newNodes);
								}
							},
						},
						changeNode: {
							name: 'changeNode',
							description: 'Change an existing node',
							parameters: [
								{
									name: 'updatedNode',
									type: 'TestNode',
									description: 'Updated node',
								},
							],
							execute: function (currentNodes, updatedNode) {
								const updated = updatedNode as TestNode;
								// Get the registered state's setValue
								const store = useCedarStore.getState();
								const state = store.getState('testNodes');
								if (state?.setValue) {
									state.setValue(
										(currentNodes as TestNode[]).map((node) =>
											node.id === updated.id ? updated : node
										)
									);
								}
							},
						},
					},
				});

				const store = useCedarStore();

				return { diffState, store, nodes, mockSetNodesImpl };
			},
			{ wrapper }
		);

		// Verify initial state
		expect(result.current.diffState.computedState).toEqual(initialNodes);
		expect(result.current.diffState.oldState).toEqual(initialNodes);
		expect(result.current.diffState.newState).toEqual(initialNodes);

		// Test adding a node through custom setter
		act(() => {
			const store = result.current.store;
			store.executeCustomSetter('testNodes', 'addNode', {
				id: '3',
				data: { title: 'Node 3' },
			});
		});

		// Verify the node was added with diff marker
		expect(mockSetNodes).toHaveBeenCalled();

		// The setValue should have been called at least twice (initial render + add)
		expect(mockSetNodes.mock.calls.length).toBeGreaterThanOrEqual(2);

		const lastCall =
			mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
		const addedNode = lastCall.find((n: TestNode) => n.id === '3');
		expect(addedNode).toBeDefined();
		expect(addedNode.data.diff).toBe('added');

		// Test changing a node
		act(() => {
			const store = result.current.store;
			store.executeCustomSetter('testNodes', 'changeNode', {
				id: '1',
				data: { title: 'Updated Node 1' },
			});
		});

		// Verify the node was changed with diff marker
		const changeCall =
			mockSetNodes.mock.calls[mockSetNodes.mock.calls.length - 1][0];
		const changedNode = changeCall.find((n: TestNode) => n.id === '1');
		expect(changedNode).toBeDefined();
		expect(changedNode.data.diff).toBe('changed');
		expect(changedNode.data.title).toBe('Updated Node 1');
	});

	it('should sync clean state with stateSlice registeredStates', () => {
		const mockSetValue = jest.fn();
		const initialValue = { count: 0 };

		const { result } = renderHook(
			() => {
				const [value, setValue] = React.useState(initialValue);

				React.useEffect(() => {
					mockSetValue.mockImplementation((newValue) => {
						setValue(newValue);
					});
				}, []);

				const diffState = useRegisterCedarDiffState({
					key: 'testState',
					value,
					setValue: mockSetValue,
					description: 'Test state',
				});

				const store = useCedarStore();
				const registeredState = store.getState('testState');

				return { diffState, registeredState, store };
			},
			{ wrapper }
		);

		// Verify state is registered in stateSlice
		expect(result.current.registeredState).toBeDefined();
		expect(result.current.registeredState?.key).toBe('testState');
		expect(result.current.registeredState?.value).toEqual(initialValue);

		// Update the state
		act(() => {
			mockSetValue({ count: 1 });
		});

		// Verify the registered state is updated
		const updatedState = result.current.store.getState('testState');
		expect(updatedState?.value).toEqual({ count: 1 });
	});

	it('should handle undo/redo operations and sync with setValue', () => {
		const mockSetValue = jest.fn();
		const initialValue = [1, 2, 3];

		const { result } = renderHook(
			() => {
				const [value, setValue] = React.useState(initialValue);

				const mockSetValueImpl = React.useCallback((newValue: number[]) => {
					setValue(newValue);
					mockSetValue(newValue);
				}, []);

				const diffState = useRegisterCedarDiffState({
					key: 'undoRedoTest',
					value,
					setValue: mockSetValueImpl,
					description: 'Test undo/redo',
				});

				return { ...diffState, store: useCedarStore() };
			},
			{ wrapper }
		);

		// Make a change through setCedarState to trigger the enhanced setValue
		act(() => {
			result.current.store.setCedarState('undoRedoTest', [1, 2, 3, 4]);
		});

		expect(mockSetValue).toHaveBeenLastCalledWith([1, 2, 3, 4]);

		// Undo the change
		act(() => {
			result.current.undo();
		});

		// Verify setValue was called with the previous state
		expect(mockSetValue).toHaveBeenLastCalledWith(initialValue);

		// Redo the change
		act(() => {
			result.current.redo();
		});

		// Verify setValue was called with the redone state
		expect(mockSetValue).toHaveBeenLastCalledWith([1, 2, 3, 4]);
	});

	it('should handle acceptAllDiffs and rejectAllDiffs', () => {
		const mockSetValue = jest.fn();
		const initialNodes: TestNode[] = [{ id: '1', data: { title: 'Node 1' } }];

		const { result } = renderHook(
			() => {
				const [nodes, setNodes] = React.useState(initialNodes);

				React.useEffect(() => {
					mockSetValue.mockImplementation((newNodes) => {
						setNodes(newNodes);
					});
				}, []);

				return useRegisterCedarDiffState({
					key: 'acceptRejectTest',
					value: nodes,
					setValue: mockSetValue,
					description: 'Test accept/reject',
					computeState: (oldState, newState) => {
						return addDiffToArrayObjs(oldState, newState, 'id', '/data');
					},
				});
			},
			{ wrapper }
		);

		// Add a node with diff
		const newNodes: TestNode[] = [
			...initialNodes,
			{ id: '2', data: { title: 'Node 2', diff: 'added' } },
		];

		act(() => {
			mockSetValue(newNodes);
		});

		// Accept all diffs
		act(() => {
			result.current.acceptAllDiffs();
		});

		// Verify setValue was called and diff state is synced
		expect(mockSetValue).toHaveBeenCalled();
		expect(result.current.oldState).toEqual(result.current.newState);

		// Add another change
		const changedNodes: TestNode[] = [
			{ id: '1', data: { title: 'Changed Node 1', diff: 'changed' } },
			{ id: '2', data: { title: 'Node 2' } },
		];

		act(() => {
			mockSetValue(changedNodes);
		});

		// Reject all diffs
		act(() => {
			result.current.rejectAllDiffs();
		});

		// Verify setValue was called to revert changes
		expect(mockSetValue).toHaveBeenCalled();
		expect(result.current.newState).toEqual(result.current.oldState);
	});
});

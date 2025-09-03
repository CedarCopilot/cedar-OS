import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
	useRegisterDiffState,
	addDiffToArrayObjs,
} from '../../../src/store/diffHistoryStateSlice/useRegisterDiffState';
import { CedarCopilot } from '../../../src/components/CedarCopilot';
import { useCedarStore } from '../../../src/store/CedarStore';

interface TestNode extends Record<string, unknown> {
	id: string;
	data: {
		title: string;
		diff?: 'added' | 'changed' | 'removed';
	};
}

describe('useRegisterDiffState Integration', () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<CedarCopilot>{children}</CedarCopilot>
	);

	it('should register state with custom setters and apply computeState transformations', async () => {
		const initialNodes: TestNode[] = [
			{ id: '1', data: { title: 'Node 1' } },
			{ id: '2', data: { title: 'Node 2' } },
		];

		// Register the diff state directly without React state management complexity
		const store = useCedarStore.getState();
		store.registerDiffState({
			key: 'testNodes',
			value: initialNodes,
			setValue: jest.fn(), // Mock setValue since we're not testing the actual React integration
			description: 'Test nodes with diff tracking',
			computeState: (oldState, newState) => {
				return addDiffToArrayObjs(oldState, newState, 'id', '/data');
			},
			stateSetters: {
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
					execute: function (currentNodes, setValue, args) {
						const newNode = args as TestNode;
						// Use the setValue passed to the execute function
						const newNodes = [...(currentNodes as TestNode[]), newNode];
						setValue(newNodes);
					},
				},
				changeNode: {
					name: 'changeNode',
					description: 'Change an existing node',
					parameters: [
						{
							name: 'updatedNode',
							type: 'TestNode',
							description: 'Updated node data',
						},
					],
					execute: function (currentNodes, setValue, args) {
						const updated = args as TestNode;
						// Use the setValue passed to the execute function
						const newNodes = (currentNodes as TestNode[]).map((node) =>
							node.id === updated.id ? updated : node
						);
						setValue(newNodes);
					},
				},
			},
		});

		// Get the initial diff state from the store
		const diffState = store.getDiffHistoryState<TestNode[]>('testNodes');

		// Verify initial state
		expect(diffState?.diffState.computedState).toEqual(initialNodes);
		expect(diffState?.diffState.oldState).toEqual(initialNodes);
		expect(diffState?.diffState.newState).toEqual(initialNodes);

		// Test adding a node through custom setter
		act(() => {
			store.executeStateSetter({
				key: 'testNodes',
				setterKey: 'addNode',
				args: {
					id: '3',
					data: { title: 'Node 3' },
				},
				options: {
					isDiff: true,
				},
			});
		});

		// Check the diff state after adding a node
		const updatedDiffState = store.getDiffHistoryState<TestNode[]>('testNodes');
		const computedState = updatedDiffState?.diffState.computedState;

		expect(computedState).toHaveLength(3);
		const addedNode = computedState?.find((n: TestNode) => n.id === '3');
		expect(addedNode).toBeDefined();
		expect(addedNode?.data.diff).toBe('added');

		// Test changing a node through custom setter
		act(() => {
			store.executeStateSetter({
				key: 'testNodes',
				setterKey: 'changeNode',
				args: {
					id: '2',
					data: { title: 'Updated Node 2' },
				},
				options: {
					isDiff: true,
				},
			});
		});

		// Check the diff state after changing a node
		const finalDiffState = store.getDiffHistoryState<TestNode[]>('testNodes');
		const finalComputedState = finalDiffState?.diffState.computedState;

		const changedNode = finalComputedState?.find((n: TestNode) => n.id === '2');
		expect(changedNode).toBeDefined();
		expect(changedNode?.data.diff).toBe('changed');
		expect(changedNode?.data.title).toBe('Updated Node 2');
	});

	it('should sync clean state with stateSlice registeredStates', () => {
		const initialValue = { count: 0 };

		// Register the diff state directly
		const store = useCedarStore.getState();
		store.registerDiffState({
			key: 'testState',
			value: initialValue,
			setValue: jest.fn(),
			description: 'Test state',
		});

		// Verify state is registered in stateSlice
		const registeredState = store.getState('testState');
		expect(registeredState).toBeDefined();
		expect(registeredState?.key).toBe('testState');
		expect(registeredState?.value).toEqual(initialValue);

		// Update the state through setCedarState
		act(() => {
			store.setCedarState('testState', { count: 1 });
		});

		// Verify the registered state is updated
		const updatedState = store.getState('testState');
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

				useRegisterDiffState({
					key: 'undoRedoTest',
					value,
					setValue: mockSetValueImpl,
					description: 'Test undo/redo',
				});

				return { store: useCedarStore() };
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
			result.current.store.undo('undoRedoTest');
		});

		// Verify setValue was called with the previous state
		expect(mockSetValue).toHaveBeenLastCalledWith(initialValue);

		// Redo the change
		act(() => {
			result.current.store.redo('undoRedoTest');
		});

		// Verify setValue was called with the redone state
		expect(mockSetValue).toHaveBeenLastCalledWith([1, 2, 3, 4]);
	});

	it('should handle acceptAllDiffs and rejectAllDiffs', () => {
		const initialNodes: TestNode[] = [{ id: '1', data: { title: 'Node 1' } }];

		// Register the diff state directly
		const store = useCedarStore.getState();
		store.registerDiffState({
			key: 'acceptRejectTest',
			value: initialNodes,
			setValue: jest.fn(),
			description: 'Test accept/reject',
			computeState: (oldState, newState) => {
				return addDiffToArrayObjs(oldState, newState, 'id', '/data');
			},
		});

		// Add a node by calling newDiffState directly
		const newNodes: TestNode[] = [
			...initialNodes,
			{ id: '2', data: { title: 'Node 2' } },
		];

		act(() => {
			store.newDiffState('acceptRejectTest', newNodes, true);
		});

		// Verify we're in diff mode with the added node having a diff marker
		const diffStateBeforeAccept = store.getDiffHistoryState('acceptRejectTest');
		expect(diffStateBeforeAccept?.diffState.isDiffMode).toBe(true);
		const computedBeforeAccept = diffStateBeforeAccept?.diffState
			.computedState as TestNode[];
		expect(computedBeforeAccept).toHaveLength(2);
		const addedNode = computedBeforeAccept?.find((n: TestNode) => n.id === '2');
		expect(addedNode?.data.diff).toBe('added');

		// Accept all diffs
		act(() => {
			store.acceptAllDiffs('acceptRejectTest');
		});

		// Verify diff state is synced and no longer in diff mode
		const diffState = store.getDiffHistoryState('acceptRejectTest');
		expect(diffState?.diffState.isDiffMode).toBe(false);
		expect(diffState?.diffState.oldState).toEqual(
			diffState?.diffState.newState
		);

		// Add another change
		const changedNodes: TestNode[] = [
			{ id: '1', data: { title: 'Changed Node 1' } },
			{ id: '2', data: { title: 'Node 2' } },
		];

		act(() => {
			store.newDiffState('acceptRejectTest', changedNodes, true);
		});

		// Verify we're in diff mode with the changed node having a diff marker
		const diffStateBeforeReject = store.getDiffHistoryState('acceptRejectTest');
		expect(diffStateBeforeReject?.diffState.isDiffMode).toBe(true);
		const computedBeforeReject = diffStateBeforeReject?.diffState
			.computedState as TestNode[];
		const changedNode = computedBeforeReject?.find(
			(n: TestNode) => n.id === '1'
		);
		expect(changedNode?.data.diff).toBe('changed');

		// Reject all diffs
		act(() => {
			store.rejectAllDiffs('acceptRejectTest');
		});

		// Verify changes were reverted and no longer in diff mode
		const finalDiffState = store.getDiffHistoryState('acceptRejectTest');
		expect(finalDiffState?.diffState.isDiffMode).toBe(false);
		expect(finalDiffState?.diffState.newState).toEqual(
			finalDiffState?.diffState.oldState
		);
	});
});

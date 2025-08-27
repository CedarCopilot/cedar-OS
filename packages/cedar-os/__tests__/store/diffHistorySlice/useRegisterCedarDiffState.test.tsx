import { renderHook, act } from '@testing-library/react';
import { useCedarStore } from '@/store/CedarStore';
import {
	useRegisterDiffState,
	addDiffToArrayObjs,
} from '@/store/diffHistoryStateSlice';
import { Node } from 'reactflow';

interface TestNodeData {
	title: string;
	description: string;
	diff?: 'added' | 'changed' | 'removed';
}

describe('useRegisterDiffState', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			diffHistoryStates: {},
			states: {},
		}));
	});

	describe('Basic functionality', () => {
		it('should initialize with provided value', () => {
			const initialNodes: Node<TestNodeData>[] = [
				{
					id: '1',
					type: 'test',
					position: { x: 0, y: 0 },
					data: { title: 'Node 1', description: 'Test node' },
				},
			];

			renderHook(() =>
				useRegisterDiffState({
					key: 'testNodes',
					value: initialNodes,
					description: 'Test nodes',
				})
			);

			// Check the state was registered in the store
			const diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<Node<TestNodeData>[]>('testNodes');
			expect(diffHistoryState).toBeDefined();
			expect(diffHistoryState?.diffState.computedState).toEqual(initialNodes);
			expect(diffHistoryState?.diffState.oldState).toEqual(initialNodes);
			expect(diffHistoryState?.diffState.newState).toEqual(initialNodes);
		});

		it('should track changes with computeState', () => {
			const initialNodes: Node<TestNodeData>[] = [
				{
					id: '1',
					type: 'test',
					position: { x: 0, y: 0 },
					data: { title: 'Node 1', description: 'Test node' },
				},
			];

			let currentNodes = initialNodes;
			const setNodes = (nodes: Node<TestNodeData>[]) => {
				currentNodes = nodes;
			};

			renderHook(() =>
				useRegisterDiffState({
					key: 'testNodes',
					value: currentNodes,
					setValue: setNodes,
					description: 'Test nodes',
					computeState: (oldState, newState) => {
						// Add diff markers to array objects (for Node objects, add to /data path)
						return addDiffToArrayObjs(oldState, newState, 'id', '/data');
					},
				})
			);

			// Add a new node
			const newNode: Node<TestNodeData> = {
				id: '2',
				type: 'test',
				position: { x: 100, y: 100 },
				data: { title: 'Node 2', description: 'New node' },
			};

			act(() => {
				const updatedNodes = [...currentNodes, newNode];
				// This would be called by a custom setter
				useCedarStore.getState().setDiffState('testNodes', updatedNodes, true);
			});

			// The computed state should have diff markers
			const diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<Node<TestNodeData>[]>('testNodes');
			expect(diffHistoryState?.diffState.newState).toBeDefined();

			// Check if the new node would have diff marker when computed
			const computedNodes = addDiffToArrayObjs(
				initialNodes,
				[...initialNodes, newNode],
				'id', // idField
				'/data' // diffPath for Node objects
			);
			expect(computedNodes[1].data.diff).toBe('added');
		});
	});

	describe('Undo/Redo functionality', () => {
		it('should support undo and redo operations', () => {
			const initialValue = { count: 0 };
			let currentValue = initialValue;
			const setValue = (value: typeof initialValue) => {
				currentValue = value;
			};

			renderHook(() =>
				useRegisterDiffState({
					key: 'counter',
					value: currentValue,
					setValue,
					description: 'Counter state',
				})
			);

			// Make a change
			act(() => {
				useCedarStore.getState().setDiffState('counter', { count: 1 }, true);
			});

			// Make another change
			act(() => {
				useCedarStore.getState().setDiffState('counter', { count: 2 }, true);
			});

			// Undo
			act(() => {
				const success = useCedarStore.getState().undo('counter');
				expect(success).toBe(true);
			});

			// Redo
			act(() => {
				const success = useCedarStore.getState().redo('counter');
				expect(success).toBe(true);
			});
		});
	});

	describe('Accept/Reject diffs', () => {
		it('should accept all diffs', () => {
			const initialValue = { status: 'pending' };
			renderHook(() =>
				useRegisterDiffState({
					key: 'status',
					value: initialValue,
					description: 'Status state',
				})
			);

			// Make a change
			act(() => {
				useCedarStore
					.getState()
					.setDiffState('status', { status: 'completed' }, true);
			});

			// Accept all diffs
			act(() => {
				const success = useCedarStore.getState().acceptAllDiffs('status');
				expect(success).toBe(true);
			});

			// Check that diff mode is off
			const diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState('status');
			expect(diffHistoryState?.diffState.isDiffMode).toBe(false);
		});

		it('should reject all diffs', () => {
			const initialValue = { status: 'pending' };
			renderHook(() =>
				useRegisterDiffState({
					key: 'status',
					value: initialValue,
					description: 'Status state',
				})
			);

			// Make a change
			act(() => {
				useCedarStore
					.getState()
					.setDiffState('status', { status: 'completed' }, true);
			});

			// Reject all diffs
			act(() => {
				const success = useCedarStore.getState().rejectAllDiffs('status');
				expect(success).toBe(true);
			});

			// Check that diff mode is off and state is reverted
			const diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState('status');
			expect(diffHistoryState?.diffState.isDiffMode).toBe(false);
			expect(diffHistoryState?.diffState.newState).toEqual({
				status: 'pending',
			});
		});
	});
});

describe('addDiffToArrayObjs', () => {
	it('should mark added items at root level', () => {
		const oldArray = [
			{ id: '1', name: 'Item 1' },
			{ id: '2', name: 'Item 2' },
		];
		const newArray = [
			{ id: '1', name: 'Item 1' },
			{ id: '2', name: 'Item 2' },
			{ id: '3', name: 'Item 3' },
		];

		const result = addDiffToArrayObjs(oldArray, newArray);

		expect(result[0].diff).toBeUndefined();
		expect(result[1].diff).toBeUndefined();
		expect(result[2].diff).toBe('added');
	});

	it('should mark changed items at root level', () => {
		const oldArray = [
			{ id: '1', name: 'Item 1' },
			{ id: '2', name: 'Item 2' },
		];
		const newArray = [
			{ id: '1', name: 'Item 1 Updated' },
			{ id: '2', name: 'Item 2' },
		];

		const result = addDiffToArrayObjs(oldArray, newArray);

		expect(result[0].diff).toBe('changed');
		expect(result[1].diff).toBeUndefined();
	});

	it('should use custom id field', () => {
		const oldArray = [
			{ key: 'a', value: 1 },
			{ key: 'b', value: 2 },
		];
		const newArray = [
			{ key: 'a', value: 1 },
			{ key: 'b', value: 3 },
			{ key: 'c', value: 4 },
		];

		const result = addDiffToArrayObjs(oldArray, newArray, 'key');

		expect(result[0].diff).toBeUndefined();
		expect(result[1].diff).toBe('changed');
		expect(result[2].diff).toBe('added');
	});

	it('should add diff to nested path', () => {
		const oldArray = [
			{ id: '1', data: { title: 'Node 1', status: 'active' } },
			{ id: '2', data: { title: 'Node 2', status: 'active' } },
		];
		const newArray = [
			{ id: '1', data: { title: 'Node 1', status: 'active' } },
			{ id: '2', data: { title: 'Node 2 Updated', status: 'active' } },
			{ id: '3', data: { title: 'Node 3', status: 'active' } },
		];

		const result = addDiffToArrayObjs(oldArray, newArray, 'id', '/data');

		expect(result[0].data.diff).toBeUndefined();
		expect(result[1].data.diff).toBe('changed');
		expect(result[2].data.diff).toBe('added');
	});

	it('should handle deep nested paths', () => {
		const oldArray = [{ id: '1', meta: { info: { status: 'pending' } } }];
		const newArray = [
			{ id: '1', meta: { info: { status: 'completed' } } },
			{ id: '2', meta: { info: { status: 'pending' } } },
		];

		const result = addDiffToArrayObjs(oldArray, newArray, 'id', '/meta/info');

		expect(result[0].meta.info.diff).toBe('changed');
		expect(result[1].meta.info.diff).toBe('added');
	});
});

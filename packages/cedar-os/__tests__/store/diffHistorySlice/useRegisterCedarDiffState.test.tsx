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
				useCedarStore.getState().newDiffState('testNodes', updatedNodes, true);
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

			// Verify initial state
			let diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('counter');
			expect(diffHistoryState?.diffState.newState).toEqual({ count: 0 });

			// Make a change
			act(() => {
				useCedarStore.getState().newDiffState('counter', { count: 1 }, true);
			});

			// Verify first change
			diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('counter');
			expect(diffHistoryState?.diffState.newState).toEqual({ count: 1 });

			// Make another change
			act(() => {
				useCedarStore.getState().newDiffState('counter', { count: 2 }, true);
			});

			// Verify second change
			diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('counter');
			expect(diffHistoryState?.diffState.newState).toEqual({ count: 2 });

			// Undo - should go back to count: 1
			act(() => {
				const success = useCedarStore.getState().undo('counter');
				expect(success).toBe(true);
			});

			// Verify undo reverted to previous state
			diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('counter');
			expect(diffHistoryState?.diffState.newState).toEqual({ count: 1 });

			// Redo - should go back to count: 2
			act(() => {
				const success = useCedarStore.getState().redo('counter');
				expect(success).toBe(true);
			});

			// Verify redo restored the state
			diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('counter');
			expect(diffHistoryState?.diffState.newState).toEqual({ count: 2 });
		});

		it('should handle multiple undo/redo cycles correctly', () => {
			const initialValue = { value: 'initial' };
			let currentValue = initialValue;
			const setValue = (value: typeof initialValue) => {
				currentValue = value;
			};

			renderHook(() =>
				useRegisterDiffState({
					key: 'multiCounter',
					value: currentValue,
					setValue,
					description: 'Multi-step counter state',
				})
			);

			// Create a series of changes
			const changes = [
				{ value: 'step1' },
				{ value: 'step2' },
				{ value: 'step3' },
				{ value: 'step4' },
			];

			// Apply all changes
			changes.forEach((change) => {
				act(() => {
					useCedarStore.getState().newDiffState('multiCounter', change, true);
				});

				// Verify each change was applied
				const diffHistoryState = useCedarStore
					.getState()
					.getDiffHistoryState<typeof initialValue>('multiCounter');
				expect(diffHistoryState?.diffState.newState).toEqual(change);
			});

			// Undo all changes step by step
			for (let i = changes.length - 2; i >= 0; i--) {
				act(() => {
					const success = useCedarStore.getState().undo('multiCounter');
					expect(success).toBe(true);
				});

				const diffHistoryState = useCedarStore
					.getState()
					.getDiffHistoryState<typeof initialValue>('multiCounter');
				expect(diffHistoryState?.diffState.newState).toEqual(changes[i]);
			}

			// Undo one more time to get back to initial state
			act(() => {
				const success = useCedarStore.getState().undo('multiCounter');
				expect(success).toBe(true);
			});

			let diffHistoryState = useCedarStore
				.getState()
				.getDiffHistoryState<typeof initialValue>('multiCounter');
			expect(diffHistoryState?.diffState.newState).toEqual(initialValue);

			// Redo all changes step by step
			changes.forEach((expectedChange) => {
				act(() => {
					const success = useCedarStore.getState().redo('multiCounter');
					expect(success).toBe(true);
				});

				diffHistoryState = useCedarStore
					.getState()
					.getDiffHistoryState<typeof initialValue>('multiCounter');
				expect(diffHistoryState?.diffState.newState).toEqual(expectedChange);
			});
		});

		it('should return false when trying to undo/redo beyond limits', () => {
			const initialValue = { count: 0 };
			renderHook(() =>
				useRegisterDiffState({
					key: 'limitTest',
					value: initialValue,
					description: 'Limit test state',
				})
			);

			// Try to undo when there's no history
			act(() => {
				const success = useCedarStore.getState().undo('limitTest');
				expect(success).toBe(false);
			});

			// Try to redo when there's no redo stack
			act(() => {
				const success = useCedarStore.getState().redo('limitTest');
				expect(success).toBe(false);
			});

			// Make a change
			act(() => {
				useCedarStore.getState().newDiffState('limitTest', { count: 1 }, true);
			});

			// Undo the change
			act(() => {
				const success = useCedarStore.getState().undo('limitTest');
				expect(success).toBe(true);
			});

			// Try to undo again when there's no more history
			act(() => {
				const success = useCedarStore.getState().undo('limitTest');
				expect(success).toBe(false);
			});

			// Redo the change
			act(() => {
				const success = useCedarStore.getState().redo('limitTest');
				expect(success).toBe(true);
			});

			// Try to redo again when there's no more redo stack
			act(() => {
				const success = useCedarStore.getState().redo('limitTest');
				expect(success).toBe(false);
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
					.newDiffState('status', { status: 'completed' }, true);
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
					.newDiffState('status', { status: 'completed' }, true);
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

describe('diffChecker functionality', () => {
	it('should ignore specified fields and their children when type is "ignore"', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 100, y: 100 },
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 200, y: 200 }, // This should be ignored
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = {
			type: 'ignore' as const,
			fields: ['/positionAbsolute'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should not have diff marker since positionAbsolute changes are ignored
		expect(result[0].data.diff).toBeUndefined();
	});

	it('should detect changes when non-ignored fields are modified', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 100, y: 100 },
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 10, y: 10 }, // This should be detected
				positionAbsolute: { x: 200, y: 200 }, // This should be ignored
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = {
			type: 'ignore' as const,
			fields: ['/positionAbsolute'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should have diff marker since position changes are not ignored
		expect(result[0].data.diff).toBe('changed');
	});

	it('should only detect changes in listened fields when type is "listen"', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 100, y: 100 },
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 10, y: 10 }, // This should be ignored
				positionAbsolute: { x: 100, y: 100 }, // This is what we're listening to (no change)
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = {
			type: 'listen' as const,
			fields: ['/positionAbsolute'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should not have diff marker since only positionAbsolute changes are listened to
		expect(result[0].data.diff).toBeUndefined();
	});

	it('should detect changes when listened field is modified', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 100, y: 100 },
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 10, y: 10 }, // This should be ignored
				positionAbsolute: { x: 200, y: 200 }, // This should be detected
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = {
			type: 'listen' as const,
			fields: ['/positionAbsolute'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should have diff marker since positionAbsolute changed
		expect(result[0].data.diff).toBe('changed');
	});

	it('should handle multiple ignore fields', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				positionAbsolute: { x: 100, y: 100 },
				width: 200,
				height: 150,
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 10, y: 10 }, // Should be ignored
				positionAbsolute: { x: 200, y: 200 }, // Should be ignored
				width: 300, // Should be ignored
				height: 200, // Should be ignored
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = {
			type: 'ignore' as const,
			fields: ['/position', '/positionAbsolute', '/width', '/height'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should not have diff marker since all changes are ignored
		expect(result[0].data.diff).toBeUndefined();
	});

	it('should handle child path filtering correctly', () => {
		const oldArray = [
			{
				id: '1',
				position: { x: 0, y: 0 },
				data: { title: 'Node 1', description: 'Test node' },
			},
		];
		const newArray = [
			{
				id: '1',
				position: { x: 10, y: 10 }, // Child of /position should be ignored
				data: { title: 'Node 1', description: 'Test node' },
			},
		];

		const diffChecker = { type: 'ignore' as const, fields: ['/position'] };
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		// Should not have diff marker since /position changes (including children) are ignored
		expect(result[0].data.diff).toBeUndefined();
	});

	it('should work without diffChecker (backward compatibility)', () => {
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

	it('should handle normalization of paths without leading slash', () => {
		const oldArray = [
			{
				id: '1',
				positionAbsolute: { x: 100, y: 100 },
				data: { title: 'Node 1' },
			},
		];
		const newArray = [
			{
				id: '1',
				positionAbsolute: { x: 200, y: 200 },
				data: { title: 'Node 1' },
			},
		];

		// Test with field without leading slash
		const diffChecker = {
			type: 'ignore' as const,
			fields: ['positionAbsolute'],
		};
		const result = addDiffToArrayObjs(
			oldArray,
			newArray,
			'id',
			'/data',
			diffChecker
		);

		expect(result[0].data.diff).toBeUndefined();
	});
});

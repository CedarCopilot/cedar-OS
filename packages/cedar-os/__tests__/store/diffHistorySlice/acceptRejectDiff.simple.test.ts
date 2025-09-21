import { useCedarStore } from '@/store/CedarStore';
import { addDiffToArrayObjs } from '@/store/diffHistoryStateSlice/useRegisterDiffState';

// Test data types
interface TestNode {
	id: string;
	data: {
		title: string;
		description: string;
		status: 'done' | 'planned' | 'backlog' | 'in progress';
		diff?: 'added' | 'changed' | 'removed';
	};
	position?: { x: number; y: number };
}

describe('acceptDiff and rejectDiff - Core Functionality', () => {
	const initialNodes: TestNode[] = [
		{
			id: '1',
			data: { title: 'Node 1', description: 'Original node', status: 'done' },
			position: { x: 100, y: 100 },
		},
		{
			id: '2',
			data: { title: 'Node 2', description: 'Another node', status: 'planned' },
			position: { x: 200, y: 200 },
		},
	];

	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState({ diffHistoryStates: {} });

		// Register the state with diff tracking
		useCedarStore.getState().registerDiffState({
			key: 'testNodes',
			value: initialNodes,
			setValue: () => {}, // Mock setValue
			computeState: (oldState, newState) =>
				addDiffToArrayObjs(oldState, newState, 'id', '/data'),
		});
	});

	test('should accept added node diff', () => {
		// Create new state with added node
		const newNodes: TestNode[] = [
			...initialNodes,
			{
				id: '3',
				data: {
					title: 'New Node',
					description: 'Added node',
					status: 'planned',
					diff: 'added',
				},
				position: { x: 300, y: 300 },
			},
		];

		// Trigger diff state
		useCedarStore.getState().newDiffState('testNodes', newNodes, true);

		// Verify diff state exists
		const diffState = useCedarStore.getState().getDiffHistoryState('testNodes');
		expect(diffState?.diffState.isDiffMode).toBe(true);

		// Accept the diff
		const success = useCedarStore.getState().acceptDiff('testNodes', '', 'id');
		expect(success).toBe(true);

		// Verify diff is removed and state is no longer in diff mode
		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('testNodes');
		expect(updatedState?.diffState.isDiffMode).toBe(false);

		const computedNodes = updatedState?.diffState.computedState as TestNode[];
		const addedNode = computedNodes.find((n) => n.id === '3');
		expect(addedNode?.data.diff).toBeUndefined();
		expect(computedNodes).toHaveLength(3);
	});

	test('should reject added node diff', () => {
		// Create new state with added node
		const newNodes: TestNode[] = [
			...initialNodes,
			{
				id: '3',
				data: {
					title: 'New Node',
					description: 'Added node',
					status: 'planned',
					diff: 'added',
				},
				position: { x: 300, y: 300 },
			},
		];

		// Trigger diff state
		useCedarStore.getState().newDiffState('testNodes', newNodes, true);

		// Reject the diff
		const success = useCedarStore.getState().rejectDiff('testNodes', '', 'id');
		expect(success).toBe(true);

		// Verify added node is removed
		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('testNodes');
		expect(updatedState?.diffState.isDiffMode).toBe(false);

		const computedNodes = updatedState?.diffState.computedState as TestNode[];
		expect(computedNodes.find((n) => n.id === '3')).toBeUndefined();
		expect(computedNodes).toHaveLength(2);
	});

	test('should accept changed node diff', () => {
		// Create new state with changed node
		const newNodes: TestNode[] = [
			{
				...initialNodes[0],
				data: {
					...initialNodes[0].data,
					title: 'Modified Node 1',
					description: 'Changed description',
					diff: 'changed',
				},
			},
			initialNodes[1],
		];

		// Trigger diff state
		useCedarStore.getState().newDiffState('testNodes', newNodes, true);

		// Accept the diff
		const success = useCedarStore.getState().acceptDiff('testNodes', '', 'id');
		expect(success).toBe(true);

		// Verify diff is removed and changes are kept
		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('testNodes');
		const computedNodes = updatedState?.diffState.computedState as TestNode[];
		const changedNode = computedNodes.find((n) => n.id === '1');

		expect(changedNode?.data.diff).toBeUndefined();
		expect(changedNode?.data.title).toBe('Modified Node 1');
		expect(changedNode?.data.description).toBe('Changed description');
	});

	test('should reject changed node diff', () => {
		// Create new state with changed node
		const newNodes: TestNode[] = [
			{
				...initialNodes[0],
				data: {
					...initialNodes[0].data,
					title: 'Modified Node 1',
					description: 'Changed description',
					diff: 'changed',
				},
			},
			initialNodes[1],
		];

		// Trigger diff state
		useCedarStore.getState().newDiffState('testNodes', newNodes, true);

		// Reject the diff
		const success = useCedarStore.getState().rejectDiff('testNodes', '', 'id');
		expect(success).toBe(true);

		// Verify changes are reverted to original
		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('testNodes');
		const computedNodes = updatedState?.diffState.computedState as TestNode[];
		const revertedNode = computedNodes.find((n) => n.id === '1');

		expect(revertedNode?.data.diff).toBeUndefined();
		expect(revertedNode?.data.title).toBe('Node 1'); // Original title
		expect(revertedNode?.data.description).toBe('Original node'); // Original description
	});

	test('should handle multiple diffs in single operation', () => {
		// Create state with multiple changes
		const newNodes: TestNode[] = [
			{
				...initialNodes[0],
				data: {
					...initialNodes[0].data,
					title: 'Modified Node 1',
					diff: 'changed',
				},
			},
			initialNodes[1],
			{
				id: '3',
				data: {
					title: 'New Node',
					description: 'Added node',
					status: 'planned',
					diff: 'added',
				},
				position: { x: 300, y: 300 },
			},
		];

		// Trigger diff state
		useCedarStore.getState().newDiffState('testNodes', newNodes, true);

		// Accept all diffs
		const success = useCedarStore.getState().acceptDiff('testNodes', '', 'id');
		expect(success).toBe(true);

		// Verify all diffs are processed
		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('testNodes');
		expect(updatedState?.diffState.isDiffMode).toBe(false);

		const computedNodes = updatedState?.diffState.computedState as TestNode[];
		expect(computedNodes).toHaveLength(3);
		expect(computedNodes.find((n) => n.id === '1')?.data.diff).toBeUndefined();
		expect(computedNodes.find((n) => n.id === '3')?.data.diff).toBeUndefined();
	});

	test('should return false for non-existent state key', () => {
		const success = useCedarStore
			.getState()
			.acceptDiff('nonExistent', '', 'id');
		expect(success).toBe(false);
	});

	test('should return false when not in diff mode', () => {
		useCedarStore.getState().registerDiffState({
			key: 'normalState',
			value: [{ id: '1', name: 'Item' }],
			setValue: () => {},
		});

		const success = useCedarStore
			.getState()
			.acceptDiff('normalState', '', 'id');
		expect(success).toBe(false);
	});

	test('should work with custom identification function', () => {
		const items = [
			{ id: '1', name: 'Item One' },
			{ id: '2', name: 'Item Two' },
		];

		useCedarStore.getState().registerDiffState({
			key: 'customItems',
			value: items,
			setValue: () => {},
			computeState: (oldState, newState) =>
				addDiffToArrayObjs(oldState, newState, 'id', ''),
		});

		const newItems = [...items, { id: '3', name: 'New Item', diff: 'added' }];

		useCedarStore.getState().newDiffState('customItems', newItems, true);

		// Use custom identification function
		const success = useCedarStore
			.getState()
			.acceptDiff(
				'customItems',
				'',
				(item: { id: string; name: string }) => item.id
			);
		expect(success).toBe(true);

		const updatedState = useCedarStore
			.getState()
			.getDiffHistoryState('customItems');
		const computedItems = updatedState?.diffState.computedState;
		expect(computedItems.find((i) => i.id === '3')?.diff).toBeUndefined();
	});
});

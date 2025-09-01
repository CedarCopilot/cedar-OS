import { useCedarStore } from '@/store/CedarStore';
import { addDiffToArrayObjs } from '@/store/diffHistoryStateSlice/useRegisterDiffState';

interface TestNode {
	id: string;
	data: {
		title: string;
		value: number;
		diff?: 'added' | 'changed' | 'removed';
	};
}

describe('acceptDiff and rejectDiff', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState({ diffHistoryStates: {} });
	});

	describe('acceptDiff', () => {
		test('should accept changes for items in an array', () => {
			const oldNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
				{ id: '2', data: { title: 'Node 2', value: 200 } },
			];

			const newNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1 Updated', value: 150 } }, // Changed
				{ id: '2', data: { title: 'Node 2', value: 200 } }, // Unchanged
				{ id: '3', data: { title: 'Node 3', value: 300 } }, // Added
			];

			// Register and set up diff state
			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: oldNodes,
				setValue: () => {},
			});

			// Set new state with changes
			useCedarStore.getState().newDiffState('nodes', newNodes, true);

			// Accept the diffs
			const success = useCedarStore.getState().acceptDiff('nodes', '', 'id');
			expect(success).toBe(true);

			// Check that the changes were accepted
			const diffState = useCedarStore.getState().getDiffHistoryState('nodes');
			expect(diffState?.diffState.isDiffMode).toBe(false);

			const computedNodes = diffState?.diffState.computedState as TestNode[];
			expect(computedNodes).toHaveLength(3);

			// Node 1 should have the updated values
			const node1 = computedNodes.find((n) => n.id === '1');
			expect(node1?.data.title).toBe('Node 1 Updated');
			expect(node1?.data.value).toBe(150);

			// Node 3 should be present
			const node3 = computedNodes.find((n) => n.id === '3');
			expect(node3?.data.title).toBe('Node 3');

			// oldState should be updated to match the accepted state
			expect(diffState?.diffState.oldState).toEqual(computedNodes);
		});

		test('should remove diff markers when accepting', () => {
			const oldNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
			];

			// New nodes with diff markers (as added by computeState)
			const newNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
				{ id: '2', data: { title: 'Node 2', value: 200, diff: 'added' } },
			];

			// Register with computeState that adds diff markers
			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: oldNodes,
				setValue: () => {},
				computeState: (oldState, newState) =>
					addDiffToArrayObjs(oldState, newState, 'id', '/data'),
			});

			useCedarStore.getState().newDiffState('nodes', newNodes, true);

			// Accept the diffs
			const success = useCedarStore.getState().acceptDiff('nodes', '', 'id');
			expect(success).toBe(true);

			// Check that diff markers are removed
			const diffState = useCedarStore.getState().getDiffHistoryState('nodes');
			const computedNodes = diffState?.diffState.computedState as TestNode[];

			const node2 = computedNodes.find((n) => n.id === '2');
			expect(node2?.data.diff).toBeUndefined();
		});

		test('should return false when not in diff mode', () => {
			const nodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
			];

			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: nodes,
				setValue: () => {},
			});

			// Not in diff mode
			const success = useCedarStore.getState().acceptDiff('nodes', '', 'id');
			expect(success).toBe(false);
		});

		test('should return false for non-existent state key', () => {
			const success = useCedarStore
				.getState()
				.acceptDiff('nonexistent', '', 'id');
			expect(success).toBe(false);
		});
	});

	describe('rejectDiff', () => {
		test('should reject changes and revert to old state', () => {
			const oldNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
				{ id: '2', data: { title: 'Node 2', value: 200 } },
			];

			const newNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1 Updated', value: 150 } }, // Changed
				{ id: '2', data: { title: 'Node 2', value: 200 } }, // Unchanged
				{ id: '3', data: { title: 'Node 3', value: 300 } }, // Added
			];

			// Register and set up diff state
			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: oldNodes,
				setValue: () => {},
			});

			useCedarStore.getState().newDiffState('nodes', newNodes, true);

			// Reject the diffs
			const success = useCedarStore.getState().rejectDiff('nodes', '', 'id');
			expect(success).toBe(true);

			// Check that changes were rejected
			const diffState = useCedarStore.getState().getDiffHistoryState('nodes');
			expect(diffState?.diffState.isDiffMode).toBe(false);

			const computedNodes = diffState?.diffState.computedState as TestNode[];
			expect(computedNodes).toHaveLength(2); // Added node should be removed

			// Node 1 should have the original values
			const node1 = computedNodes.find((n) => n.id === '1');
			expect(node1?.data.title).toBe('Node 1');
			expect(node1?.data.value).toBe(100);

			// Node 3 should not be present
			const node3 = computedNodes.find((n) => n.id === '3');
			expect(node3).toBeUndefined();
		});

		test('should handle multiple changes correctly', () => {
			const oldNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
				{ id: '2', data: { title: 'Node 2', value: 200 } },
				{ id: '3', data: { title: 'Node 3', value: 300 } },
			];

			const newNodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1 Updated', value: 150 } }, // Changed
				{ id: '2', data: { title: 'Node 2 Updated', value: 250 } }, // Changed
				{ id: '3', data: { title: 'Node 3', value: 300 } }, // Unchanged
				{ id: '4', data: { title: 'Node 4', value: 400 } }, // Added
			];

			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: oldNodes,
				setValue: () => {},
			});

			useCedarStore.getState().newDiffState('nodes', newNodes, true);

			// Accept the changes
			const acceptSuccess = useCedarStore
				.getState()
				.acceptDiff('nodes', '', 'id');
			expect(acceptSuccess).toBe(true);

			const acceptedState = useCedarStore
				.getState()
				.getDiffHistoryState('nodes');
			const acceptedNodes = acceptedState?.diffState
				.computedState as TestNode[];

			// All 4 nodes should be present with new values
			expect(acceptedNodes).toHaveLength(4);
			expect(acceptedNodes.find((n) => n.id === '1')?.data.value).toBe(150);
			expect(acceptedNodes.find((n) => n.id === '4')?.data.title).toBe(
				'Node 4'
			);
		});

		test('should work with custom identification function', () => {
			interface CustomNode {
				customId: string;
				name: string;
				data: {
					value: number;
				};
			}

			const oldNodes: CustomNode[] = [
				{ customId: 'a', name: 'Node A', data: { value: 10 } },
			];

			const newNodes: CustomNode[] = [
				{ customId: 'a', name: 'Node A Updated', data: { value: 20 } },
				{ customId: 'b', name: 'Node B', data: { value: 30 } },
			];

			const identificationFn = (item: CustomNode) => item.customId;

			useCedarStore.getState().registerDiffState({
				key: 'customNodes',
				value: oldNodes,
				setValue: () => {},
			});

			useCedarStore.getState().newDiffState('customNodes', newNodes, true);

			// Accept with custom identification function
			const success = useCedarStore
				.getState()
				.acceptDiff('customNodes', '', identificationFn);
			expect(success).toBe(true);

			const diffState = useCedarStore
				.getState()
				.getDiffHistoryState('customNodes');
			const computedNodes = diffState?.diffState.computedState as CustomNode[];

			expect(computedNodes).toHaveLength(2);
			expect(computedNodes.find((n) => n.customId === 'a')?.name).toBe(
				'Node A Updated'
			);
			expect(computedNodes.find((n) => n.customId === 'b')?.name).toBe(
				'Node B'
			);
		});

		test('should handle no changes gracefully', () => {
			const nodes: TestNode[] = [
				{ id: '1', data: { title: 'Node 1', value: 100 } },
			];

			useCedarStore.getState().registerDiffState({
				key: 'nodes',
				value: nodes,
				setValue: () => {},
			});

			// Set the same state (no changes)
			useCedarStore.getState().newDiffState('nodes', nodes, true);

			// Try to accept - should return false since there are no changes
			const success = useCedarStore.getState().acceptDiff('nodes', '', 'id');
			expect(success).toBe(false);
		});
	});
});

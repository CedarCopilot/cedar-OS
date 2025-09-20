import { useCedarStore } from '@/store/CedarStore';
import { act } from 'react-dom/test-utils';

/**
 * Test for the specific use case: Empty array to full array diff operations
 * This matches the exact scenario where oldState has empty attributeIds array
 * and newState has multiple items added by an agent
 */
describe('Empty to Full Array Diff Operations', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			diffHistoryStates: {},
		}));
	});

	interface NodeData {
		id: string;
		data: {
			color: string;
			label: string;
			childIds: any[];
			documents: any[];
			attributes: any[];
			attributeIds: string[];
			requirements: any[];
		};
		type: string;
		width: number;
		height: number;
		measured: {
			width: number;
			height: number;
		};
		parentId: string | null;
		position: {
			x: number;
			y: number;
		};
		expandParent: boolean;
	}

	const createEmptyState = (): NodeData[] => [
		{
			id: 'c2f5e6d2-f900-4c96-9784-784fd5ec863c',
			data: {
				color: 'Black',
				label: 'Car',
				childIds: [],
				documents: [],
				attributes: [],
				attributeIds: [], // Empty array - starting state
				requirements: [],
			},
			type: 'Part',
			width: 200,
			height: 75,
			measured: {
				width: 200,
				height: 75,
			},
			parentId: null,
			position: {
				x: 100,
				y: 100,
			},
			expandParent: false,
		},
	];

	const createFullState = (): NodeData[] => [
		{
			id: 'c2f5e6d2-f900-4c96-9784-784fd5ec863c',
			data: {
				color: 'Black',
				label: 'Car',
				childIds: [],
				documents: [],
				attributes: [],
				attributeIds: [
					'5890e4a1-ae1c-4793-8620-849c1dc7ffa0',
					'd3031380-889d-4216-96e0-1ef5cbcee54f',
					'c52ad76f-dfbb-4f7d-9cba-d37b066620ef',
					'3fa4b935-a979-43e2-a077-b79c9ec3f455',
					'132f8657-83b4-4e4a-b5f9-8c1c0c99c694',
					'862b84b4-0c3f-405a-aeec-e61280a1a26d',
					'41fb1cf0-291d-47dd-9dfa-31f25b9d616b',
					'cb695f94-37a3-4cf9-a3c7-7cea57741baf',
					'06d998a3-8ffe-4465-abbd-9896cabfc156',
					'e4713a1d-5a70-42aa-8906-160bed88cd69',
					'647d4fc7-3a9d-4725-892e-b7258f94d1f6',
					'04e82d80-bba3-4733-a5d9-5ae5a0cf3e25',
					'bc463152-1314-4856-b219-787495b5a1ed',
					'5e94866e-c6de-48c4-8b8c-2b274e9f85dd',
					'0931ffb2-0240-45e8-8e3a-12a7927deb43',
					'256ee9f6-7dfa-418a-afbd-6006d3becd8d',
				], // 16 items - all newly added by agent
				requirements: [],
			},
			type: 'Part',
			width: 200,
			height: 75,
			measured: {
				width: 200,
				height: 75,
			},
			parentId: null,
			position: {
				x: 100,
				y: 100,
			},
			expandParent: false,
		},
	];

	describe('Accept Operations', () => {
		it('should accept a single attribute from empty-to-full NESTED array scenario', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			console.log('=== NESTED PRIMITIVE ARRAY TEST ===');
			console.log(
				'Testing path: "0/data/attributeIds" (nested primitive array)'
			);
			console.log('OldState structure:', {
				nodeCount: oldState.length,
				node0_attributeIds: oldState[0].data.attributeIds,
				node0_attributeIds_length: oldState[0].data.attributeIds.length,
			});
			console.log('NewState structure:', {
				nodeCount: newState.length,
				node0_attributeIds_length: newState[0].data.attributeIds.length,
				first3_attributeIds: newState[0].data.attributeIds.slice(0, 3),
			});

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Empty to full NESTED array accept test',
				});
			});

			// Create diff (agent adds all 16 attributes)
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			// Verify initial state
			const beforeState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('Before acceptDiff:', {
				isDiffMode: beforeState?.diffState.isDiffMode,
				oldState_node0_attributeIds:
					beforeState?.diffState.oldState[0].data.attributeIds,
				newState_node0_attributeIds_length:
					beforeState?.diffState.newState[0].data.attributeIds.length,
			});

			expect(beforeState?.diffState.isDiffMode).toBe(true);
			expect(beforeState?.diffState.oldState[0].data.attributeIds).toEqual([]);
			expect(beforeState?.diffState.newState[0].data.attributeIds).toHaveLength(
				16
			);

			// Accept the first attribute (user's exact scenario)
			const attributeId = '5890e4a1-ae1c-4793-8620-849c1dc7ffa0';
			const nodeIndex = 0;

			console.log('Calling acceptDiff with:', {
				key: 'nodes',
				jsonPath: `${nodeIndex}/data/attributeIds`,
				identificationField: 'value',
				targetId: attributeId,
			});

			act(() => {
				const success = useCedarStore.getState().acceptDiff(
					'nodes',
					`${nodeIndex}/data/attributeIds`, // This is the NESTED path
					'value',
					attributeId
				);
				console.log('AcceptDiff success:', success);
				expect(success).toBe(true);
			});

			// Verify the accept worked
			const afterState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			console.log('After acceptDiff:', {
				isDiffMode: afterState?.diffState.isDiffMode,
				oldState_node0_attributeIds:
					afterState?.diffState.oldState[0].data.attributeIds,
				newState_node0_attributeIds_length:
					afterState?.diffState.newState[0].data.attributeIds.length,
			});

			// oldState should now contain the accepted attribute (nested in node[0].data.attributeIds)
			expect(afterState?.diffState.oldState[0].data.attributeIds).toEqual([
				attributeId,
			]);

			expect(afterState?.diffState.oldState[0].data.attributeIds).toHaveLength(
				1
			);

			// newState should still contain all 16 attributes
			expect(afterState?.diffState.newState[0].data.attributeIds).toHaveLength(
				16
			);
			expect(afterState?.diffState.newState[0].data.attributeIds).toContain(
				attributeId
			);

			// Should still be in diff mode (15 more attributes to accept/reject)
			expect(afterState?.diffState.isDiffMode).toBe(true);
		});

		it('should accept multiple attributes sequentially', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Multiple accept test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			const attributesToAccept = [
				'5890e4a1-ae1c-4793-8620-849c1dc7ffa0',
				'd3031380-889d-4216-96e0-1ef5cbcee54f',
				'c52ad76f-dfbb-4f7d-9cba-d37b066620ef',
			];

			// Accept multiple attributes
			attributesToAccept.forEach((attributeId, index) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.acceptDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});

				// Verify each accept
				const state = useCedarStore
					.getState()
					.getDiffHistoryState<NodeData[]>('nodes');
				expect(state?.diffState.oldState[0].data.attributeIds).toHaveLength(
					index + 1
				);
				expect(state?.diffState.oldState[0].data.attributeIds).toContain(
					attributeId
				);
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual(
				attributesToAccept
			);
			expect(finalState?.diffState.newState[0].data.attributeIds).toHaveLength(
				16
			);
		});
	});

	describe('Reject Operations', () => {
		it('should reject a single attribute from empty-to-full NESTED array scenario', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			console.log('=== NESTED PRIMITIVE ARRAY REJECT TEST ===');

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Empty to full NESTED array reject test',
				});
			});

			// Create diff (agent adds all 16 attributes)
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			// Verify initial state
			const beforeState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('Before rejectDiff:', {
				isDiffMode: beforeState?.diffState.isDiffMode,
				oldState_node0_attributeIds_length:
					beforeState?.diffState.oldState[0].data.attributeIds.length,
				newState_node0_attributeIds_length:
					beforeState?.diffState.newState[0].data.attributeIds.length,
			});

			// Reject the first attribute (user's exact scenario)
			const attributeId = '5890e4a1-ae1c-4793-8620-849c1dc7ffa0';
			const nodeIndex = 0;

			console.log('Calling rejectDiff with:', {
				key: 'nodes',
				jsonPath: `${nodeIndex}/data/attributeIds`,
				identificationField: 'value',
				targetId: attributeId,
			});

			act(() => {
				const success = useCedarStore.getState().rejectDiff(
					'nodes',
					`${nodeIndex}/data/attributeIds`, // This is the NESTED path
					'value',
					attributeId
				);
				console.log('RejectDiff success:', success);
				expect(success).toBe(true);
			});

			// Verify the reject worked
			const afterState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			console.log('After rejectDiff:', {
				isDiffMode: afterState?.diffState.isDiffMode,
				oldState_node0_attributeIds_length:
					afterState?.diffState.oldState[0].data.attributeIds.length,
				newState_node0_attributeIds_length:
					afterState?.diffState.newState[0].data.attributeIds.length,
				rejectedAttributeStillInNewState:
					afterState?.diffState.newState[0].data.attributeIds.includes(
						attributeId
					),
			});

			// oldState should remain empty (nested in node[0].data.attributeIds)
			expect(afterState?.diffState.oldState[0].data.attributeIds).toEqual([]);

			// newState should have 15 attributes (rejected one removed)
			expect(afterState?.diffState.newState[0].data.attributeIds).toHaveLength(
				15
			);
			expect(afterState?.diffState.newState[0].data.attributeIds).not.toContain(
				attributeId
			);

			// Should still be in diff mode (15 more attributes to accept/reject)
			expect(afterState?.diffState.isDiffMode).toBe(true);
		});

		it('should reject multiple attributes sequentially', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Multiple reject test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			const attributesToReject = [
				'5890e4a1-ae1c-4793-8620-849c1dc7ffa0',
				'd3031380-889d-4216-96e0-1ef5cbcee54f',
				'c52ad76f-dfbb-4f7d-9cba-d37b066620ef',
			];

			// Reject multiple attributes
			attributesToReject.forEach((attributeId, index) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.rejectDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});

				// Verify each reject
				const state = useCedarStore
					.getState()
					.getDiffHistoryState<NodeData[]>('nodes');
				expect(state?.diffState.newState[0].data.attributeIds).toHaveLength(
					16 - (index + 1)
				);
				expect(state?.diffState.newState[0].data.attributeIds).not.toContain(
					attributeId
				);
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual([]); // Still empty
			expect(finalState?.diffState.newState[0].data.attributeIds).toHaveLength(
				13
			); // 16 - 3 = 13

			// Verify none of the rejected attributes are present
			attributesToReject.forEach((attributeId) => {
				expect(
					finalState?.diffState.newState[0].data.attributeIds
				).not.toContain(attributeId);
			});
		});
	});

	describe('Mixed Operations', () => {
		it('should handle mixed accept and reject operations', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Mixed operations test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			// Accept some attributes
			const toAccept = [
				'5890e4a1-ae1c-4793-8620-849c1dc7ffa0',
				'd3031380-889d-4216-96e0-1ef5cbcee54f',
			];
			toAccept.forEach((attributeId) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.acceptDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});
			});

			// Reject some attributes
			const toReject = [
				'c52ad76f-dfbb-4f7d-9cba-d37b066620ef',
				'3fa4b935-a979-43e2-a077-b79c9ec3f455',
			];
			toReject.forEach((attributeId) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.rejectDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			// oldState should contain accepted items
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual(
				toAccept
			);

			// newState should have 14 items (16 - 2 rejected = 14)
			expect(finalState?.diffState.newState[0].data.attributeIds).toHaveLength(
				14
			);

			// newState should contain accepted items but not rejected items
			toAccept.forEach((id) => {
				expect(finalState?.diffState.newState[0].data.attributeIds).toContain(
					id
				);
			});
			toReject.forEach((id) => {
				expect(
					finalState?.diffState.newState[0].data.attributeIds
				).not.toContain(id);
			});
		});
	});

	describe('Complex Mixed Scenarios', () => {
		it('should handle partial overlap - some existing, some new, some removed', () => {
			// More realistic scenario: oldState has some attributes, newState modifies them
			const oldStateWithSomeAttributes: NodeData[] = [
				{
					id: 'c2f5e6d2-f900-4c96-9784-784fd5ec863c',
					data: {
						color: 'Black',
						label: 'Car',
						childIds: [],
						documents: [],
						attributes: [],
						attributeIds: [
							'5890e4a1-ae1c-4793-8620-849c1dc7ffa0', // Will stay
							'd3031380-889d-4216-96e0-1ef5cbcee54f', // Will stay
							'c52ad76f-dfbb-4f7d-9cba-d37b066620ef', // Will be "removed" (not in newState)
							'old-attribute-1', // Will be "removed" (not in newState)
							'old-attribute-2', // Will be "removed" (not in newState)
						],
						requirements: [],
					},
					type: 'Part',
					width: 200,
					height: 75,
					measured: { width: 200, height: 75 },
					parentId: null,
					position: { x: 100, y: 100 },
					expandParent: false,
				},
			];

			const newStateWithMixedChanges: NodeData[] = [
				{
					id: 'c2f5e6d2-f900-4c96-9784-784fd5ec863c',
					data: {
						color: 'Black',
						label: 'Car',
						childIds: [],
						documents: [],
						attributes: [],
						attributeIds: [
							'5890e4a1-ae1c-4793-8620-849c1dc7ffa0', // Existing (no change)
							'd3031380-889d-4216-96e0-1ef5cbcee54f', // Existing (no change)
							// c52ad76f-dfbb-4f7d-9cba-d37b066620ef removed
							// old-attribute-1 removed
							// old-attribute-2 removed
							'3fa4b935-a979-43e2-a077-b79c9ec3f455', // NEW - added by agent
							'132f8657-83b4-4e4a-b5f9-8c1c0c99c694', // NEW - added by agent
							'862b84b4-0c3f-405a-aeec-e61280a1a26d', // NEW - added by agent
						],
						requirements: [],
					},
					type: 'Part',
					width: 200,
					height: 75,
					measured: { width: 200, height: 75 },
					parentId: null,
					position: { x: 100, y: 100 },
					expandParent: false,
				},
			];

			console.log('=== COMPLEX MIXED SCENARIO TEST ===');
			console.log(
				'OldState attributeIds:',
				oldStateWithSomeAttributes[0].data.attributeIds
			);
			console.log(
				'NewState attributeIds:',
				newStateWithMixedChanges[0].data.attributeIds
			);

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldStateWithSomeAttributes,
					setValue: () => {},
					description: 'Complex mixed scenario test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore
					.getState()
					.newDiffState('nodes', newStateWithMixedChanges, true);
			});

			// Verify initial state
			const beforeState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('Before operations:', {
				isDiffMode: beforeState?.diffState.isDiffMode,
				oldState_attributeIds:
					beforeState?.diffState.oldState[0].data.attributeIds,
				newState_attributeIds:
					beforeState?.diffState.newState[0].data.attributeIds,
			});

			expect(beforeState?.diffState.isDiffMode).toBe(true);

			// Accept one of the NEW attributes
			const newAttributeToAccept = '3fa4b935-a979-43e2-a077-b79c9ec3f455';
			act(() => {
				const success = useCedarStore
					.getState()
					.acceptDiff(
						'nodes',
						'0/data/attributeIds',
						'value',
						newAttributeToAccept
					);
				console.log(`Accept NEW attribute ${newAttributeToAccept}: ${success}`);
				expect(success).toBe(true);
			});

			// Reject one of the NEW attributes
			const newAttributeToReject = '132f8657-83b4-4e4a-b5f9-8c1c0c99c694';
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff(
						'nodes',
						'0/data/attributeIds',
						'value',
						newAttributeToReject
					);
				console.log(`Reject NEW attribute ${newAttributeToReject}: ${success}`);
				expect(success).toBe(true);
			});

			// Try to "reject" an EXISTING attribute (this should do nothing since it was in oldState)
			const existingAttributeToReject = '5890e4a1-ae1c-4793-8620-849c1dc7ffa0';
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff(
						'nodes',
						'0/data/attributeIds',
						'value',
						existingAttributeToReject
					);
				console.log(
					`Try to reject EXISTING attribute ${existingAttributeToReject}: ${success}`
				);
				expect(success).toBe(true); // Should succeed but not change anything
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('Final state:', {
				oldState_attributeIds:
					finalState?.diffState.oldState[0].data.attributeIds,
				newState_attributeIds:
					finalState?.diffState.newState[0].data.attributeIds,
				isDiffMode: finalState?.diffState.isDiffMode,
			});

			// oldState should now include the accepted NEW attribute
			expect(finalState?.diffState.oldState[0].data.attributeIds).toContain(
				newAttributeToAccept
			);
			// oldState should still have the original existing attributes
			expect(finalState?.diffState.oldState[0].data.attributeIds).toContain(
				'5890e4a1-ae1c-4793-8620-849c1dc7ffa0'
			);
			expect(finalState?.diffState.oldState[0].data.attributeIds).toContain(
				'd3031380-889d-4216-96e0-1ef5cbcee54f'
			);

			// newState should NOT contain the rejected NEW attribute
			expect(finalState?.diffState.newState[0].data.attributeIds).not.toContain(
				newAttributeToReject
			);
			// newState should still contain the existing attributes (rejecting existing does nothing)
			expect(finalState?.diffState.newState[0].data.attributeIds).toContain(
				existingAttributeToReject
			);
			// newState should contain the accepted NEW attribute
			expect(finalState?.diffState.newState[0].data.attributeIds).toContain(
				newAttributeToAccept
			);
		});

		it('should handle adding to existing non-empty array', () => {
			const oldStateWithAttributes: NodeData[] = [
				{
					...createEmptyState()[0],
					data: {
						...createEmptyState()[0].data,
						attributeIds: ['existing-1', 'existing-2', 'existing-3'],
					},
				},
			];

			const newStateWithMoreAttributes: NodeData[] = [
				{
					...oldStateWithAttributes[0],
					data: {
						...oldStateWithAttributes[0].data,
						attributeIds: [
							'existing-1', // unchanged
							'existing-2', // unchanged
							'existing-3', // unchanged
							'new-1', // added by agent
							'new-2', // added by agent
							'new-3', // added by agent
						],
					},
				},
			];

			console.log('=== ADDING TO EXISTING NON-EMPTY ARRAY ===');

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldStateWithAttributes,
					setValue: () => {},
					description: 'Adding to existing array test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore
					.getState()
					.newDiffState('nodes', newStateWithMoreAttributes, true);
			});

			// Accept one new item
			act(() => {
				const success = useCedarStore
					.getState()
					.acceptDiff('nodes', '0/data/attributeIds', 'value', 'new-1');
				expect(success).toBe(true);
			});

			// Reject one new item
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff('nodes', '0/data/attributeIds', 'value', 'new-2');
				expect(success).toBe(true);
			});

			// Try to reject an existing item (should not remove it)
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff('nodes', '0/data/attributeIds', 'value', 'existing-1');
				expect(success).toBe(true);
			});

			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			// oldState should have: existing items + accepted new item
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual([
				'existing-1',
				'existing-2',
				'existing-3',
				'new-1',
			]);

			// newState should have: all existing + new-1 (accepted) + new-3 (not rejected) - new-2 (rejected)
			expect(finalState?.diffState.newState[0].data.attributeIds).toEqual([
				'existing-1',
				'existing-2',
				'existing-3',
				'new-1',
				'new-3',
			]);
		});

		it('should handle duplicate values in primitive arrays', () => {
			const oldStateWithDuplicates: NodeData[] = [
				{
					...createEmptyState()[0],
					data: {
						...createEmptyState()[0].data,
						attributeIds: [
							'duplicate-id',
							'unique-1',
							'duplicate-id', // Same ID appears twice
							'unique-2',
						],
					},
				},
			];

			const newStateWithMoreDuplicates: NodeData[] = [
				{
					...oldStateWithDuplicates[0],
					data: {
						...oldStateWithDuplicates[0].data,
						attributeIds: [
							'duplicate-id', // 1st occurrence (existing)
							'unique-1', // existing
							'duplicate-id', // 2nd occurrence (existing)
							'unique-2', // existing
							'duplicate-id', // 3rd occurrence (NEW)
							'new-unique', // NEW
						],
					},
				},
			];

			console.log('=== DUPLICATE VALUES TEST ===');
			console.log(
				'Old duplicates:',
				oldStateWithDuplicates[0].data.attributeIds
			);
			console.log(
				'New duplicates:',
				newStateWithMoreDuplicates[0].data.attributeIds
			);

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldStateWithDuplicates,
					setValue: () => {},
					description: 'Duplicate values test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore
					.getState()
					.newDiffState('nodes', newStateWithMoreDuplicates, true);
			});

			// Try to reject one instance of the duplicate ID
			// This should only remove the NEWLY ADDED instance, not the existing ones
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff('nodes', '0/data/attributeIds', 'value', 'duplicate-id');
				console.log('Reject duplicate-id success:', success);
				expect(success).toBe(true);
			});

			const afterRejectState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('After rejecting duplicate:', {
				oldState: afterRejectState?.diffState.oldState[0].data.attributeIds,
				newState: afterRejectState?.diffState.newState[0].data.attributeIds,
			});

			// oldState should remain unchanged (still has 2 duplicates)
			expect(
				afterRejectState?.diffState.oldState[0].data.attributeIds.filter(
					(id) => id === 'duplicate-id'
				)
			).toHaveLength(2);

			// newState should have only 2 instances of duplicate-id (original 2, new 1 removed)
			expect(
				afterRejectState?.diffState.newState[0].data.attributeIds.filter(
					(id) => id === 'duplicate-id'
				)
			).toHaveLength(2);

			// Accept the new unique item
			act(() => {
				const success = useCedarStore
					.getState()
					.acceptDiff('nodes', '0/data/attributeIds', 'value', 'new-unique');
				expect(success).toBe(true);
			});

			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			// oldState should now include the accepted unique item
			expect(finalState?.diffState.oldState[0].data.attributeIds).toContain(
				'new-unique'
			);
			// Both states should contain the accepted item
			expect(finalState?.diffState.newState[0].data.attributeIds).toContain(
				'new-unique'
			);
		});

		it('should handle removing items from existing array', () => {
			const oldStateWithManyItems: NodeData[] = [
				{
					...createEmptyState()[0],
					data: {
						...createEmptyState()[0].data,
						attributeIds: [
							'keep-1',
							'remove-me-1',
							'keep-2',
							'remove-me-2',
							'keep-3',
							'remove-me-3',
						],
					},
				},
			];

			// Agent removes some items
			const newStateWithFewerItems: NodeData[] = [
				{
					...oldStateWithManyItems[0],
					data: {
						...oldStateWithManyItems[0].data,
						attributeIds: [
							'keep-1',
							// remove-me-1 REMOVED by agent
							'keep-2',
							// remove-me-2 REMOVED by agent
							'keep-3',
							// remove-me-3 REMOVED by agent
						],
					},
				},
			];

			console.log('=== REMOVING ITEMS TEST ===');
			console.log('Old items:', oldStateWithManyItems[0].data.attributeIds);
			console.log(
				'New items (some removed):',
				newStateWithFewerItems[0].data.attributeIds
			);

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldStateWithManyItems,
					setValue: () => {},
					description: 'Removing items test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore
					.getState()
					.newDiffState('nodes', newStateWithFewerItems, true);
			});

			// The removed items should not be in newState, but should still be in oldState
			const beforeState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			expect(beforeState?.diffState.oldState[0].data.attributeIds).toContain(
				'remove-me-1'
			);
			expect(
				beforeState?.diffState.newState[0].data.attributeIds
			).not.toContain('remove-me-1');

			// Try to "accept" the removal of an item (this is a no-op since it's already removed from newState)
			act(() => {
				const success = useCedarStore
					.getState()
					.acceptDiff('nodes', '0/data/attributeIds', 'value', 'remove-me-1');
				console.log('Accept removal of remove-me-1:', success);
				// This should succeed but not change anything since the item is not in newState
			});

			// Try to "reject" the removal (bring the item back)
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff('nodes', '0/data/attributeIds', 'value', 'remove-me-1');
				console.log('Reject removal of remove-me-1:', success);
				// This should not work because rejectDiff removes items from newState, not adds them back
			});

			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');
			console.log('Final state after operations:', {
				oldState: finalState?.diffState.oldState[0].data.attributeIds,
				newState: finalState?.diffState.newState[0].data.attributeIds,
			});

			// The current system doesn't handle "undoing removals" - that would require different logic
			// For now, we just verify the behavior is consistent
			expect(finalState?.diffState.oldState[0].data.attributeIds).toContain(
				'remove-me-1'
			);
			expect(finalState?.diffState.newState[0].data.attributeIds).not.toContain(
				'remove-me-1'
			);
		});
	});

	describe('Edge Cases', () => {
		it('should handle rejecting all attributes', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Reject all test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			// Reject all attributes
			const allAttributes = newState[0].data.attributeIds;
			allAttributes.forEach((attributeId) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.rejectDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			// Both states should be empty
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual([]);
			expect(finalState?.diffState.newState[0].data.attributeIds).toEqual([]);

			// Should exit diff mode (states are now equivalent)
			expect(finalState?.diffState.isDiffMode).toBe(false);
		});

		it('should handle accepting all attributes', () => {
			const oldState = createEmptyState();
			const newState = createFullState();

			// Register diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'nodes',
					value: oldState,
					setValue: () => {},
					description: 'Accept all test',
				});
			});

			// Create diff
			act(() => {
				useCedarStore.getState().newDiffState('nodes', newState, true);
			});

			// Accept all attributes
			const allAttributes = newState[0].data.attributeIds;
			allAttributes.forEach((attributeId) => {
				act(() => {
					const success = useCedarStore
						.getState()
						.acceptDiff('nodes', '0/data/attributeIds', 'value', attributeId);
					expect(success).toBe(true);
				});
			});

			// Final verification
			const finalState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('nodes');

			// Both states should have all 16 attributes
			expect(finalState?.diffState.oldState[0].data.attributeIds).toHaveLength(
				16
			);
			expect(finalState?.diffState.newState[0].data.attributeIds).toHaveLength(
				16
			);
			expect(finalState?.diffState.oldState[0].data.attributeIds).toEqual(
				finalState?.diffState.newState[0].data.attributeIds
			);

			// Should exit diff mode (states are now equivalent)
			expect(finalState?.diffState.isDiffMode).toBe(false);
		});
	});
});

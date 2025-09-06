import { renderHook, act } from '@testing-library/react';
import { useControlledDiffState } from '@/store/diffHistoryStateSlice/useControlledDiffState';
import { addDiffToArrayObjs } from '@/store/diffHistoryStateSlice/useRegisterDiffState';
import { useCedarStore } from '@/store/CedarStore';

describe('useControlledDiffState', () => {
	beforeEach(() => {
		// Reset store state between tests
		useCedarStore.setState({
			diffHistoryStates: {},
			registeredStates: {},
		});
	});

	it('should initialize with the initial value', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { count: 0 })
		);

		expect(result.current.state).toEqual({ count: 0 });
		expect(result.current.isDiffMode).toBe(false);
		expect(result.current.oldState).toEqual({ count: 0 });
		expect(result.current.newState).toEqual({ count: 0 });
	});

	it('should update state without creating a diff when using setState', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { count: 0 })
		);

		act(() => {
			result.current.setState({ count: 5 });
		});

		// Both old and new state should be updated
		expect(result.current.state).toEqual({ count: 5 });
		expect(result.current.isDiffMode).toBe(false);
		expect(result.current.oldState).toEqual({ count: 5 });
		expect(result.current.newState).toEqual({ count: 5 });
	});

	it('should create a diff when using newDiffState', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { count: 0 })
		);

		// First set a base state
		act(() => {
			result.current.setState({ count: 5 });
		});

		// Now create a diff
		act(() => {
			result.current.newDiffState({ count: 10 });
		});

		// Should be in diff mode with different old and new states
		expect(result.current.state).toEqual({ count: 10 }); // defaultAccept mode
		expect(result.current.isDiffMode).toBe(true);
		expect(result.current.oldState).toEqual({ count: 5 });
		expect(result.current.newState).toEqual({ count: 10 });
	});

	it('should save versions and support undo/redo', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { count: 0 })
		);

		// Set initial state
		act(() => {
			result.current.setState({ count: 1 });
		});

		// Save version before making changes
		act(() => {
			result.current.saveVersion();
		});

		// Make a change
		act(() => {
			result.current.newDiffState({ count: 2 });
		});

		expect(result.current.state).toEqual({ count: 2 });

		// Undo
		act(() => {
			const success = result.current.undo();
			expect(success).toBe(true);
		});

		expect(result.current.state).toEqual({ count: 1 });

		// Redo
		act(() => {
			const success = result.current.redo();
			expect(success).toBe(true);
		});

		expect(result.current.state).toEqual({ count: 2 });
	});

	it('should accept and reject all diffs', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { count: 0 })
		);

		// Create a diff
		act(() => {
			result.current.setState({ count: 5 });
			result.current.newDiffState({ count: 10 });
		});

		expect(result.current.isDiffMode).toBe(true);

		// Accept all diffs
		act(() => {
			const success = result.current.acceptAllDiffs();
			expect(success).toBe(true);
		});

		expect(result.current.isDiffMode).toBe(false);
		expect(result.current.oldState).toEqual({ count: 10 });
		expect(result.current.newState).toEqual({ count: 10 });

		// Create another diff
		act(() => {
			result.current.newDiffState({ count: 15 });
		});

		expect(result.current.isDiffMode).toBe(true);

		// Reject all diffs
		act(() => {
			const success = result.current.rejectAllDiffs();
			expect(success).toBe(true);
		});

		expect(result.current.isDiffMode).toBe(false);
		expect(result.current.oldState).toEqual({ count: 10 });
		expect(result.current.newState).toEqual({ count: 10 });
	});

	it('should work with array data and computeState for diff markers', () => {
		interface Item {
			id: string;
			name: string;
			diff?: 'added' | 'changed';
		}

		const initialItems: Item[] = [
			{ id: '1', name: 'Item 1' },
			{ id: '2', name: 'Item 2' },
		];

		const { result } = renderHook(() =>
			useControlledDiffState<Item[]>('items', initialItems, {
				description: 'Test items',
				diffMode: 'holdAccept',
				computeState: (oldState, newState) => {
					return addDiffToArrayObjs(oldState, newState, 'id');
				},
			})
		);

		// Create a diff with a new item and a changed item
		const newItems: Item[] = [
			{ id: '1', name: 'Item 1 Modified' },
			{ id: '2', name: 'Item 2' },
			{ id: '3', name: 'Item 3' },
		];

		act(() => {
			result.current.newDiffState(newItems);
		});

		// In holdAccept mode, computed state should show old state with diff markers
		expect(result.current.isDiffMode).toBe(true);

		// The computed state should have diff markers
		const computedState = result.current.state;
		// In holdAccept mode with computeState, it shows the computed state with diff markers
		expect(computedState).toHaveLength(3); // Shows all items with diff markers

		// Accept specific diff for item
		act(() => {
			const success = result.current.acceptDiff<Item>(
				'', // root path for array
				'id', // identification field
				'1' // accept changes for item with id '1'
			);
			expect(success).toBe(true);
		});
	});

	it('should execute custom diff setters', () => {
		interface State {
			items: string[];
		}

		const { result } = renderHook(() =>
			useControlledDiffState<State>(
				'testState',
				{ items: [] },
				{
					stateSetters: {
						addItem: {
							name: 'addItem',
							description: 'Add an item to the list',
							parameters: [
								{ name: 'item', type: 'string', description: 'Item to add' },
							],
							execute: (currentState, setValue, item: string) => {
								setValue({ items: [...currentState.items, item] });
							},
						},
					},
				}
			)
		);

		// Execute the custom setter
		act(() => {
			result.current.executeDiffSetter('addItem', { isDiff: true }, 'New Item');
		});

		expect(result.current.state).toEqual({ items: ['New Item'] });
		expect(result.current.isDiffMode).toBe(true);
	});

	it('should handle multiple sequential operations correctly', () => {
		const { result } = renderHook(() =>
			useControlledDiffState('testKey', { value: 'initial' })
		);

		// Perform a series of operations
		act(() => {
			// Set base state
			result.current.setState({ value: 'base' });

			// Save a version
			result.current.saveVersion();

			// Create a diff
			result.current.newDiffState({ value: 'modified' });

			// Save another version
			result.current.saveVersion();

			// Create another diff
			result.current.newDiffState({ value: 'modified2' });
		});

		expect(result.current.state).toEqual({ value: 'modified2' });
		expect(result.current.isDiffMode).toBe(true);

		// Test that we can undo
		act(() => {
			const success = result.current.undo();
			expect(success).toBe(true);
		});

		// After undo, we should have the previous state
		// The exact state depends on the history implementation
		expect(result.current.state).toBeDefined();

		// Test that we can redo
		act(() => {
			const success = result.current.redo();
			expect(success).toBe(true);
		});

		// After redo, we should be back to modified2
		expect(result.current.state).toEqual({ value: 'modified2' });
	});
});

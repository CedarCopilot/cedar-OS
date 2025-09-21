import { act } from 'react-dom/test-utils';
import { useCedarStore } from '@/store/CedarStore';
import {
	DiffHistoryState,
	DiffState,
} from '@/store/diffHistoryStateSlice/diffHistorySlice';
import { Operation } from 'fast-json-patch';

/**
 * Comprehensive tests for the DiffHistorySlice to verify that all diff management,
 * history tracking, and undo/redo functionality works as intended.
 */

describe('DiffHistorySlice', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			diffHistoryStates: {},
		}));
	});

	describe('Core methods', () => {
		describe('getDiffHistoryState', () => {
			it('should return undefined for non-existent key', () => {
				const result = useCedarStore
					.getState()
					.getDiffHistoryState('nonExistent');
				expect(result).toBeUndefined();
			});

			it('should return the correct diff history state for existing key', () => {
				const testState: DiffHistoryState<{ count: number }> = {
					diffState: {
						oldState: { count: 0 },
						newState: { count: 1 },
						computedState: { count: 1 },
						isDiffMode: false,
						patches: [],
					},
					history: [],
					redoStack: [],
					diffMode: 'defaultAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffState('testKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getDiffHistoryState<{ count: number }>('testKey');
				expect(result).toEqual(testState);
			});
		});

		describe('setDiffState', () => {
			it('should set a new diff history state', () => {
				const testState: DiffHistoryState<string> = {
					diffState: {
						oldState: 'old',
						newState: 'new',
						computedState: 'new',
						isDiffMode: true,
						patches: [{ op: 'replace', path: '', value: 'new' }] as Operation[],
					},
					history: [],
					redoStack: [],
					diffMode: 'holdAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffState('stringKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getDiffHistoryState<string>('stringKey');
				expect(result).toEqual(testState);
			});

			it('should overwrite existing diff history state', () => {
				const initialState: DiffHistoryState<number> = {
					diffState: {
						oldState: 1,
						newState: 2,

						computedState: 2,
						isDiffMode: false,
						patches: [],
					},
					history: [],
					redoStack: [],
					diffMode: 'defaultAccept',
				};

				const updatedState: DiffHistoryState<number> = {
					diffState: {
						oldState: 2,
						newState: 3,

						computedState: 3,
						isDiffMode: true,
						patches: [],
					},
					history: [initialState.diffState],
					redoStack: [],
					diffMode: 'holdAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffState('numberKey', initialState);
					useCedarStore.getState().setDiffState('numberKey', updatedState);
				});

				const result = useCedarStore
					.getState()
					.getDiffHistoryState<number>('numberKey');
				expect(result).toEqual(updatedState);
			});
		});

		describe('getCleanState', () => {
			it('should return undefined for non-existent key', () => {
				const result = useCedarStore.getState().getCleanState('nonExistent');
				expect(result).toBeUndefined();
			});

			it('should return newState when diffMode is defaultAccept', () => {
				const testState: DiffHistoryState<{ value: string }> = {
					diffState: {
						oldState: { value: 'old' },
						newState: { value: 'new' },

						computedState: { value: 'new' },
						isDiffMode: true,
						patches: [],
					},
					history: [],
					redoStack: [],
					diffMode: 'defaultAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffState('defaultAcceptKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getCleanState<{ value: string }>('defaultAcceptKey');
				expect(result).toEqual({ value: 'new' });
			});

			it('should return oldState when diffMode is holdAccept', () => {
				const testState: DiffHistoryState<{ value: string }> = {
					diffState: {
						oldState: { value: 'old' },
						newState: { value: 'new' },

						computedState: { value: 'new' },
						isDiffMode: true,
						patches: [],
					},
					history: [],
					redoStack: [],
					diffMode: 'holdAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffState('holdAcceptKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getCleanState<{ value: string }>('holdAcceptKey');
				expect(result).toEqual({ value: 'old' });
			});
		});
	});

	describe('newDiffState', () => {
		it('should warn and return early if no existing state', () => {
			const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

			act(() => {
				useCedarStore
					.getState()
					.newDiffState('nonExistent', { value: 'new' }, true);
			});

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				'No diff history state found for key: nonExistent'
			);
			consoleWarnSpy.mockRestore();
		});

		it('should update diff state and save previous state to history', () => {
			const initialState: DiffHistoryState<{ count: number }> = {
				diffState: {
					oldState: { count: 0 },
					newState: { count: 1 },

					computedState: { count: 1 },
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('countKey', initialState);
				useCedarStore.getState().newDiffState('countKey', { count: 2 }, false);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<{ count: number }>('countKey');

			// Check that the new state is set correctly
			expect(result?.diffState.newState).toEqual({ count: 2 });
			expect(result?.diffState.oldState).toEqual({ count: 2 });
			expect(result?.diffState.isDiffMode).toBe(false);

			// Check that history contains the previous state
			expect(result?.history).toHaveLength(1);
			expect(result?.history[0]).toEqual(initialState.diffState);

			// Check that redo stack is cleared
			expect(result?.redoStack).toEqual([]);
		});

		it('should handle isDiffChange=true when not previously in diff mode', () => {
			const initialState: DiffHistoryState<{ text: string }> = {
				diffState: {
					oldState: { text: 'original' },
					newState: { text: 'modified' },

					computedState: { text: 'modified' },
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('textKey', initialState);
				useCedarStore
					.getState()
					.newDiffState('textKey', { text: 'changed' }, true);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<{ text: string }>('textKey');

			// When isDiffChange=true and not previously in diff mode, oldState should be previous newState
			expect(result?.diffState.oldState).toEqual({ text: 'modified' });
			expect(result?.diffState.newState).toEqual({ text: 'changed' });
			expect(result?.diffState.isDiffMode).toBe(true);

			// Check patches are generated
			expect(result?.diffState.patches).toBeDefined();
			expect(result?.diffState.patches?.length).toBeGreaterThan(0);
		});

		it('should handle isDiffChange=true when already in diff mode', () => {
			const initialState: DiffHistoryState<{ text: string }> = {
				diffState: {
					oldState: { text: 'original' },
					newState: { text: 'modified' },

					computedState: { text: 'modified' },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('textKey2', initialState);
				useCedarStore
					.getState()
					.newDiffState('textKey2', { text: 'changed' }, true);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<{ text: string }>('textKey2');

			// When already in diff mode, oldState should remain the same
			expect(result?.diffState.oldState).toEqual({ text: 'original' });
			expect(result?.diffState.newState).toEqual({ text: 'changed' });
			expect(result?.diffState.isDiffMode).toBe(true);
		});

		it('should clear redo stack when setting new diff state', () => {
			const initialState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,

					computedState: 2,
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [
					{
						oldState: 0,
						newState: 1,

						computedState: 1,
						isDiffMode: false,
						patches: [],
					},
				],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('redoTestKey', initialState);
				useCedarStore.getState().newDiffState('redoTestKey', 3, false);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<number>('redoTestKey');
			expect(result?.redoStack).toEqual([]);
		});
	});

	describe('acceptAllDiffs', () => {
		it('should return false if state does not exist', () => {
			const result = useCedarStore.getState().acceptAllDiffs('nonExistent');
			expect(result).toBe(false);
		});

		it('should return false if not in diff mode', () => {
			const testState: DiffHistoryState<string> = {
				diffState: {
					oldState: 'old',
					newState: 'new',

					computedState: 'new',
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('noDiffKey', testState);
			});

			const result = useCedarStore.getState().acceptAllDiffs('noDiffKey');
			expect(result).toBe(false);
		});

		it('should accept diffs by syncing newState to oldState', () => {
			const testState: DiffHistoryState<{ value: number; text: string }> = {
				diffState: {
					oldState: { value: 1, text: 'old' },
					newState: { value: 2, text: 'new' },
					computedState: { value: 2, text: 'new' },
					isDiffMode: true,
					patches: [
						{ op: 'replace', path: '/value', value: 2 },
						{ op: 'replace', path: '/text', value: 'new' },
					] as Operation[],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('acceptKey', testState);
			});

			const result = useCedarStore.getState().acceptAllDiffs('acceptKey');
			expect(result).toBe(true);

			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<{ value: number; text: string }>('acceptKey');

			// Both states should now be synced to the new value
			expect(updatedState?.diffState.oldState).toEqual({
				value: 2,
				text: 'new',
			});
			expect(updatedState?.diffState.newState).toEqual({
				value: 2,
				text: 'new',
			});
			expect(updatedState?.diffState.isDiffMode).toBe(false);
			expect(updatedState?.diffState.patches).toEqual([]);

			// History should contain the diff state (not the accepted state)
			expect(updatedState?.history).toHaveLength(1);
			expect(updatedState?.history[0]).toEqual({
				oldState: { value: 1, text: 'old' },
				newState: { value: 2, text: 'new' },
				computedState: { value: 2, text: 'new' },
				isDiffMode: true,
				patches: [
					{ op: 'replace', path: '/value', value: 2 },
					{ op: 'replace', path: '/text', value: 'new' },
				] as Operation[],
			});
		});

		it('should preserve redo stack when accepting diffs', () => {
			const redoState: DiffState<number> = {
				oldState: 0,
				newState: 1,

				computedState: 1,
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,

					computedState: 2,
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [redoState],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('acceptRedoKey', testState);
			});

			useCedarStore.getState().acceptAllDiffs('acceptRedoKey');
			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<number>('acceptRedoKey');

			expect(updatedState?.redoStack).toEqual([redoState]);
		});
	});

	describe('rejectAllDiffs', () => {
		it('should return false if state does not exist', () => {
			const result = useCedarStore.getState().rejectAllDiffs('nonExistent');
			expect(result).toBe(false);
		});

		it('should return false if not in diff mode', () => {
			const testState: DiffHistoryState<string> = {
				diffState: {
					oldState: 'old',
					newState: 'new',

					computedState: 'new',
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('noDiffRejectKey', testState);
			});

			const result = useCedarStore.getState().rejectAllDiffs('noDiffRejectKey');
			expect(result).toBe(false);
		});

		it('should reject diffs by reverting newState to oldState', () => {
			const testState: DiffHistoryState<{ value: number; text: string }> = {
				diffState: {
					oldState: { value: 1, text: 'old' },
					newState: { value: 2, text: 'new' },
					computedState: { value: 2, text: 'new' },
					isDiffMode: true,
					patches: [
						{ op: 'replace', path: '/value', value: 2 },
						{ op: 'replace', path: '/text', value: 'new' },
					] as Operation[],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('rejectKey', testState);
			});

			const result = useCedarStore.getState().rejectAllDiffs('rejectKey');
			expect(result).toBe(true);

			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<{ value: number; text: string }>('rejectKey');

			// Both states should now be synced to the old value
			expect(updatedState?.diffState.oldState).toEqual({
				value: 1,
				text: 'old',
			});
			expect(updatedState?.diffState.newState).toEqual({
				value: 1,
				text: 'old',
			});
			expect(updatedState?.diffState.isDiffMode).toBe(false);
			expect(updatedState?.diffState.patches).toEqual([]);

			// History should contain the diff state (not the rejected state)
			expect(updatedState?.history).toHaveLength(1);
			expect(updatedState?.history[0]).toEqual({
				oldState: { value: 1, text: 'old' },
				newState: { value: 2, text: 'new' },
				computedState: { value: 2, text: 'new' },
				isDiffMode: true,
				patches: [
					{ op: 'replace', path: '/value', value: 2 },
					{ op: 'replace', path: '/text', value: 'new' },
				] as Operation[],
			});
		});

		it('should preserve redo stack when rejecting diffs', () => {
			const redoState: DiffState<string> = {
				oldState: 'a',
				newState: 'b',

				computedState: 'b',
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<string> = {
				diffState: {
					oldState: 'original',
					newState: 'modified',

					computedState: 'modified',
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [redoState],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('rejectRedoKey', testState);
			});

			useCedarStore.getState().rejectAllDiffs('rejectRedoKey');
			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<string>('rejectRedoKey');

			expect(updatedState?.redoStack).toEqual([redoState]);
		});
	});

	describe('undo', () => {
		it('should return false if state does not exist', () => {
			const result = useCedarStore.getState().undo('nonExistent');
			expect(result).toBe(false);
		});

		it('should return false if history is empty', () => {
			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,

					computedState: 2,
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('emptyHistoryKey', testState);
			});

			const result = useCedarStore.getState().undo('emptyHistoryKey');
			expect(result).toBe(false);
		});

		it('should restore previous state from history', () => {
			const historicalState: DiffState<{ count: number }> = {
				oldState: { count: 0 },
				newState: { count: 1 },

				computedState: { count: 1 },
				isDiffMode: false,
				patches: [],
			};

			const currentState: DiffState<{ count: number }> = {
				oldState: { count: 1 },
				newState: { count: 2 },

				computedState: { count: 2 },
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<{ count: number }> = {
				diffState: currentState,
				history: [historicalState],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('undoKey', testState);
			});

			const result = useCedarStore.getState().undo('undoKey');
			expect(result).toBe(true);

			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<{ count: number }>('undoKey');

			// Current state should be the historical state
			expect(updatedState?.diffState).toEqual(historicalState);

			// History should be empty
			expect(updatedState?.history).toEqual([]);

			// Redo stack should contain the previous current state
			expect(updatedState?.redoStack).toEqual([currentState]);
		});

		it('should handle multiple undo operations', () => {
			const state1: DiffState<number> = {
				oldState: 0,
				newState: 1,

				computedState: 1,
				isDiffMode: false,
				patches: [],
			};

			const state2: DiffState<number> = {
				oldState: 1,
				newState: 2,

				computedState: 2,
				isDiffMode: false,
				patches: [],
			};

			const state3: DiffState<number> = {
				oldState: 2,
				newState: 3,

				computedState: 3,
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<number> = {
				diffState: state3,
				history: [state1, state2],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('multiUndoKey', testState);
			});

			// First undo
			useCedarStore.getState().undo('multiUndoKey');
			let updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<number>('multiUndoKey');
			expect(updatedState?.diffState).toEqual(state2);
			expect(updatedState?.history).toEqual([state1]);
			expect(updatedState?.redoStack).toEqual([state3]);

			// Second undo
			useCedarStore.getState().undo('multiUndoKey');
			updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<number>('multiUndoKey');
			expect(updatedState?.diffState).toEqual(state1);
			expect(updatedState?.history).toEqual([]);
			expect(updatedState?.redoStack).toEqual([state3, state2]);
		});
	});

	describe('redo', () => {
		it('should return false if state does not exist', () => {
			const result = useCedarStore.getState().redo('nonExistent');
			expect(result).toBe(false);
		});

		it('should return false if redo stack is empty', () => {
			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,

					computedState: 2,
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('emptyRedoKey', testState);
			});

			const result = useCedarStore.getState().redo('emptyRedoKey');
			expect(result).toBe(false);
		});

		it('should return false if redo stack is undefined', () => {
			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,

					computedState: 2,
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('undefinedRedoKey', testState);
			});

			const result = useCedarStore.getState().redo('undefinedRedoKey');
			expect(result).toBe(false);
		});

		it('should restore state from redo stack', () => {
			const currentState: DiffState<{ text: string }> = {
				oldState: { text: 'current old' },
				newState: { text: 'current new' },

				computedState: { text: 'current new' },
				isDiffMode: false,
				patches: [],
			};

			const redoState: DiffState<{ text: string }> = {
				oldState: { text: 'redo old' },
				newState: { text: 'redo new' },

				computedState: { text: 'redo new' },
				isDiffMode: true,
				patches: [],
			};

			const testState: DiffHistoryState<{ text: string }> = {
				diffState: currentState,
				history: [],
				redoStack: [redoState],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('redoKey', testState);
			});

			const result = useCedarStore.getState().redo('redoKey');
			expect(result).toBe(true);

			const updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<{ text: string }>('redoKey');

			// Current state should be the redo state
			expect(updatedState?.diffState).toEqual(redoState);

			// History should contain the previous current state
			expect(updatedState?.history).toEqual([currentState]);

			// Redo stack should be empty
			expect(updatedState?.redoStack).toEqual([]);
		});

		it('should handle multiple redo operations', () => {
			const currentState: DiffState<number> = {
				oldState: 1,
				newState: 2,

				computedState: 2,
				isDiffMode: false,
				patches: [],
			};

			const redoState1: DiffState<number> = {
				oldState: 2,
				newState: 3,

				computedState: 3,
				isDiffMode: false,
				patches: [],
			};

			const redoState2: DiffState<number> = {
				oldState: 3,
				newState: 4,

				computedState: 4,
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<number> = {
				diffState: currentState,
				history: [],
				redoStack: [redoState2, redoState1], // Note: Stack order - last item is popped first
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('multiRedoKey', testState);
			});

			// First redo
			useCedarStore.getState().redo('multiRedoKey');
			let updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<number>('multiRedoKey');
			expect(updatedState?.diffState).toEqual(redoState1);
			expect(updatedState?.history).toEqual([currentState]);
			expect(updatedState?.redoStack).toEqual([redoState2]);

			// Second redo
			useCedarStore.getState().redo('multiRedoKey');
			updatedState = useCedarStore
				.getState()
				.getDiffHistoryState<number>('multiRedoKey');
			expect(updatedState?.diffState).toEqual(redoState2);
			expect(updatedState?.history).toEqual([currentState, redoState1]);
			expect(updatedState?.redoStack).toEqual([]);
		});
	});

	describe('Integration tests', () => {
		it('should handle a complete workflow: set diff, accept, undo, redo', () => {
			interface TestData {
				name: string;
				age: number;
			}

			const initialState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { name: 'Alice', age: 25 },
					newState: { name: 'Alice', age: 25 },
					computedState: { name: 'Alice', age: 25 },
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('workflowKey', initialState);
			});

			// Step 1: Set a diff state
			act(() => {
				useCedarStore
					.getState()
					.newDiffState('workflowKey', { name: 'Bob', age: 30 }, true);
			});

			let state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('workflowKey');
			expect(state?.diffState.isDiffMode).toBe(true);
			expect(state?.diffState.newState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.history).toHaveLength(1);

			// Step 2: Accept the diffs
			act(() => {
				useCedarStore.getState().acceptAllDiffs('workflowKey');
			});

			state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('workflowKey');
			expect(state?.diffState.isDiffMode).toBe(false);
			expect(state?.diffState.oldState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.diffState.newState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.history).toHaveLength(2);

			// Check what's actually in history after accepting
			// History should contain: initial state and the diff state (not the accepted state)
			expect(state?.history[0]).toEqual({
				oldState: { name: 'Alice', age: 25 },
				newState: { name: 'Alice', age: 25 },
				computedState: { name: 'Alice', age: 25 },
				isDiffMode: false,
				patches: [],
			});
			// The second item in history should be the diff state that was saved before accepting
			expect(state?.history[1]).toEqual({
				oldState: { name: 'Alice', age: 25 },
				newState: { name: 'Bob', age: 30 },
				computedState: { name: 'Bob', age: 30 },
				isDiffMode: true,
				patches: expect.any(Array),
			});

			// Step 3: Undo the accept
			// After fixing the implementation, undo should restore the diff state
			act(() => {
				useCedarStore.getState().undo('workflowKey');
			});

			state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('workflowKey');
			// Undo should restore the diff state that was saved to history before accepting
			expect(state?.diffState.isDiffMode).toBe(true);
			expect(state?.diffState.oldState).toEqual({ name: 'Alice', age: 25 });
			expect(state?.diffState.newState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.redoStack).toHaveLength(1);

			// Step 4: Redo the accept
			act(() => {
				useCedarStore.getState().redo('workflowKey');
			});

			state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('workflowKey');
			expect(state?.diffState.isDiffMode).toBe(false);
			expect(state?.diffState.oldState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.diffState.newState).toEqual({ name: 'Bob', age: 30 });
			expect(state?.redoStack).toHaveLength(0);
		});

		it('should handle reject workflow with undo/redo', () => {
			interface TestData {
				status: string;
				count: number;
			}

			const initialState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { status: 'active', count: 10 },
					newState: { status: 'pending', count: 15 },
					computedState: { status: 'pending', count: 15 },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('rejectWorkflowKey', initialState);
			});

			// Step 1: Reject the diffs
			act(() => {
				useCedarStore.getState().rejectAllDiffs('rejectWorkflowKey');
			});

			let state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('rejectWorkflowKey');
			expect(state?.diffState.isDiffMode).toBe(false);
			expect(state?.diffState.oldState).toEqual({
				status: 'active',
				count: 10,
			});
			expect(state?.diffState.newState).toEqual({
				status: 'active',
				count: 10,
			});

			// Step 2: Undo the reject
			// After fixing the implementation, undo should restore the diff state
			act(() => {
				useCedarStore.getState().undo('rejectWorkflowKey');
			});

			state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('rejectWorkflowKey');
			// Undo should restore the diff state that was saved to history before rejecting
			expect(state?.diffState.isDiffMode).toBe(true);
			expect(state?.diffState.oldState).toEqual({
				status: 'active',
				count: 10,
			});
			expect(state?.diffState.newState).toEqual({
				status: 'pending',
				count: 15,
			});

			// Step 3: Redo the reject
			act(() => {
				useCedarStore.getState().redo('rejectWorkflowKey');
			});

			state = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('rejectWorkflowKey');
			expect(state?.diffState.isDiffMode).toBe(false);
			expect(state?.diffState.oldState).toEqual({
				status: 'active',
				count: 10,
			});
			expect(state?.diffState.newState).toEqual({
				status: 'active',
				count: 10,
			});
		});

		it('should generate correct patches when setting diff state', () => {
			interface ComplexData {
				user: {
					name: string;
					email: string;
				};
				settings: {
					theme: string;
					notifications: boolean;
				};
			}

			const initialState: DiffHistoryState<ComplexData> = {
				diffState: {
					oldState: {
						user: { name: 'John', email: 'john@example.com' },
						settings: { theme: 'light', notifications: true },
					},
					newState: {
						user: { name: 'John', email: 'john@example.com' },
						settings: { theme: 'light', notifications: true },
					},
					computedState: {
						user: { name: 'John', email: 'john@example.com' },
						settings: { theme: 'light', notifications: true },
					},
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('patchKey', initialState);
			});

			// Make changes that should generate patches
			const newData: ComplexData = {
				user: { name: 'Jane', email: 'jane@example.com' },
				settings: { theme: 'dark', notifications: true },
			};

			act(() => {
				useCedarStore.getState().newDiffState('patchKey', newData, true);
			});

			const state = useCedarStore
				.getState()
				.getDiffHistoryState<ComplexData>('patchKey');

			// Check that patches were generated
			expect(state?.diffState.patches).toBeDefined();
			expect(state?.diffState.patches?.length).toBeGreaterThan(0);

			// Verify patch operations
			const patches = state?.diffState.patches || [];
			const patchPaths = patches.map((p) => p.path);

			// Should have patches for the changed fields
			expect(patchPaths).toContain('/user/name');
			expect(patchPaths).toContain('/user/email');
			expect(patchPaths).toContain('/settings/theme');

			// Should not have patch for unchanged field
			expect(patchPaths).not.toContain('/settings/notifications');
		});
	});

	describe('isDiffMode auto-correction for equivalent states', () => {
		it('should set isDiffMode to false when oldState and newState are equivalent via setDiffState', () => {
			interface TestData {
				name: string;
				value: number;
			}

			// Create a state where oldState and newState are equivalent but isDiffMode is incorrectly set to true
			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { name: 'test', value: 42 },
					newState: { name: 'test', value: 42 }, // Same as oldState
					computedState: { name: 'test', value: 42 },
					isDiffMode: true, // This should be corrected to false
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('equivalentStatesKey', testState);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('equivalentStatesKey');

			// isDiffMode should be automatically corrected to false
			expect(result?.diffState.isDiffMode).toBe(false);
			expect(result?.diffState.oldState).toEqual({ name: 'test', value: 42 });
			expect(result?.diffState.newState).toEqual({ name: 'test', value: 42 });
		});

		it('should set isDiffMode to false when states become equivalent via newDiffState', () => {
			interface TestData {
				count: number;
				status: string;
			}

			// Start with different states
			const initialState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { count: 1, status: 'pending' },
					newState: { count: 2, status: 'active' },
					computedState: { count: 2, status: 'active' },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('becomingEquivalentKey', initialState);
			});

			// Update newState to match oldState - should auto-correct isDiffMode
			act(() => {
				useCedarStore
					.getState()
					.newDiffState(
						'becomingEquivalentKey',
						{ count: 1, status: 'pending' },
						true
					);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('becomingEquivalentKey');

			// isDiffMode should be automatically set to false since states are now equivalent
			expect(result?.diffState.isDiffMode).toBe(false);
			expect(result?.diffState.oldState).toEqual({
				count: 1,
				status: 'pending',
			}); // Should match newState when equivalent
			expect(result?.diffState.newState).toEqual({
				count: 1,
				status: 'pending',
			}); // New state
		});

		it('should set isDiffMode to false when states become equivalent via applyPatchesToDiffState', () => {
			interface TestData {
				name: string;
				items: string[];
			}

			// Start with different states
			const initialState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { name: 'original', items: ['a', 'b'] },
					newState: { name: 'modified', items: ['x', 'y', 'z'] },
					computedState: { name: 'modified', items: ['x', 'y', 'z'] },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('patchEquivalentKey', initialState);
			});

			// Apply patches that make newState match oldState
			const patches: Operation[] = [
				{ op: 'replace', path: '/name', value: 'original' },
				{ op: 'replace', path: '/items', value: ['a', 'b'] },
			];

			act(() => {
				useCedarStore
					.getState()
					.applyPatchesToDiffState('patchEquivalentKey', patches, true);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('patchEquivalentKey');

			// isDiffMode should be automatically set to false since states are now equivalent
			expect(result?.diffState.isDiffMode).toBe(false);
			expect(result?.diffState.oldState).toEqual({
				name: 'original',
				items: ['a', 'b'],
			}); // Should match newState when equivalent
			expect(result?.diffState.newState).toEqual({
				name: 'original',
				items: ['a', 'b'],
			}); // After patches
		});

		it('should handle deep object equivalence correctly', () => {
			interface ComplexData {
				user: {
					profile: {
						name: string;
						settings: {
							theme: string;
							notifications: boolean;
						};
					};
				};
				metadata: Record<string, unknown>;
			}

			const complexObject: ComplexData = {
				user: {
					profile: {
						name: 'John',
						settings: {
							theme: 'dark',
							notifications: true,
						},
					},
				},
				metadata: { version: 1, tags: ['a', 'b'] },
			};

			// Create state with identical deep objects but isDiffMode incorrectly set to true
			const testState: DiffHistoryState<ComplexData> = {
				diffState: {
					oldState: complexObject,
					newState: { ...complexObject }, // Deep copy to ensure different references but same content
					computedState: { ...complexObject },
					isDiffMode: true, // Should be corrected to false
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('deepEquivalenceKey', testState);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<ComplexData>('deepEquivalenceKey');

			// isDiffMode should be corrected to false despite different object references
			expect(result?.diffState.isDiffMode).toBe(false);
			expect(result?.diffState.oldState).toEqual(complexObject);
			expect(result?.diffState.newState).toEqual(complexObject);
		});

		it('should maintain isDiffMode true when states are actually different', () => {
			interface TestData {
				value: string;
				count: number;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { value: 'old', count: 1 },
					newState: { value: 'new', count: 2 }, // Different from oldState
					computedState: { value: 'new', count: 2 },
					isDiffMode: true, // Should remain true
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('differentStatesKey', testState);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('differentStatesKey');

			// isDiffMode should remain true since states are different
			expect(result?.diffState.isDiffMode).toBe(true);
			expect(result?.diffState.oldState).toEqual({ value: 'old', count: 1 });
			expect(result?.diffState.newState).toEqual({ value: 'new', count: 2 });
		});

		it('should handle null and undefined values correctly', () => {
			interface TestData {
				value: string | null;
				optional?: number;
			}

			// Test with null values
			const testState1: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { value: null },
					newState: { value: null }, // Same as oldState
					computedState: { value: null },
					isDiffMode: true, // Should be corrected
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('nullValuesKey', testState1);
			});

			const result1 = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('nullValuesKey');

			expect(result1?.diffState.isDiffMode).toBe(false);

			// Test with undefined values
			const testState2: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { value: 'test' }, // optional is undefined
					newState: { value: 'test' }, // optional is undefined
					computedState: { value: 'test' },
					isDiffMode: true, // Should be corrected
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('undefinedValuesKey', testState2);
			});

			const result2 = useCedarStore
				.getState()
				.getDiffHistoryState<TestData>('undefinedValuesKey');

			expect(result2?.diffState.isDiffMode).toBe(false);
		});

		it('should handle array equivalence correctly', () => {
			interface ArrayData {
				items: Array<{ id: number; name: string }>;
				tags: string[];
			}

			const arrayData: ArrayData = {
				items: [
					{ id: 1, name: 'Item 1' },
					{ id: 2, name: 'Item 2' },
				],
				tags: ['tag1', 'tag2', 'tag3'],
			};

			const testState: DiffHistoryState<ArrayData> = {
				diffState: {
					oldState: arrayData,
					newState: {
						items: [
							{ id: 1, name: 'Item 1' },
							{ id: 2, name: 'Item 2' },
						],
						tags: ['tag1', 'tag2', 'tag3'],
					}, // Same content, different reference
					computedState: { ...arrayData },
					isDiffMode: true, // Should be corrected
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('arrayEquivalenceKey', testState);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<ArrayData>('arrayEquivalenceKey');

			expect(result?.diffState.isDiffMode).toBe(false);
		});
	});
});

describe('applyPatchesToDiffState', () => {
	it('should warn and return early if no existing state', () => {
		const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
		const patches: Operation[] = [
			{ op: 'add', path: '/newField', value: 'test' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('nonExistent', patches, true);
		});

		expect(consoleWarnSpy).toHaveBeenCalledWith(
			'No diff history state found for key: nonExistent'
		);
		consoleWarnSpy.mockRestore();
	});

	it('should apply patches to newState and update diff state', () => {
		interface TestData {
			name: string;
			age: number;
			items?: string[];
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { name: 'Alice', age: 25 },
				newState: { name: 'Alice', age: 25 },
				computedState: { name: 'Alice', age: 25 },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('patchApplyKey', initialState);
		});

		// Apply patches to modify the state
		const patches: Operation[] = [
			{ op: 'replace', path: '/name', value: 'Bob' },
			{ op: 'replace', path: '/age', value: 30 },
			{ op: 'add', path: '/items', value: ['item1', 'item2'] },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('patchApplyKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('patchApplyKey');

		// Check that patches were applied to newState
		expect(result?.diffState.newState).toEqual({
			name: 'Bob',
			age: 30,
			items: ['item1', 'item2'],
		});

		// oldState should remain unchanged since isDiffChange is false
		expect(result?.diffState.oldState).toEqual({ name: 'Alice', age: 25 });

		// Should not be in diff mode
		expect(result?.diffState.isDiffMode).toBe(false);

		// History should contain the original state
		expect(result?.history).toHaveLength(1);
		expect(result?.history[0]).toEqual(initialState.diffState);

		// Redo stack should be cleared
		expect(result?.redoStack).toEqual([]);
	});

	it('should handle array operations correctly', () => {
		interface ArrayTestData {
			nodes: Array<{ id: string; name: string }>;
			tags: string[];
		}

		const initialState: DiffHistoryState<ArrayTestData> = {
			diffState: {
				oldState: {
					nodes: [
						{ id: '1', name: 'Node 1' },
						{ id: '2', name: 'Node 2' },
					],
					tags: ['tag1', 'tag2'],
				},
				newState: {
					nodes: [
						{ id: '1', name: 'Node 1' },
						{ id: '2', name: 'Node 2' },
					],
					tags: ['tag1', 'tag2'],
				},
				computedState: {
					nodes: [
						{ id: '1', name: 'Node 1' },
						{ id: '2', name: 'Node 2' },
					],
					tags: ['tag1', 'tag2'],
				},
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('arrayPatchKey', initialState);
		});

		// Apply patches for array operations
		const patches: Operation[] = [
			// Add to end of array using -
			{ op: 'add', path: '/nodes/-', value: { id: '3', name: 'Node 3' } },
			// Remove first tag
			{ op: 'remove', path: '/tags/0' },
			// Replace a node's name
			{ op: 'replace', path: '/nodes/1/name', value: 'Updated Node 2' },
			// Add a new tag at specific index
			{ op: 'add', path: '/tags/1', value: 'tag3' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('arrayPatchKey', patches, true);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<ArrayTestData>('arrayPatchKey');

		// Verify array operations were applied correctly
		expect(result?.diffState.newState.nodes).toEqual([
			{ id: '1', name: 'Node 1' },
			{ id: '2', name: 'Updated Node 2' },
			{ id: '3', name: 'Node 3' },
		]);

		expect(result?.diffState.newState.tags).toEqual(['tag2', 'tag3']);

		// Since isDiffChange is true and not previously in diff mode,
		// oldState should be the previous newState
		expect(result?.diffState.oldState).toEqual({
			nodes: [
				{ id: '1', name: 'Node 1' },
				{ id: '2', name: 'Node 2' },
			],
			tags: ['tag1', 'tag2'],
		});

		expect(result?.diffState.isDiffMode).toBe(true);
	});

	it('should handle complex nested patches', () => {
		interface ComplexData {
			user: {
				profile: {
					name: string;
					settings: {
						theme: string;
						notifications: {
							email: boolean;
							push: boolean;
						};
					};
				};
			};
			data: Record<string, unknown>;
		}

		const initialState: DiffHistoryState<ComplexData> = {
			diffState: {
				oldState: {
					user: {
						profile: {
							name: 'John',
							settings: {
								theme: 'light',
								notifications: {
									email: true,
									push: false,
								},
							},
						},
					},
					data: { key1: 'value1' },
				},
				newState: {
					user: {
						profile: {
							name: 'John',
							settings: {
								theme: 'light',
								notifications: {
									email: true,
									push: false,
								},
							},
						},
					},
					data: { key1: 'value1' },
				},
				computedState: {
					user: {
						profile: {
							name: 'John',
							settings: {
								theme: 'light',
								notifications: { email: true, push: false },
							},
						},
					},
					data: { key1: 'value1' },
				},
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'holdAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('complexPatchKey', initialState);
		});

		// Apply complex nested patches
		const patches: Operation[] = [
			{ op: 'replace', path: '/user/profile/name', value: 'Jane' },
			{ op: 'replace', path: '/user/profile/settings/theme', value: 'dark' },
			{
				op: 'replace',
				path: '/user/profile/settings/notifications/push',
				value: true,
			},
			{ op: 'add', path: '/data/key2', value: 'value2' },
			{ op: 'remove', path: '/data/key1' },
			{ op: 'add', path: '/data/nested', value: { deep: { value: 123 } } },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('complexPatchKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<ComplexData>('complexPatchKey');

		// Verify complex patches were applied correctly
		expect(result?.diffState.newState).toEqual({
			user: {
				profile: {
					name: 'Jane',
					settings: {
						theme: 'dark',
						notifications: {
							email: true,
							push: true,
						},
					},
				},
			},
			data: {
				key2: 'value2',
				nested: { deep: { value: 123 } },
			},
		});

		// oldState should remain unchanged since isDiffChange is false
		expect(result?.diffState.oldState).toEqual(initialState.diffState.oldState);
	});

	it('should maintain isDiffChange behavior consistent with setDiffState', () => {
		interface TestData {
			value: number;
		}

		// Test 1: isDiffChange=true when not previously in diff mode
		const initialState1: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 1 },
				newState: { value: 2 },

				computedState: { value: 2 },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('diffBehaviorKey1', initialState1);
		});

		const patches1: Operation[] = [{ op: 'replace', path: '/value', value: 3 }];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('diffBehaviorKey1', patches1, true);
		});

		const result1 = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('diffBehaviorKey1');

		// When isDiffChange=true and not previously in diff mode,
		// oldState should be previous newState
		expect(result1?.diffState.oldState).toEqual({ value: 2 });
		expect(result1?.diffState.newState).toEqual({ value: 3 });
		expect(result1?.diffState.isDiffMode).toBe(true);

		// Test 2: isDiffChange=true when already in diff mode
		const initialState2: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 10 },
				newState: { value: 20 },

				computedState: { value: 20 },
				isDiffMode: true,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'holdAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('diffBehaviorKey2', initialState2);
		});

		const patches2: Operation[] = [
			{ op: 'replace', path: '/value', value: 30 },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('diffBehaviorKey2', patches2, true);
		});

		const result2 = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('diffBehaviorKey2');

		// When already in diff mode, oldState should remain the same
		expect(result2?.diffState.oldState).toEqual({ value: 10 });
		expect(result2?.diffState.newState).toEqual({ value: 30 });
		expect(result2?.diffState.isDiffMode).toBe(true);
	});

	it('should generate correct diff patches after applying input patches', () => {
		interface TestData {
			name: string;
			count: number;
			items: string[];
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { name: 'Original', count: 0, items: [] },
				newState: { name: 'Modified', count: 5, items: ['a', 'b'] },
				computedState: { name: 'Modified', count: 5, items: ['a', 'b'] },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('diffPatchGenKey', initialState);
		});

		const inputPatches: Operation[] = [
			{ op: 'replace', path: '/count', value: 10 },
			{ op: 'add', path: '/items/-', value: 'c' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('diffPatchGenKey', inputPatches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('diffPatchGenKey');

		// Verify that diff patches are generated between oldState and new patched state
		expect(result?.diffState.patches).toBeDefined();
		expect(result?.diffState.patches?.length).toBeGreaterThan(0);

		// The patches should describe the changes from oldState to newState
		const patchPaths = result?.diffState.patches?.map((p) => p.path) || [];

		// Should contain count change from 0 to 10
		expect(patchPaths).toContain('/count');

		// Should contain array item patches (specific indices, not just '/items')
		// When comparing [] to ['a', 'b', 'c'], we get individual item additions
		expect(patchPaths.some((path) => path.startsWith('/items/'))).toBe(true);
	});

	it('should clear redo stack when applying patches', () => {
		interface TestData {
			value: string;
		}

		const redoState: DiffState<TestData> = {
			oldState: { value: 'redo-old' },
			newState: { value: 'redo-new' },

			computedState: { value: 'redo-new' },
			isDiffMode: false,
			patches: [],
		};

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 'current-old' },
				newState: { value: 'current-new' },

				computedState: { value: 'current-new' },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [redoState],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('redoClearKey', initialState);
		});

		const patches: Operation[] = [
			{ op: 'replace', path: '/value', value: 'patched' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('redoClearKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('redoClearKey');

		// Redo stack should be cleared after applying patches
		expect(result?.redoStack).toEqual([]);
	});

	it('should save original diffState to history before applying patches', () => {
		interface TestData {
			id: number;
			status: string;
		}

		const originalDiffState: DiffState<TestData> = {
			oldState: { id: 1, status: 'pending' },
			newState: { id: 1, status: 'active' },
			computedState: { id: 1, status: 'active' },
			isDiffMode: true,
			patches: [
				{ op: 'replace', path: '/status', value: 'active' },
			] as Operation[],
		};

		const initialState: DiffHistoryState<TestData> = {
			diffState: originalDiffState,
			history: [],
			redoStack: [],
			diffMode: 'holdAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('historyKey', initialState);
		});

		const patches: Operation[] = [
			{ op: 'replace', path: '/id', value: 2 },
			{ op: 'replace', path: '/status', value: 'completed' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('historyKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('historyKey');

		// History should contain the original diff state
		expect(result?.history).toHaveLength(1);
		expect(result?.history[0]).toEqual(originalDiffState);

		// New state should have patches applied
		expect(result?.diffState.newState).toEqual({
			id: 2,
			status: 'completed',
		});
	});

	it('should handle empty patches array', () => {
		interface TestData {
			value: string;
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 'old' },
				newState: { value: 'new' },

				computedState: { value: 'new' },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('emptyPatchKey', initialState);
		});

		const patches: Operation[] = [];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('emptyPatchKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('emptyPatchKey');

		// State should remain unchanged when no patches are applied
		expect(result?.diffState.newState).toEqual({ value: 'new' });
		expect(result?.diffState.oldState).toEqual({ value: 'new' });

		// History should still be updated
		expect(result?.history).toHaveLength(1);
	});

	it('should handle copy and move operations', () => {
		interface TestData {
			source: { value: string };
			target?: { value: string };
			array: string[];
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: {
					source: { value: 'original' },
					array: ['a', 'b', 'c'],
				},
				newState: {
					source: { value: 'original' },
					array: ['a', 'b', 'c'],
				},
				computedState: {
					source: { value: 'original' },
					array: ['a', 'b', 'c'],
				},
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('copyMoveKey', initialState);
		});

		const patches: Operation[] = [
			// Copy operation
			{ op: 'copy', from: '/source', path: '/target' },
			// Move operation in array
			{ op: 'move', from: '/array/2', path: '/array/0' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('copyMoveKey', patches, true);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('copyMoveKey');

		// Verify copy operation
		expect(result?.diffState.newState.target).toEqual({ value: 'original' });
		expect(result?.diffState.newState.source).toEqual({ value: 'original' });

		// Verify move operation (c moved to beginning)
		expect(result?.diffState.newState.array).toEqual(['c', 'a', 'b']);

		expect(result?.diffState.isDiffMode).toBe(true);
	});

	it('should handle test operation in patches', () => {
		interface TestData {
			value: string;
			count: number;
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 'test', count: 5 },
				newState: { value: 'test', count: 5 },
				computedState: { value: 'test', count: 5 },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('testOpKey', initialState);
		});

		// Patches with test operation followed by replace
		const patches: Operation[] = [
			{ op: 'test', path: '/value', value: 'test' }, // This should pass
			{ op: 'replace', path: '/value', value: 'updated' },
			{ op: 'test', path: '/count', value: 5 }, // This should pass
			{ op: 'replace', path: '/count', value: 10 },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('testOpKey', patches, false);
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('testOpKey');

		// Verify patches were applied after test operations passed
		expect(result?.diffState.newState).toEqual({
			value: 'updated',
			count: 10,
		});
	});
});

describe('Integration: applyPatchesToDiffState with other methods', () => {
	it('should work with acceptAllDiffs after applying patches', () => {
		interface TestData {
			name: string;
			items: string[];
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { name: 'Initial', items: [] },
				newState: { name: 'Initial', items: [] },
				computedState: { name: 'Initial', items: [] },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('integrationKey1', initialState);
		});

		// Apply patches to create a diff
		const patches: Operation[] = [
			{ op: 'replace', path: '/name', value: 'Updated' },
			{ op: 'add', path: '/items/-', value: 'item1' },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('integrationKey1', patches, true);
		});

		// Accept the diffs
		act(() => {
			useCedarStore.getState().acceptAllDiffs('integrationKey1');
		});

		const result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('integrationKey1');

		// After accepting, both states should be synced
		expect(result?.diffState.oldState).toEqual({
			name: 'Updated',
			items: ['item1'],
		});
		expect(result?.diffState.newState).toEqual({
			name: 'Updated',
			items: ['item1'],
		});
		expect(result?.diffState.isDiffMode).toBe(false);
	});

	it('should work with undo/redo after applying patches', () => {
		interface TestData {
			value: number;
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { value: 1 },
				newState: { value: 1 },

				computedState: { value: 1 },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('undoRedoPatchKey', initialState);
		});

		// Apply first set of patches
		const patches1: Operation[] = [{ op: 'replace', path: '/value', value: 2 }];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('undoRedoPatchKey', patches1, false);
		});

		// Apply second set of patches
		const patches2: Operation[] = [{ op: 'replace', path: '/value', value: 3 }];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('undoRedoPatchKey', patches2, false);
		});

		// Undo once
		act(() => {
			useCedarStore.getState().undo('undoRedoPatchKey');
		});

		let result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('undoRedoPatchKey');

		expect(result?.diffState.newState).toEqual({ value: 2 });

		// Undo again
		act(() => {
			useCedarStore.getState().undo('undoRedoPatchKey');
		});

		result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('undoRedoPatchKey');

		expect(result?.diffState.newState).toEqual({ value: 1 });

		// Redo
		act(() => {
			useCedarStore.getState().redo('undoRedoPatchKey');
		});

		result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('undoRedoPatchKey');

		expect(result?.diffState.newState).toEqual({ value: 2 });
	});

	it('should handle alternating between setDiffState and applyPatchesToDiffState', () => {
		interface TestData {
			name: string;
			count: number;
		}

		const initialState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: { name: 'Start', count: 0 },
				newState: { name: 'Start', count: 0 },
				computedState: { name: 'Start', count: 0 },
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('alternatingKey', initialState);
		});

		act(() => {
			useCedarStore
				.getState()
				.newDiffState('alternatingKey', { name: 'Middle', count: 5 }, true);
		});

		let result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('alternatingKey');

		expect(result?.diffState.newState).toEqual({ name: 'Middle', count: 5 });
		expect(result?.diffState.isDiffMode).toBe(true);

		// Use applyPatchesToDiffState
		const patches: Operation[] = [
			{ op: 'replace', path: '/name', value: 'End' },
			{ op: 'replace', path: '/count', value: 10 },
		];

		act(() => {
			useCedarStore
				.getState()
				.applyPatchesToDiffState('alternatingKey', patches, false);
		});

		result = useCedarStore
			.getState()
			.getDiffHistoryState<TestData>('alternatingKey');

		expect(result?.diffState.newState).toEqual({ name: 'End', count: 10 });
		expect(result?.diffState.isDiffMode).toBe(false);

		// History should contain both previous states
		expect(result?.history).toHaveLength(2);
	});

	describe('Primitive Array Diff Operations', () => {
		interface NodeData {
			id: string;
			data: {
				attributeIds: string[];
			};
		}

		it('should reject diff for primitive array elements', () => {
			const initialNodes: NodeData[] = [
				{
					id: 'node1',
					data: {
						attributeIds: ['attr1', 'attr2'],
					},
				},
			];

			const updatedNodes: NodeData[] = [
				{
					id: 'node1',
					data: {
						attributeIds: ['attr1', 'attr2', 'attr3'], // Added attr3
					},
				},
			];

			// Register the diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'testNodes',
					value: initialNodes,
					setValue: () => {},
					description: 'Test nodes for primitive array diff',
				});
			});

			// Update to the new state to create a diff and force diff mode
			act(() => {
				useCedarStore.getState().newDiffState('testNodes', updatedNodes, true); // Force isDiffChange=true
			});

			// Verify diff mode is active
			const diffStateBefore = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('testNodes');
			expect(diffStateBefore?.diffState.isDiffMode).toBe(true);
			expect(
				diffStateBefore?.diffState.newState[0].data.attributeIds
			).toContain('attr3');

			// Reject the addition of 'attr3' from the primitive array
			act(() => {
				const success = useCedarStore.getState().rejectDiff(
					'testNodes',
					'/0/data/attributeIds', // Path to the attributeIds array
					'value', // Ignored for primitive arrays
					'attr3' // The primitive value to reject/remove
				);
				expect(success).toBe(true);
			});

			// Verify the diff was rejected (attr3 removed)
			const diffStateAfter = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('testNodes');
			expect(diffStateAfter?.diffState.newState[0].data.attributeIds).toEqual([
				'attr1',
				'attr2',
			]);
			expect(
				diffStateAfter?.diffState.newState[0].data.attributeIds
			).not.toContain('attr3');
		});

		it('should handle rejecting non-existent primitive values gracefully', () => {
			const initialNodes: NodeData[] = [
				{
					id: 'node1',
					data: {
						attributeIds: ['attr1', 'attr2'],
					},
				},
			];

			const updatedNodes: NodeData[] = [
				{
					id: 'node1',
					data: {
						attributeIds: ['attr1', 'attr2', 'attr3'], // Added attr3
					},
				},
			];

			// Register the diff state
			act(() => {
				useCedarStore.getState().registerDiffState({
					key: 'testNodes2',
					value: initialNodes,
					setValue: () => {},
					description: 'Test nodes for primitive array diff',
				});
			});

			// Create a diff state first
			act(() => {
				useCedarStore.getState().newDiffState('testNodes2', updatedNodes, true);
			});

			// Try to reject a value that doesn't exist
			act(() => {
				const success = useCedarStore
					.getState()
					.rejectDiff(
						'testNodes2',
						'/0/data/attributeIds',
						'value',
						'nonExistentAttr'
					);
				expect(success).toBe(true); // Should still return true, just no changes made
			});

			// Verify the array still contains attr3 (unchanged since nonExistentAttr wasn't there)
			const diffState = useCedarStore
				.getState()
				.getDiffHistoryState<NodeData[]>('testNodes2');
			expect(diffState?.diffState.newState[0].data.attributeIds).toEqual([
				'attr1',
				'attr2',
				'attr3',
			]);
		});
	});
});

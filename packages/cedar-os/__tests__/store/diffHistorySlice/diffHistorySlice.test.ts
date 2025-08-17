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
						isDiffMode: false,
						patches: [],
					},
					history: [],
					redoStack: [],
					diffMode: 'defaultAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffHistoryState('testKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getDiffHistoryState<{ count: number }>('testKey');
				expect(result).toEqual(testState);
			});
		});

		describe('setDiffHistoryState', () => {
			it('should set a new diff history state', () => {
				const testState: DiffHistoryState<string> = {
					diffState: {
						oldState: 'old',
						newState: 'new',
						isDiffMode: true,
						patches: [{ op: 'replace', path: '', value: 'new' }] as Operation[],
					},
					history: [],
					redoStack: [],
					diffMode: 'holdAccept',
				};

				act(() => {
					useCedarStore.getState().setDiffHistoryState('stringKey', testState);
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
						isDiffMode: true,
						patches: [],
					},
					history: [initialState.diffState],
					redoStack: [],
					diffMode: 'holdAccept',
				};

				act(() => {
					useCedarStore
						.getState()
						.setDiffHistoryState('numberKey', initialState);
					useCedarStore
						.getState()
						.setDiffHistoryState('numberKey', updatedState);
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
						.setDiffHistoryState('defaultAcceptKey', testState);
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
						.setDiffHistoryState('holdAcceptKey', testState);
				});

				const result = useCedarStore
					.getState()
					.getCleanState<{ value: string }>('holdAcceptKey');
				expect(result).toEqual({ value: 'old' });
			});
		});
	});

	describe('setDiffState', () => {
		it('should warn and return early if no existing state', () => {
			const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('nonExistent', { value: 'new' }, true);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('countKey', initialState);
				useCedarStore.getState().setDiffState('countKey', { count: 2 }, false);
			});

			const result = useCedarStore
				.getState()
				.getDiffHistoryState<{ count: number }>('countKey');

			// Check that the new state is set correctly
			expect(result?.diffState.newState).toEqual({ count: 2 });
			expect(result?.diffState.oldState).toEqual({ count: 0 });
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('textKey', initialState);
				useCedarStore
					.getState()
					.setDiffState('textKey', { text: 'changed' }, true);
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
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('textKey2', initialState);
				useCedarStore
					.getState()
					.setDiffState('textKey2', { text: 'changed' }, true);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [
					{
						oldState: 0,
						newState: 1,
						isDiffMode: false,
						patches: [],
					},
				],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('redoTestKey', initialState);
				useCedarStore.getState().setDiffState('redoTestKey', 3, false);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('noDiffKey', testState);
			});

			const result = useCedarStore.getState().acceptAllDiffs('noDiffKey');
			expect(result).toBe(false);
		});

		it('should accept diffs by syncing newState to oldState', () => {
			const testState: DiffHistoryState<{ value: number; text: string }> = {
				diffState: {
					oldState: { value: 1, text: 'old' },
					newState: { value: 2, text: 'new' },
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
				useCedarStore.getState().setDiffHistoryState('acceptKey', testState);
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
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [redoState],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('acceptRedoKey', testState);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('noDiffRejectKey', testState);
			});

			const result = useCedarStore.getState().rejectAllDiffs('noDiffRejectKey');
			expect(result).toBe(false);
		});

		it('should reject diffs by reverting newState to oldState', () => {
			const testState: DiffHistoryState<{ value: number; text: string }> = {
				diffState: {
					oldState: { value: 1, text: 'old' },
					newState: { value: 2, text: 'new' },
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
				useCedarStore.getState().setDiffHistoryState('rejectKey', testState);
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
				isDiffMode: false,
				patches: [],
			};

			const testState: DiffHistoryState<string> = {
				diffState: {
					oldState: 'original',
					newState: 'modified',
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [redoState],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('rejectRedoKey', testState);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('emptyHistoryKey', testState);
			});

			const result = useCedarStore.getState().undo('emptyHistoryKey');
			expect(result).toBe(false);
		});

		it('should restore previous state from history', () => {
			const historicalState: DiffState<{ count: number }> = {
				oldState: { count: 0 },
				newState: { count: 1 },
				isDiffMode: false,
				patches: [],
			};

			const currentState: DiffState<{ count: number }> = {
				oldState: { count: 1 },
				newState: { count: 2 },
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
				useCedarStore.getState().setDiffHistoryState('undoKey', testState);
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
				isDiffMode: false,
				patches: [],
			};

			const state2: DiffState<number> = {
				oldState: 1,
				newState: 2,
				isDiffMode: false,
				patches: [],
			};

			const state3: DiffState<number> = {
				oldState: 2,
				newState: 3,
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
				useCedarStore.getState().setDiffHistoryState('multiUndoKey', testState);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('emptyRedoKey', testState);
			});

			const result = useCedarStore.getState().redo('emptyRedoKey');
			expect(result).toBe(false);
		});

		it('should return false if redo stack is undefined', () => {
			const testState: DiffHistoryState<number> = {
				diffState: {
					oldState: 1,
					newState: 2,
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: undefined as any, // Simulating undefined redo stack
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('undefinedRedoKey', testState);
			});

			const result = useCedarStore.getState().redo('undefinedRedoKey');
			expect(result).toBe(false);
		});

		it('should restore state from redo stack', () => {
			const currentState: DiffState<{ text: string }> = {
				oldState: { text: 'current old' },
				newState: { text: 'current new' },
				isDiffMode: false,
				patches: [],
			};

			const redoState: DiffState<{ text: string }> = {
				oldState: { text: 'redo old' },
				newState: { text: 'redo new' },
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
				useCedarStore.getState().setDiffHistoryState('redoKey', testState);
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
				isDiffMode: false,
				patches: [],
			};

			const redoState1: DiffState<number> = {
				oldState: 2,
				newState: 3,
				isDiffMode: false,
				patches: [],
			};

			const redoState2: DiffState<number> = {
				oldState: 3,
				newState: 4,
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
				useCedarStore.getState().setDiffHistoryState('multiRedoKey', testState);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffHistoryState('workflowKey', initialState);
			});

			// Step 1: Set a diff state
			act(() => {
				useCedarStore
					.getState()
					.setDiffState('workflowKey', { name: 'Bob', age: 30 }, true);
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
				isDiffMode: false,
				patches: [],
			});
			// The second item in history should be the diff state that was saved before accepting
			expect(state?.history[1]).toEqual({
				oldState: { name: 'Alice', age: 25 },
				newState: { name: 'Bob', age: 30 },
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
					.setDiffHistoryState('rejectWorkflowKey', initialState);
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
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffHistoryState('patchKey', initialState);
			});

			// Make changes that should generate patches
			const newData: ComplexData = {
				user: { name: 'Jane', email: 'jane@example.com' },
				settings: { theme: 'dark', notifications: true },
			};

			act(() => {
				useCedarStore.getState().setDiffState('patchKey', newData, true);
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
});

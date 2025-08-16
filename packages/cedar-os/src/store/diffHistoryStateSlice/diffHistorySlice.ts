import { StateCreator } from 'zustand';

/**
 * DiffHistorySlice manages diffs so that we can render changes and let the user accept, reject, and manage them.
 * For example, if an agent makes a change to a state, we want the user to be able to see what changed
 * and what they have to accept. To do this, we have to allow behaviour such as rollback,
 * accepting specific diffs, and saving them to the history.
 */

export type DiffMode = 'defaultAccept' | 'holdAccept';

export interface DiffState<T = unknown> {
	oldState: T;
	newState: T;
	isDiffMode: boolean;
}

export interface DiffHistoryState<T = unknown> {
	diffState: DiffState<T>;
	history: DiffState<T>[];
	redoStack: DiffState<T>[];
	diffMode: DiffMode;
}

export interface DiffHistorySlice {
	diffHistoryStates: Record<string, DiffHistoryState>;

	// Core methods
	getDiffHistoryState: <T>(key: string) => DiffHistoryState<T> | undefined;
	setDiffHistoryState: <T>(
		key: string,
		diffHistoryState: DiffHistoryState<T>
	) => void;
	getCleanState: <T>(key: string) => T | undefined;

	// New setDiffState method
	setDiffState: <T>(key: string, newState: T, isDiffChange: boolean) => void;

	// Diff management methods
	acceptAllDiffs: (key: string) => boolean;
	rejectAllDiffs: (key: string) => boolean;

	// Undo/Redo methods
	undo: (key: string) => boolean;
	redo: (key: string) => boolean;
}

export const createDiffHistorySlice: StateCreator<
	DiffHistorySlice,
	[],
	[],
	DiffHistorySlice
> = (set, get) => ({
	diffHistoryStates: {},

	getDiffHistoryState: <T>(key: string): DiffHistoryState<T> | undefined => {
		return get().diffHistoryStates[key] as DiffHistoryState<T> | undefined;
	},

	setDiffHistoryState: <T>(
		key: string,
		diffHistoryState: DiffHistoryState<T>
	) => {
		set((state) => ({
			diffHistoryStates: {
				...state.diffHistoryStates,
				[key]: diffHistoryState,
			},
		}));
	},

	getCleanState: <T>(key: string): T | undefined => {
		const diffHistoryState = get().getDiffHistoryState<T>(key);
		if (!diffHistoryState) return undefined;

		const { diffState, diffMode } = diffHistoryState;

		// Return the appropriate state based on diffMode
		if (diffMode === 'defaultAccept') {
			return diffState.newState;
		} else {
			// holdAccept
			return diffState.oldState;
		}
	},

	setDiffState: <T>(key: string, newState: T, isDiffChange: boolean) => {
		const currentDiffHistoryState = get().getDiffHistoryState<T>(key);

		// If no existing state, we can't proceed
		if (!currentDiffHistoryState) {
			console.warn(`No diff history state found for key: ${key}`);
			return;
		}

		const {
			diffState: originalDiffState,
			history,
			diffMode,
		} = currentDiffHistoryState;

		// Step 1: Save the original diffState to history
		const updatedHistory = [...history, originalDiffState];

		// Step 2: Create the new diffState based on isDiffChange flag
		let newDiffState: DiffState<T>;

		if (isDiffChange) {
			// Determine the oldState based on the original diffState's isDiffMode
			let oldStateForNewDiff: T;

			if (!originalDiffState.isDiffMode) {
				// If original was not in diff mode, use the previous newState as oldState
				oldStateForNewDiff = originalDiffState.newState;
			} else {
				// If original was in diff mode, keep the previous oldState
				oldStateForNewDiff = originalDiffState.oldState;
			}

			newDiffState = {
				oldState: oldStateForNewDiff,
				newState: newState,
				isDiffMode: true, // Set to true since this is a diff change
			};
		} else {
			// If not a diff change, just update the newState while keeping oldState
			newDiffState = {
				oldState: originalDiffState.oldState,
				newState: newState,
				isDiffMode: false, // Not a diff change
			};
		}

		// Create the updated diff history state
		const updatedDiffHistoryState: DiffHistoryState<T> = {
			diffState: newDiffState,
			history: updatedHistory,
			redoStack: [], // Clear redo stack on new changes
			diffMode: diffMode, // Keep the same diff mode
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);
	},

	acceptAllDiffs: (key: string): boolean => {
		const currentDiffHistoryState = get().getDiffHistoryState(key);

		// If no existing state or not in diff mode, return false
		if (
			!currentDiffHistoryState ||
			!currentDiffHistoryState.diffState.isDiffMode
		) {
			return false;
		}

		const { diffState, history, diffMode } = currentDiffHistoryState;

		// Accept changes by copying newState into oldState (sync states)
		const acceptedDiffState: DiffState = {
			oldState: diffState.newState, // Copy newState to oldState
			newState: diffState.newState, // Keep newState as is
			isDiffMode: false, // No longer in diff mode
		};

		// Save the accepted state to history
		const updatedHistory = [...history, acceptedDiffState];

		const updatedDiffHistoryState: DiffHistoryState = {
			diffState: acceptedDiffState,
			history: updatedHistory,
			redoStack: currentDiffHistoryState.redoStack || [], // Preserve redo stack
			diffMode: diffMode,
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);

		return true; // Successfully accepted diffs
	},

	rejectAllDiffs: (key: string): boolean => {
		const currentDiffHistoryState = get().getDiffHistoryState(key);

		// If no existing state or not in diff mode, return false
		if (
			!currentDiffHistoryState ||
			!currentDiffHistoryState.diffState.isDiffMode
		) {
			return false;
		}

		const { diffState, history, diffMode } = currentDiffHistoryState;

		// Reject changes by copying oldState into newState (revert to old state)
		const rejectedDiffState: DiffState = {
			oldState: diffState.oldState, // Keep oldState as is
			newState: diffState.oldState, // Copy oldState to newState
			isDiffMode: false, // No longer in diff mode
		};

		// Save the rejected state to history
		const updatedHistory = [...history, rejectedDiffState];

		const updatedDiffHistoryState: DiffHistoryState = {
			diffState: rejectedDiffState,
			history: updatedHistory,
			redoStack: currentDiffHistoryState.redoStack || [], // Preserve redo stack
			diffMode: diffMode,
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);

		return true; // Successfully rejected diffs
	},

	undo: (key: string): boolean => {
		const currentDiffHistoryState = get().getDiffHistoryState(key);

		// If no existing state or no history to undo, return false
		if (
			!currentDiffHistoryState ||
			currentDiffHistoryState.history.length === 0
		) {
			return false;
		}

		const {
			diffState: currentDiffState,
			history,
			redoStack = [],
			diffMode,
		} = currentDiffHistoryState;

		// Pop the last state from history
		const newHistory = [...history];
		const previousState = newHistory.pop();

		if (!previousState) {
			return false;
		}

		// Push current state to redo stack
		const newRedoStack = [...redoStack, currentDiffState];

		const updatedDiffHistoryState: DiffHistoryState = {
			diffState: previousState,
			history: newHistory,
			redoStack: newRedoStack,
			diffMode: diffMode,
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);

		return true; // Successfully performed undo
	},

	redo: (key: string): boolean => {
		const currentDiffHistoryState = get().getDiffHistoryState(key);

		// If no existing state or no redo stack, return false
		if (
			!currentDiffHistoryState ||
			!currentDiffHistoryState.redoStack ||
			currentDiffHistoryState.redoStack.length === 0
		) {
			return false;
		}

		const {
			diffState: currentDiffState,
			history,
			redoStack,
			diffMode,
		} = currentDiffHistoryState;

		// Pop the last state from redo stack
		const newRedoStack = [...redoStack];
		const redoState = newRedoStack.pop();

		if (!redoState) {
			return false;
		}

		// Push current state to history
		const newHistory = [...history, currentDiffState];

		const updatedDiffHistoryState: DiffHistoryState = {
			diffState: redoState,
			history: newHistory,
			redoStack: newRedoStack,
			diffMode: diffMode,
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);

		return true; // Successfully performed redo
	},
});

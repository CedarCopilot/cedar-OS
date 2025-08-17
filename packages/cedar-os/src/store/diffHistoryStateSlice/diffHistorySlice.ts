import { StateCreator } from 'zustand';
import { compare, Operation, applyPatch } from 'fast-json-patch';

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
	patches?: Operation[]; // JSON patches describing the changes from oldState to newState
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

	// Apply patches to diff state
	applyPatchesToDiffState: (
		key: string,
		patches: Operation[],
		isDiffChange: boolean
	) => void;

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
		// Determine oldState: if isDiffChange and not previously in diff mode, use previous newState
		// Otherwise keep the original oldState
		const oldStateForDiff =
			isDiffChange && !originalDiffState.isDiffMode
				? originalDiffState.newState
				: originalDiffState.oldState;

		// Generate patches to describe the changes
		const patches = compare(oldStateForDiff as object, newState as object);

		const newDiffState: DiffState<T> = {
			oldState: oldStateForDiff,
			newState: newState,
			isDiffMode: isDiffChange,
			patches,
		};

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

	applyPatchesToDiffState: <T>(
		key: string,
		patches: Operation[],
		isDiffChange: boolean
	) => {
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

		// Step 2: Apply patches to the current newState to get the updated state
		// Create a deep copy of the current newState to avoid mutations
		const currentNewState = JSON.parse(
			JSON.stringify(originalDiffState.newState)
		);

		// Apply the patches to get the new state
		const patchResult = applyPatch(
			currentNewState,
			patches,
			false, // Don't validate (for performance)
			false // Don't mutate the original
		);

		const updatedNewState = patchResult.newDocument as T;

		// Step 3: Create the new diffState based on isDiffChange flag
		// Determine oldState: if isDiffChange and not previously in diff mode, use previous newState
		// Otherwise keep the original oldState
		const oldStateForDiff =
			isDiffChange && !originalDiffState.isDiffMode
				? originalDiffState.newState
				: originalDiffState.oldState;

		// Generate patches to describe the changes from oldState to the new patched state
		const diffPatches = compare(
			oldStateForDiff as object,
			updatedNewState as object
		);

		const newDiffState: DiffState<T> = {
			oldState: oldStateForDiff,
			newState: updatedNewState,
			isDiffMode: isDiffChange,
			patches: diffPatches,
		};

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
		// No patches needed as states are now identical
		const acceptedDiffState: DiffState = {
			oldState: diffState.newState, // Copy newState to oldState
			newState: diffState.newState, // Keep newState as is
			isDiffMode: false, // No longer in diff mode
			patches: [], // Empty patches as states are synced
		};

		// Save the current diff state to history before accepting
		const updatedHistory = [...history, diffState];

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
		// No patches needed as states are now identical
		const rejectedDiffState: DiffState = {
			oldState: diffState.oldState, // Keep oldState as is
			newState: diffState.oldState, // Copy oldState to newState
			isDiffMode: false, // No longer in diff mode
			patches: [], // Empty patches as states are synced
		};

		// Save the current diff state to history before rejecting
		const updatedHistory = [...history, diffState];

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

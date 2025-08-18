import { StateCreator } from 'zustand';
import { compare, Operation, applyPatch } from 'fast-json-patch';
import type { CedarStore } from '@/store/CedarOSTypes';
import type { BasicStateValue } from '@/store/stateSlice/stateSlice';

/**
 * DiffHistorySlice manages diffs so that we can render changes and let the user accept, reject, and manage them.
 * For example, if an agent makes a change to a state, we want the user to be able to see what changed
 * and what they have to accept. To do this, we have to allow behaviour such as rollback,
 * accepting specific diffs, and saving them to the history.
 */

export type DiffMode = 'defaultAccept' | 'holdAccept';

/**
 * Function that computes the final state based on old and new states.
 * Can be used to add diff markers or transform the state before setting.
 */
export type ComputeStateFunction<T = unknown> = (
	oldState: T,
	newState: T,
	patches: Operation[]
) => T;

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
	computeState?: ComputeStateFunction<T>;
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

	// Get computed state (with computeState applied if available)
	getComputedState: <T>(key: string) => T | undefined;

	// Register computeState function for a key
	setComputeStateFunction: <T>(
		key: string,
		computeState: ComputeStateFunction<T> | undefined
	) => void;

	// New setDiffState method
	setDiffState: <T>(key: string, newState: T, isDiffChange: boolean) => void;

	// Execute custom setter for diff-tracked states
	executeDiffSetter: (
		key: string,
		setterKey: string,
		options?: { isDiff?: boolean },
		...args: unknown[]
	) => void;

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
	CedarStore,
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
				[key]: diffHistoryState as DiffHistoryState<unknown>,
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

	getComputedState: <T>(key: string): T | undefined => {
		const diffHistoryState = get().getDiffHistoryState<T>(key);
		if (!diffHistoryState) return undefined;

		const { diffState, computeState } = diffHistoryState;

		// If there's a computeState function, apply it
		if (computeState) {
			const patches = compare(
				diffState.oldState as object,
				diffState.newState as object
			);
			return computeState(diffState.oldState, diffState.newState, patches);
		}

		// Otherwise return the clean state
		return get().getCleanState<T>(key);
	},

	setComputeStateFunction: <T>(
		key: string,
		computeState: ComputeStateFunction<T> | undefined
	) => {
		const currentDiffHistoryState = get().getDiffHistoryState<T>(key);
		if (!currentDiffHistoryState) {
			console.warn(`No diff history state found for key: ${key}`);
			return;
		}

		// Update the diff history state with the new computeState function
		const updatedDiffHistoryState: DiffHistoryState<T> = {
			...currentDiffHistoryState,
			computeState,
		};

		get().setDiffHistoryState(key, updatedDiffHistoryState);
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
			computeState,
		} = currentDiffHistoryState;

		// Step 1: Save the original diffState to history
		const updatedHistory = [...history, originalDiffState];

		// Step 2: Apply computeState if available
		let finalNewState = newState;
		if (computeState) {
			const patches = compare(
				originalDiffState.oldState as object,
				newState as object
			);
			finalNewState = computeState(
				originalDiffState.oldState,
				newState,
				patches
			);
		}

		// Step 3: Create the new diffState based on isDiffChange flag
		// Determine oldState: if isDiffChange and not previously in diff mode, use previous newState
		// Otherwise keep the original oldState
		const oldStateForDiff =
			isDiffChange && !originalDiffState.isDiffMode
				? originalDiffState.newState
				: originalDiffState.oldState;

		// Generate patches to describe the changes
		const patches = compare(oldStateForDiff as object, finalNewState as object);

		const newDiffState: DiffState<T> = {
			oldState: oldStateForDiff,
			newState: finalNewState,
			isDiffMode: isDiffChange,
			patches,
		};

		// Create the updated diff history state
		const updatedDiffHistoryState: DiffHistoryState<T> = {
			diffState: newDiffState,
			history: updatedHistory,
			redoStack: [], // Clear redo stack on new changes
			diffMode: diffMode, // Keep the same diff mode
			computeState, // Preserve the computeState function
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);
	},

	executeDiffSetter: (
		key: string,
		setterKey: string,
		options: { isDiff?: boolean } = {},
		...args: unknown[]
	) => {
		const isDiff = options.isDiff ?? false;
		const currentDiffHistoryState = get().getDiffHistoryState(key);

		// If no diff history state exists for this key, we can't proceed
		if (!currentDiffHistoryState) {
			console.warn(`No diff history state found for key: ${key}`);
			return;
		}

		// Get the current newState to execute the setter on
		const currentNewState = currentDiffHistoryState.diffState.newState;

		// We need to get the registered state to access the custom setter
		const registeredState = get().registeredStates?.[key];
		if (!registeredState) {
			console.warn(`No registered state found for key: ${key}`);
			return;
		}

		const customSetters = registeredState.customSetters;
		if (!customSetters || !customSetters[setterKey]) {
			console.warn(`Custom setter "${setterKey}" not found for state "${key}"`);
			return;
		}

		// Create a temporary state holder to capture the result
		const resultState: BasicStateValue = currentNewState as BasicStateValue;

		// I don't think this actually happens, but is good backup vvv

		// // Store the original setCedarState and setValue to intercept calls
		// const originalSetCedarState = get().setCedarState;
		// const originalSetValue = registeredState.setValue;

		// // Temporarily override setCedarState to capture the result
		// // This is needed because custom setters often call setCedarState internally
		// get().setCedarState = (stateKey: string, newValue: BasicStateValue) => {
		// 	if (stateKey === key) {
		// 		resultState = newValue;
		// 	}
		// };

		// // Also override setValue if it exists
		// if (originalSetValue) {
		// 	registeredState.setValue = (newValue: unknown) => {
		// 		resultState = newValue as BasicStateValue;
		// 	};
		// }

		try {
			// Execute the custom setter
			const setter = customSetters[setterKey];
			setter.execute(currentNewState as BasicStateValue, ...args);

			// // Restore original functions
			// get().setCedarState = originalSetCedarState;
			// if (originalSetValue) {
			// 	registeredState.setValue = originalSetValue;
			// }

			// Now call setDiffState with the captured result
			get().setDiffState(key, resultState, isDiff);
		} catch (error) {
			// // Restore original functions in case of error
			// get().setCedarState = originalSetCedarState;
			// if (originalSetValue) {
			// 	registeredState.setValue = originalSetValue;
			// }
			console.error(`Error executing diff setter for "${key}":`, error);
		}
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
			computeState,
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

		let updatedNewState = patchResult.newDocument as T;

		// Apply computeState if available
		if (computeState) {
			const computePatches = compare(
				originalDiffState.oldState as object,
				updatedNewState as object
			);
			updatedNewState = computeState(
				originalDiffState.oldState,
				updatedNewState,
				computePatches
			);
		}

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
			computeState, // Preserve the computeState function
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

		const { diffState, history, diffMode, computeState } =
			currentDiffHistoryState;

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
			computeState, // Preserve the computeState function
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

		const { diffState, history, diffMode, computeState } =
			currentDiffHistoryState;

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
			computeState, // Preserve the computeState function
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
			computeState,
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
			computeState, // Preserve the computeState function
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
			computeState,
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
			computeState, // Preserve the computeState function
		};

		// Update the store
		get().setDiffHistoryState(key, updatedDiffHistoryState);

		return true; // Successfully performed redo
	},
});

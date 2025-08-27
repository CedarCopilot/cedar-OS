import { StateCreator } from 'zustand';
import { compare, Operation, applyPatch } from 'fast-json-patch';
import { isEqual } from 'lodash';
import type { CedarStore } from '@/store/CedarOSTypes';
import type {
	BasicStateValue,
	BaseSetter,
	Setter,
} from '@/store/stateSlice/stateSlice';
import type { ZodSchema } from 'zod';

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
	computedState: T; // The computed state based on computeState function or fallback to appropriate state
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

/**
 * Configuration for registerDiffState
 */
export interface RegisterDiffStateConfig<T extends BasicStateValue> {
	key: string;
	value: T;
	setValue?: BaseSetter<T>;
	description?: string;
	schema?: ZodSchema<T>;
	customSetters?: Record<string, Setter<T>>;
	diffMode?: DiffMode;
	computeState?: ComputeStateFunction<T>;
}

export interface DiffHistorySlice {
	diffHistoryStates: Record<string, DiffHistoryState>;

	// Core methods
	getDiffHistoryState: <T>(key: string) => DiffHistoryState<T> | undefined;
	setDiffState: <T>(key: string, diffHistoryState: DiffHistoryState<T>) => void;
	getCleanState: <T>(key: string) => T | undefined;

	// Get computed state (with computeState applied if available)
	getComputedState: <T>(key: string) => T | undefined;

	// Register computeState function for a key
	setComputeStateFunction: <T>(
		key: string,
		computeState: ComputeStateFunction<T> | undefined
	) => void;

	// Register a diff-tracked state (handles all initialization and setup)
	registerDiffState: <T extends BasicStateValue>(
		config: RegisterDiffStateConfig<T>
	) => void;

	// New newDiffState method
	newDiffState: <T>(key: string, newState: T, isDiffChange: boolean) => void;

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

	registerDiffState: <T extends BasicStateValue>(
		config: RegisterDiffStateConfig<T>
	) => {
		const {
			key,
			value,
			setValue,
			description,
			schema,
			customSetters,
			diffMode = 'defaultAccept',
			computeState,
		} = config;
		// Step 1: Initialize or update diff history state
		const existingDiffState = get().getDiffHistoryState<T>(key);

		if (!existingDiffState) {
			// Step 1: Register the state in stateSlice
			get().registerState({
				key,
				value,
				setValue,
				description,
				schema,
				customSetters,
			});

			const initialDiffHistoryState: DiffHistoryState<T> = {
				diffState: {
					oldState: value,
					newState: value,
					computedState: value, // Initial state is the same for all
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode,
				computeState,
			};
			// This will also register the state in stateSlice via setDiffState
			get().setDiffState(key, initialDiffHistoryState);
		} else {
			// Technically I don't think we need to check the newState since computedState should equal newState in some situations, but just in case
			const currentNewState = existingDiffState.diffState.newState;
			const currentComputedState = existingDiffState.diffState.computedState;
			if (
				!isEqual(currentNewState, value) &&
				!isEqual(currentComputedState, value)
			) {
				get().newDiffState(key, value, false);
			}
		}
	},

	setDiffState: <T>(key: string, diffHistoryState: DiffHistoryState<T>) => {
		set((state) => ({
			diffHistoryStates: {
				...state.diffHistoryStates,
				[key]: diffHistoryState as DiffHistoryState<unknown>,
			},
		}));

		// Register or update the state in stateSlice with the clean state
		const cleanState = get().getCleanState<T>(key);
		if (cleanState !== undefined) {
			// Get the registered state to check if it exists
			const registeredState = get().registeredStates?.[key];
			if (!registeredState) {
				// // Register the state if it doesn't exist
				get().registerState({
					key,
					value: cleanState,
					// Change
					description: `Diff-tracked state: ${key}`,
				});
			} else {
				// Only update if the value has actually changed
				// This prevents unnecessary re-renders and potential loops
				const currentValue = registeredState.value;

				if (!isEqual(currentValue, cleanState)) {
					// Update the value in registeredStates
					set(
						(state) =>
							({
								registeredStates: {
									...state.registeredStates,
									[key]: {
										...state.registeredStates[key],
										value: cleanState as BasicStateValue,
									},
								},
							} as Partial<CedarStore>)
					);
				}
			}
		}
	},

	newDiffState: <T>(key: string, newState: T, isDiffChange: boolean) => {
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

		// Step 3: Create the new diffState based on isDiffChange flag
		let oldStateForDiff: T;
		if (!isDiffChange) {
			// Not in diff mode, use current newState
			oldStateForDiff = newState;
		} else {
			oldStateForDiff = originalDiffState.isDiffMode
				? originalDiffState.oldState
				: originalDiffState.newState;
		}

		// Generate patches to describe the changes
		const patches = compare(oldStateForDiff as object, newState as object);

		// Determine computedState: call computeState function if it exists, otherwise use appropriate state based on diffMode
		const computedStateValue = computeState
			? computeState(oldStateForDiff, newState, patches)
			: diffMode === 'defaultAccept'
			? newState
			: oldStateForDiff;

		const newDiffState: DiffState<T> = {
			oldState: oldStateForDiff,
			newState: newState,
			computedState: computedStateValue,
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

		// Update the store directly without side effects
		set((state) => ({
			diffHistoryStates: {
				...state.diffHistoryStates,
				[key]: updatedDiffHistoryState as DiffHistoryState<unknown>,
			},
		}));

		// Propagate the computed state to stateSlice
		// Update the value in registeredStates only (do NOT call setValue to avoid circular dependency)
		const registeredState = get().registeredStates?.[key];
		if (registeredState) {
			// Check if the clean state has actually changed before updating
			const currentValue = registeredState.value;

			if (!isEqual(currentValue, computedStateValue)) {
				// Update the stored value
				set(
					(state) =>
						({
							registeredStates: {
								...state.registeredStates,
								[key]: {
									...state.registeredStates[key],
									value: computedStateValue as BasicStateValue,
								},
							},
						} as Partial<CedarStore>)
				);
				// Call setValue to update the external state
				registeredState.setValue?.(computedStateValue as BasicStateValue);
			}
		}
	},

	getCleanState: <T>(key: string): T | undefined => {
		const diffHistoryState = get().getDiffHistoryState<T>(key);
		if (!diffHistoryState || !diffHistoryState.diffState) return undefined;

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

		// Return the pre-computed state that was calculated during newDiffState
		return diffHistoryState.diffState.computedState;
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

		get().setDiffState(key, updatedDiffHistoryState);
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
		let resultState: BasicStateValue = currentNewState as BasicStateValue;

		// Create a setValue function that will be passed to the custom setter
		const setValueFunc = (newValue: BasicStateValue) => {
			resultState = newValue;
		};

		try {
			// Execute the custom setter with current state, setValue, and args
			const setter = customSetters[setterKey];
			setter.execute(currentNewState as BasicStateValue, setValueFunc, ...args);

			// Now call newDiffState with the captured result
			get().newDiffState(key, resultState, isDiff);
		} catch (error) {
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
		).newDocument;

		// Step 3: Create the new diffState based on isDiffChange flag
		// Determine oldState based on new logic:
		// - If isDiffMode is false (not a diff change), use current newState
		// - If isDiffMode is true (is a diff change), check previous history state
		let oldStateForDiff: T;
		if (!isDiffChange) {
			// Not in diff mode, use current newState
			oldStateForDiff = patchResult;
		} else {
			oldStateForDiff = originalDiffState.isDiffMode
				? originalDiffState.oldState
				: originalDiffState.newState;
		}

		// Generate patches to describe the changes from oldState to the new patched state
		const diffPatches = compare(
			oldStateForDiff as object,
			patchResult as object
		);

		// Determine computedState: call computeState function if it exists, otherwise use appropriate state based on diffMode
		const computedStateValue = computeState
			? computeState(oldStateForDiff, patchResult, diffPatches)
			: diffMode === 'defaultAccept'
			? patchResult
			: oldStateForDiff;

		const newDiffState: DiffState<T> = {
			oldState: oldStateForDiff,
			newState: patchResult,
			computedState: computedStateValue,
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
		get().setDiffState(key, updatedDiffHistoryState);
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
		const acceptedComputedState = computeState
			? computeState(diffState.newState, diffState.newState, [])
			: diffState.newState;

		const acceptedDiffState: DiffState = {
			oldState: diffState.newState, // Copy newState to oldState
			newState: diffState.newState, // Keep newState as is
			computedState: acceptedComputedState, // Call computeState if available
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
		get().setDiffState(key, updatedDiffHistoryState);

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
		const rejectedComputedState = computeState
			? computeState(diffState.oldState, diffState.oldState, [])
			: diffState.oldState;

		const rejectedDiffState: DiffState = {
			oldState: diffState.oldState, // Keep oldState as is
			newState: diffState.oldState, // Copy oldState to newState
			computedState: rejectedComputedState, // Call computeState if available
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
		get().setDiffState(key, updatedDiffHistoryState);

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
		get().setDiffState(key, updatedDiffHistoryState);

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
		get().setDiffState(key, updatedDiffHistoryState);

		return true; // Successfully performed redo
	},
});

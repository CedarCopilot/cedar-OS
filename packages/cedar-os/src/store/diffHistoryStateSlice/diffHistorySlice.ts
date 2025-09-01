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
 * Configuration for selective diff checking based on JSON paths.
 *
 * @example
 * // Ignore position changes (and all child fields)
 * { type: 'ignore', fields: ['/positionAbsolute'] }
 *
 * // Only consider changes if positionAbsolute changes
 * { type: 'listen', fields: ['/positionAbsolute'] }
 */
export interface DiffChecker {
	/**
	 * 'ignore': Ignore changes to specified fields and their children
	 * 'listen': Only consider changes to specified fields
	 */
	type: 'ignore' | 'listen';
	/** Array of JSON paths to ignore or listen to */
	fields: string[];
}

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
	stateSetters?: Record<string, Setter<T>>;
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
	newDiffState: <T>(key: string, newState: T, isDiffChange?: boolean) => void;

	// Execute custom setter for diff-tracked states
	executeDiffSetter: (
		key: string,
		setterKey: string,
		options?: { isDiff?: boolean },
		args?: unknown
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
	acceptDiff: <T>(
		key: string,
		jsonPath: string,
		identificationField: string | ((item: T) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	) => boolean;
	rejectDiff: <T>(
		key: string,
		jsonPath: string,
		identificationField: string | ((item: T) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	) => boolean;

	// Undo/Redo methods
	undo: (key: string) => boolean;
	redo: (key: string) => boolean;
}

/**
 * Helper function to get value at a JSON path
 */
function getValueAtPath<T>(obj: T, path: string): unknown {
	if (!path || path === '' || path === '/') {
		return obj;
	}

	const pathParts = path.startsWith('/')
		? path.slice(1).split('/')
		: path.split('/');

	let current: unknown = obj;
	for (const part of pathParts) {
		if (current == null || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}

	return current;
}

/**
 * Helper function to set value at a JSON path
 */
function setValueAtPathForDiff<T>(obj: T, path: string, value: unknown): T {
	if (!path || path === '' || path === '/') {
		return value as T;
	}

	const pathParts = path.startsWith('/')
		? path.slice(1).split('/')
		: path.split('/');

	const result = JSON.parse(JSON.stringify(obj));
	let current = result;

	for (let i = 0; i < pathParts.length - 1; i++) {
		const part = pathParts[i];
		if (!(part in current)) {
			current[part] = {};
		}
		current = current[part];
	}

	const lastPart = pathParts[pathParts.length - 1];
	current[lastPart] = value;

	return result;
}

/**
 * Helper function to identify an item using either a field name or function
 */
function getItemIdentifier<T>(
	item: T,
	identificationField: string | ((item: T) => unknown)
): unknown {
	if (typeof identificationField === 'function') {
		return identificationField(item);
	}
	return (item as Record<string, unknown>)[identificationField];
}

/**
 * Helper function to handle single diff accept/reject operations
 */
// Helper function to remove diff markers from an object at various paths
function removeDiffMarkers<T>(item: T, diffMarkerPaths?: string[]): T {
	let cleanedItem = { ...item } as T;

	// Default paths if not specified
	const pathsToCheck = diffMarkerPaths || ['/data/diff', '/diff', '/meta/diff'];

	for (const path of pathsToCheck) {
		const diffValue = getValueAtPath(cleanedItem, path);
		if (diffValue) {
			// Parse the path to determine how to remove the diff marker
			const pathParts = path.split('/').filter((p) => p);

			if (pathParts.length === 1) {
				// Root level diff
				const itemRecord = cleanedItem as Record<string, unknown>;
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [pathParts[0]]: _, ...itemWithoutDiff } = itemRecord;
				cleanedItem = itemWithoutDiff as T;
			} else {
				// Nested diff - use setValueAtPathForDiff to remove it
				// Build the parent path
				const parentPathStr = '/' + pathParts.slice(0, -1).join('/');
				const parentValue = getValueAtPath(cleanedItem, parentPathStr);

				if (parentValue && typeof parentValue === 'object') {
					const parentRecord = parentValue as Record<string, unknown>;
					const diffField = pathParts[pathParts.length - 1];
					// eslint-disable-next-line @typescript-eslint/no-unused-vars
					const { [diffField]: _, ...parentWithoutDiff } = parentRecord;
					cleanedItem = setValueAtPathForDiff(
						cleanedItem,
						parentPathStr,
						parentWithoutDiff
					) as T;
				}
			}
		}
	}

	return cleanedItem;
}

function handleSingleDiff<T>(
	get: () => CedarStore,
	key: string,
	jsonPath: string,
	identificationField: string | ((item: T) => unknown),
	action: 'accept' | 'reject',
	targetId?: unknown,
	diffMarkerPaths?: string[]
): boolean {
	const currentDiffHistoryState = get().getDiffHistoryState<T>(key);

	// If no existing state or not in diff mode, return false
	if (
		!currentDiffHistoryState ||
		!currentDiffHistoryState.diffState.isDiffMode
	) {
		return false;
	}

	const { diffState } = currentDiffHistoryState;

	// Get the value at the specified path from both old and new states
	const oldValue = getValueAtPath(diffState.oldState, jsonPath);
	const newValue = getValueAtPath(diffState.newState, jsonPath);

	// Check if we're dealing with arrays or single objects/fields
	const isArray = Array.isArray(oldValue) || Array.isArray(newValue);

	if (isArray) {
		// Handle array case (existing logic)
		const oldArray = oldValue as T[];
		const newArray = newValue as T[];

		if (!Array.isArray(oldArray) || !Array.isArray(newArray)) {
			console.warn(`Value at path "${jsonPath}" is not consistently an array`);
			return false;
		}
		return handleArrayDiff({
			get,
			key,
			jsonPath,
			oldArray,
			newArray,
			identificationField,
			action,
			currentDiffHistoryState,
			targetId,
			diffMarkerPaths,
		});
	} else {
		// Handle single object/field case
		return handleObjectFieldDiff({
			get,
			key,
			jsonPath,
			oldValue,
			newValue,
			action,
			currentDiffHistoryState,
			diffMarkerPaths,
		});
	}
}

// Handle single object/field accept/reject
function handleObjectFieldDiff<T>(params: {
	get: () => CedarStore;
	key: string;
	jsonPath: string;
	oldValue: unknown;
	newValue: unknown;
	action: 'accept' | 'reject';
	currentDiffHistoryState: DiffHistoryState<T>;
	diffMarkerPaths?: string[];
}): boolean {
	const {
		get,
		key,
		jsonPath,
		oldValue,
		newValue,
		action,
		currentDiffHistoryState,
		diffMarkerPaths,
	} = params;
	const { diffState, history, diffMode, computeState } =
		currentDiffHistoryState;

	// For object fields, we accept or reject the entire value at the path
	let finalValue: unknown;

	if (action === 'accept') {
		// Accept the new value and remove any diff markers if it's an object
		finalValue =
			typeof newValue === 'object' && newValue !== null
				? removeDiffMarkers(newValue, diffMarkerPaths)
				: newValue;
	} else {
		// Reject - use the old value
		finalValue = oldValue;
	}

	// Update the state with the new value at the path
	const updatedNewState = setValueAtPathForDiff(
		diffState.newState,
		jsonPath,
		finalValue
	);

	// For accept, also update oldState to prevent re-diffing
	const updatedOldState =
		action === 'accept'
			? setValueAtPathForDiff(diffState.oldState, jsonPath, finalValue)
			: diffState.oldState;

	// Determine if we're still in diff mode by checking if there are other differences
	let finalComputedState: T;
	let stillInDiffMode = false;

	if (computeState) {
		finalComputedState = computeState(updatedOldState, updatedNewState, []);
		// Check if computed state has any remaining diff markers
		const checkForDiffs = (obj: unknown): boolean => {
			if (!obj || typeof obj !== 'object') return false;

			const pathsToCheck = diffMarkerPaths || [
				'/data/diff',
				'/diff',
				'/meta/diff',
			];
			for (const path of pathsToCheck) {
				if (getValueAtPath(obj, path)) return true;
			}

			// Recursively check nested objects and arrays
			for (const value of Object.values(obj)) {
				if (checkForDiffs(value)) return true;
			}

			return false;
		};

		stillInDiffMode = checkForDiffs(finalComputedState);
	} else {
		finalComputedState = updatedNewState;
	}

	const updatedDiffState: DiffState<T> = {
		oldState: updatedOldState,
		newState: updatedNewState,
		computedState: finalComputedState,
		isDiffMode: stillInDiffMode,
		patches: [],
	};

	const updatedHistory = [...history, diffState];

	const updatedDiffHistoryState: DiffHistoryState<T> = {
		diffState: updatedDiffState,
		history: updatedHistory,
		redoStack: [],
		diffMode,
		computeState,
	};

	// Update the store
	get().setDiffState(key, updatedDiffHistoryState);

	return true;
}

// Handle array-based accept/reject (existing logic refactored)
function handleArrayDiff<T>(params: {
	get: () => CedarStore;
	key: string;
	jsonPath: string;
	oldArray: T[];
	newArray: T[];
	identificationField: string | ((item: T) => unknown);
	action: 'accept' | 'reject';
	currentDiffHistoryState: DiffHistoryState<T>;
	targetId?: unknown;
	diffMarkerPaths?: string[];
}): boolean {
	const {
		get,
		key,
		jsonPath,
		oldArray,
		newArray,
		identificationField,
		action,
		currentDiffHistoryState,
		targetId,
		diffMarkerPaths,
	} = params;
	const { diffState, history, diffMode, computeState } =
		currentDiffHistoryState;

	// Create maps for easier lookup
	const oldMap = new Map(
		oldArray.map((item) => [getItemIdentifier(item, identificationField), item])
	);
	const newMap = new Map(
		newArray.map((item) => [getItemIdentifier(item, identificationField), item])
	);

	// Identify all items that have differences between old and new state
	const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);
	const changedIds = new Set<unknown>();

	// Find which items have changed
	for (const id of allIds) {
		// If targetId is specified, only process that specific item
		if (targetId !== undefined && id !== targetId) {
			continue;
		}

		const oldItem = oldMap.get(id);
		const newItem = newMap.get(id);

		if (!oldItem && newItem) {
			// Item was added
			changedIds.add(id);
		} else if (oldItem && !newItem) {
			// Item was removed (shouldn't happen in newState, but handle it)
			changedIds.add(id);
		} else if (oldItem && newItem) {
			// Check if item has changed
			if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
				changedIds.add(id);
			}
		}
	}

	if (changedIds.size === 0) {
		return false; // No differences to process (or targetId not found)
	}

	// Process based on action
	let resultArray: T[] = [];

	if (action === 'accept') {
		// Accept changes - use the new state but remove any diff markers
		resultArray = newArray.map((item) => {
			const itemId = getItemIdentifier(item, identificationField);

			// When targetId is specified, only process that item
			if (targetId !== undefined && itemId !== targetId) {
				// Not the target - keep as is (don't remove diff markers)
				return item;
			}

			// If targetId is specified, only process the target item
			// If no targetId, process all changed items
			const shouldProcessItem = targetId === undefined || itemId === targetId;

			if (!shouldProcessItem || !changedIds.has(itemId)) {
				// Item hasn't changed or shouldn't be processed, keep as is
				return item;
			}
			// Item has changed and should be processed, remove any diff markers if they exist
			return removeDiffMarkers(item, diffMarkerPaths);
		});
	} else if (action === 'reject') {
		// Reject changes - revert to old state for changed items

		// When targetId is specified, we need to handle single-item rejection differently
		if (targetId !== undefined) {
			// Process all items from newArray, but only revert the targeted one
			for (const item of newArray) {
				const itemId = getItemIdentifier(item, identificationField);

				if (itemId === targetId && changedIds.has(itemId)) {
					// This is the targeted item with changes
					const oldItem = oldMap.get(itemId);
					if (oldItem) {
						// Item was changed - revert to old version
						resultArray.push(oldItem);
					}
					// If oldItem doesn't exist, it means this was added - exclude it
				} else {
					// Not the target item - keep as is in new state
					resultArray.push(item);
				}
			}
		} else {
			// Original logic for rejecting all changes
			for (const item of oldArray) {
				const itemId = getItemIdentifier(item, identificationField);
				if (changedIds.has(itemId)) {
					// This item has changes, use the old version
					resultArray.push(item);
				} else {
					// No changes, keep the current version (which should be same as old)
					const newItem = newMap.get(itemId);
					if (newItem) {
						resultArray.push(newItem);
					}
				}
			}
			// Don't include items that were added (not in oldArray)
			// They will be excluded naturally since we're iterating over oldArray
		}
	}

	// Update the state with the modified array
	const newStateWithUpdatedArray = setValueAtPathForDiff(
		diffState.newState,
		jsonPath,
		resultArray
	);

	// For single-item operations, we need to carefully preserve diff markers
	let finalOldState = diffState.oldState;
	const finalNewState = newStateWithUpdatedArray;
	let finalComputedState: T;

	if (targetId !== undefined) {
		// Single-item operation - we need to preserve diff markers for other items
		// Get the current computed state with all diff markers
		const currentComputedArray = getValueAtPath(
			diffState.computedState,
			jsonPath
		) as T[];

		// Build the final computed array by:
		// 1. Taking the processed item from resultArray (with diff marker removed if accepted)
		// 2. Keeping all other items from currentComputedArray (with their diff markers intact)
		const finalComputedArray = currentComputedArray
			.map((item: T) => {
				const itemId = getItemIdentifier(item, identificationField);
				if (itemId === targetId) {
					// This is the target item - use the processed version from resultArray
					const processedItem = resultArray.find(
						(i) => getItemIdentifier(i, identificationField) === targetId
					);
					return processedItem || item;
				}
				// Not the target - keep as is with diff markers
				return item;
			})
			.filter((item: T) => {
				// For reject action on added items, filter out the rejected item
				if (action === 'reject') {
					const itemId = getItemIdentifier(item, identificationField);
					if (itemId === targetId) {
						// Check if this was an added item that should be removed
						const oldItem = oldMap.get(itemId);
						if (!oldItem) {
							// Item was added and is being rejected - remove it
							return false;
						}
					}
				}
				return true;
			});

		// Set the final computed state directly
		finalComputedState = setValueAtPathForDiff(
			diffState.computedState,
			jsonPath,
			finalComputedArray
		) as T;

		// Update oldState for accepted items to prevent re-diffing
		if (action === 'accept') {
			const updatedOldArray = [...oldArray];
			const targetIndex = updatedOldArray.findIndex(
				(item) => getItemIdentifier(item, identificationField) === targetId
			);
			const acceptedItem = resultArray.find(
				(item) => getItemIdentifier(item, identificationField) === targetId
			);

			if (acceptedItem) {
				if (targetIndex >= 0) {
					updatedOldArray[targetIndex] = acceptedItem;
				} else {
					updatedOldArray.push(acceptedItem);
				}
				finalOldState = setValueAtPathForDiff(
					diffState.oldState,
					jsonPath,
					updatedOldArray
				);
			}
		}
	} else {
		// Accept/reject all - bypass computeState to avoid re-adding diff markers
		finalComputedState = newStateWithUpdatedArray;
		if (action === 'accept') {
			finalOldState = newStateWithUpdatedArray;
		}
	}

	// Check if we're still in diff mode
	const stillInDiffMode =
		targetId !== undefined
			? // For single-item, check if computed state has any remaining diff markers
			  (() => {
					const computedArray = getValueAtPath(
						finalComputedState,
						jsonPath
					) as T[];
					const pathsToCheck = diffMarkerPaths || [
						'/data/diff',
						'/diff',
						'/meta/diff',
					];
					return (
						computedArray?.some((item: T) => {
							for (const path of pathsToCheck) {
								const diffValue = getValueAtPath(item, path);
								if (
									diffValue === 'added' ||
									diffValue === 'changed' ||
									diffValue === 'removed'
								) {
									return true;
								}
							}
							return false;
						}) || false
					);
			  })()
			: false; // For accept/reject all, no more diffs

	const updatedDiffState: DiffState<T> = {
		oldState: finalOldState,
		newState: finalNewState,
		computedState: finalComputedState,
		isDiffMode: stillInDiffMode,
		patches: [],
	};

	// Save current state to history
	const updatedHistory = [...history, diffState];

	const updatedDiffHistoryState: DiffHistoryState<T> = {
		diffState: updatedDiffState,
		history: updatedHistory,
		redoStack: [], // Clear redo stack on changes
		diffMode,
		computeState,
	};

	// Update the store
	get().setDiffState(key, updatedDiffHistoryState);

	return true;
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
			stateSetters,
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
				stateSetters,
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
				get().newDiffState(key, value);
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
		const newState = diffHistoryState.diffState.computedState;
		if (newState !== undefined) {
			// Get the registered state to check if it exists
			const registeredState = get().registeredStates?.[key];
			if (!registeredState) {
				// // Register the state if it doesn't exist
				get().registerState({
					key,
					value: newState,
					// Change
					description: `Diff-tracked state: ${key}`,
				});
			} else {
				// Only update if the value has actually changed
				// This prevents unnecessary re-renders and potential loops
				const currentValue = registeredState.value;

				if (!isEqual(currentValue, newState)) {
					// Update the value in registeredStates
					set(
						(state) =>
							({
								registeredStates: {
									...state.registeredStates,
									[key]: {
										...state.registeredStates[key],
										value: newState as BasicStateValue,
									},
								},
							} as Partial<CedarStore>)
					);
					registeredState.setValue?.(newState as BasicStateValue);
				}
			}
		}
	},

	newDiffState: <T>(key: string, newState: T, isDiffChange?: boolean) => {
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

		// If isDiffChange is not provided, use the current diff state's isDiffMode
		const effectiveIsDiffChange = isDiffChange ?? originalDiffState.isDiffMode;

		// Step 1: Save the original diffState to history
		const updatedHistory = [...history, originalDiffState];

		// Step 3: Create the new diffState based on isDiffChange flag
		let oldStateForDiff: T;
		if (!effectiveIsDiffChange) {
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
			isDiffMode: effectiveIsDiffChange,
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
				registeredState.setValue?.(newState as BasicStateValue);
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
		args?: unknown
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

		// Try stateSetters first, then fall back to customSetters for backward compatibility
		const stateSetters =
			registeredState.stateSetters || registeredState.customSetters;
		if (!stateSetters || !stateSetters[setterKey]) {
			console.warn(`State setter "${setterKey}" not found for state "${key}"`);
			return;
		}

		// Create a temporary state holder to capture the result
		let resultState: BasicStateValue = currentNewState as BasicStateValue;

		// Create a setValue function that will be passed to the custom setter
		const setValueFunc = (newValue: BasicStateValue) => {
			resultState = newValue;
		};

		try {
			// Execute the state setter with current state, setValue, and args
			const setter = stateSetters[setterKey];
			setter.execute(currentNewState as BasicStateValue, setValueFunc, args);

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

	acceptDiff: <T>(
		key: string,
		jsonPath: string,
		identificationField: string | ((item: T) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	): boolean => {
		return handleSingleDiff(
			get,
			key,
			jsonPath,
			identificationField,
			'accept',
			targetId,
			diffMarkerPaths
		);
	},

	rejectDiff: <T>(
		key: string,
		jsonPath: string,
		identificationField: string | ((item: T) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	): boolean => {
		return handleSingleDiff(
			get,
			key,
			jsonPath,
			identificationField,
			'reject',
			targetId,
			diffMarkerPaths
		);
	},
});

import { useEffect, useCallback, useMemo, useRef } from 'react';
import type { ZodSchema } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import type {
	BasicStateValue,
	Setter,
	SetterFunction,
} from '@/store/stateSlice/stateSlice';
import type { DiffMode, DiffState, DiffHistoryState } from './diffHistorySlice';
import { compare, Operation } from 'fast-json-patch';

/**
 * Function that computes the final state based on old and new states.
 * Can be used to add diff markers or transform the state before setting.
 */
export type ComputeStateFunction<T> = (
	oldState: T,
	newState: T,
	patches: Operation[]
) => T;

/**
 * Configuration for registerCedarDiffState
 */
export interface RegisterCedarDiffStateConfig<T extends BasicStateValue> {
	key: string;
	value: T;
	setValue?: SetterFunction<T>;
	description?: string;
	schema?: ZodSchema<T>;
	customSetters?: Record<string, Setter<T>>;
	diffMode?: DiffMode;
	computeState?: ComputeStateFunction<T>;
}

/**
 * Return type for registerCedarDiffState
 */
export interface CedarDiffStateReturn<T> {
	computedState: T;
	oldState: T | undefined;
	newState: T | undefined;
	undo: () => boolean;
	redo: () => boolean;
	acceptAllDiffs: () => boolean;
	rejectAllDiffs: () => boolean;
}

/**
 * Utility function to add diff markers to array objects
 * Compares arrays and adds 'diff' field to objects based on changes
 * @param oldState - The previous state array
 * @param newState - The new state array
 * @param idField - The field to use as unique identifier (default: 'id')
 * @param diffPath - JSON path where to add the diff field (default: '' for root level, '/data' for nested)
 */
export function addDiffToArrayObjs<T extends Record<string, unknown>>(
	oldState: T[],
	newState: T[],
	idField: string = 'id',
	diffPath: string = ''
): T[] {
	const oldMap = new Map(oldState.map((item) => [item[idField], item]));

	return newState.map((item) => {
		const id = item[idField];
		const oldItem = oldMap.get(id);

		let diffType: 'added' | 'changed' | null = null;

		if (!oldItem) {
			// Item was added
			diffType = 'added';
		} else {
			// Check if item was changed
			const patches = compare(oldItem, item);
			if (patches.length > 0) {
				diffType = 'changed';
			}
		}

		// If no changes, return item as is
		if (!diffType) {
			return item;
		}

		// Add diff field at the specified path
		return setValueAtPath(item, diffPath, diffType);
	});
}

/**
 * Helper function to set a value at a JSON path
 * @param obj - The object to modify
 * @param path - JSON path (e.g., '', '/data', '/nested/field')
 * @param value - The value to set
 */
function setValueAtPath<T>(obj: T, path: string, value: unknown): T {
	// Handle root level (empty path)
	if (!path || path === '' || path === '/') {
		return { ...obj, diff: value };
	}

	// Parse the path (remove leading slash and split by slash)
	const pathParts = path.startsWith('/')
		? path.slice(1).split('/')
		: path.split('/');

	// Create a deep copy of the object
	const result = JSON.parse(JSON.stringify(obj));

	// Navigate to the target location
	let current = result;
	for (let i = 0; i < pathParts.length - 1; i++) {
		const part = pathParts[i];
		if (!(part in current)) {
			current[part] = {};
		}
		current = current[part];
	}

	// Set the value at the final path
	const lastPart = pathParts[pathParts.length - 1];
	if (typeof current === 'object' && current !== null) {
		current[lastPart] = { ...current[lastPart], diff: value };
	}

	return result;
}

/**
 * Hook version of registerCedarDiffState for use in React components
 * Enhanced version of useRegisterState that includes diff history management
 * Automatically tracks changes, computes state transformations, and provides undo/redo
 *
 * @example
 * ```typescript
 * // For React Flow nodes, add diff markers to the data property
 * const nodesDiff = useRegisterCedarDiffState({
 *   key: 'nodes',
 *   value: nodes,
 *   setValue: setNodes,
 *   description: 'Product roadmap nodes',
 *   computeState: (oldState, newState) => {
 *     return addDiffToArrayObjs(oldState, newState, 'id', '/data');
 *   },
 *   customSetters: {
 *     addNode: {
 *       name: 'addNode',
 *       description: 'Add a new node',
 *       parameters: [{ name: 'node', type: 'Node', description: 'Node to add' }],
 *       execute: (currentNodes, node) => {
 *         setNodes([...currentNodes, node]); // Diff markers added automatically
 *       }
 *     }
 *   }
 * });
 *
 * // Access the computed state and diff operations
 * const { computedState, undo, redo, acceptAllDiffs, rejectAllDiffs } = nodesDiff;
 * ```
 */
export function useRegisterCedarDiffState<T extends BasicStateValue>(
	config: RegisterCedarDiffStateConfig<T>
): CedarDiffStateReturn<T> {
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

	const store = useCedarStore();
	const {
		registerState,
		getDiffHistoryState,
		setDiffHistoryState,
		setDiffState,
		getCleanState,
		getCedarState,
		undo: undoFn,
		redo: redoFn,
		acceptAllDiffs: acceptFn,
		rejectAllDiffs: rejectFn,
	} = store;

	// Use refs to track initialization and avoid infinite loops
	const initializedRef = useRef(false);

	// Initialize diff history state if it doesn't exist
	useEffect(() => {
		if (initializedRef.current) return;

		const existingDiffState = getDiffHistoryState<T>(key);
		if (!existingDiffState) {
			const initialDiffState: DiffState<T> = {
				oldState: value,
				newState: value,
				isDiffMode: false,
				patches: [],
			};
			const initialDiffHistoryState: DiffHistoryState<T> = {
				diffState: initialDiffState,
				history: [],
				redoStack: [],
				diffMode,
			};
			setDiffHistoryState(key, initialDiffHistoryState);
			initializedRef.current = true;
		}
	}, [key, value, diffMode, getDiffHistoryState, setDiffHistoryState]);

	// Store refs for stable callbacks
	const setValueRef = useRef(setValue);
	const computeStateRef = useRef(computeState);
	const enhancedSetValueRef = useRef<SetterFunction<T> | null>(null);

	useEffect(() => {
		setValueRef.current = setValue;
		computeStateRef.current = computeState;
	}, [setValue, computeState]);

	// Enhanced setValue that goes through computeState and updates both diff state and regular state
	const enhancedSetValue = useCallback<SetterFunction<T>>(
		(newValue: T) => {
			const currentDiffHistoryState = getDiffHistoryState<T>(key);
			if (!currentDiffHistoryState) {
				// If no diff state exists yet, initialize it first
				const initialDiffState: DiffState<T> = {
					oldState: value,
					newState: value,
					isDiffMode: false,
					patches: [],
				};
				const initialDiffHistoryState: DiffHistoryState<T> = {
					diffState: initialDiffState,
					history: [],
					redoStack: [],
					diffMode,
				};
				setDiffHistoryState(key, initialDiffHistoryState);

				// Now proceed with the update
				const patches = compare(value as object, newValue as object);
				const computedState = computeStateRef.current
					? computeStateRef.current(value, newValue, patches)
					: newValue;

				// Update the diff state
				setDiffState<T>(key, computedState, true);

				// Call the original setValue with computed state
				if (setValueRef.current) {
					setValueRef.current(computedState);
				}
				return;
			}

			const oldState = currentDiffHistoryState.diffState.oldState;
			const patches = compare(oldState as object, newValue as object);

			// Apply computeState if provided
			const computedState = computeStateRef.current
				? computeStateRef.current(oldState, newValue, patches)
				: newValue;

			// Update the diff state
			setDiffState<T>(key, computedState, true);

			// Call the original setValue with computed state
			if (setValueRef.current) {
				setValueRef.current(computedState);
			}
		},
		[
			key,
			value,
			getDiffHistoryState,
			setDiffHistoryState,
			setDiffState,
			diffMode,
		]
	);

	// Store the enhanced setValue in a ref so custom setters can use it
	useEffect(() => {
		enhancedSetValueRef.current = enhancedSetValue;
	}, [enhancedSetValue]);

	// Create enhanced custom setters that integrate with diff history
	const enhancedCustomSetters = useMemo(() => {
		if (!customSetters) return undefined;

		const enhanced: Record<string, Setter<T>> = {};

		for (const [setterName, setter] of Object.entries(customSetters)) {
			enhanced[setterName] = {
				...setter,
				execute: (...args: unknown[]) => {
					// Get current state from Cedar store (the clean state)
					const currentState = (getCedarState(key) as T) ?? value;

					// Ensure diff history state exists
					const currentDiffHistoryState = getDiffHistoryState<T>(key);
					if (!currentDiffHistoryState) {
						// Initialize it if needed
						const initialDiffState: DiffState<T> = {
							oldState: currentState,
							newState: currentState,
							isDiffMode: false,
							patches: [],
						};
						const initialDiffHistoryState: DiffHistoryState<T> = {
							diffState: initialDiffState,
							history: [],
							redoStack: [],
							diffMode,
						};
						setDiffHistoryState(key, initialDiffHistoryState);
					}

					// Execute the original setter
					// The setter should call setValue which triggers our enhancedSetValue
					if ('execute' in setter && typeof setter.execute === 'function') {
						setter.execute(currentState, ...args);
					}
				},
			};
		}

		return enhanced;
	}, [
		customSetters,
		key,
		value,
		getDiffHistoryState,
		setDiffHistoryState,
		getCedarState,
		diffMode,
	]);

	// Register state with enhanced setValue and custom setters
	// We register once and rely on the enhancedSetValue to keep things in sync
	useEffect(() => {
		registerState<T>({
			key,
			value,
			setValue: enhancedSetValue,
			description,
			customSetters: enhancedCustomSetters,
			schema,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		key,
		// Only re-register when key changes
		// The enhancedSetValue and customSetters handle value updates
	]);

	// Get current states
	const diffHistoryState = getDiffHistoryState<T>(key);
	const computedState = getCleanState<T>(key) ?? value;
	const oldState = diffHistoryState?.diffState.oldState;
	const newState = diffHistoryState?.diffState.newState;

	// Create bound undo/redo functions with callbacks to sync state
	const undo = useCallback(() => {
		const result = undoFn(key);
		if (result && setValueRef.current) {
			// After undo, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValueRef.current(cleanState);
			}
		}
		return result;
	}, [key, undoFn, getCleanState]);

	const redo = useCallback(() => {
		const result = redoFn(key);
		if (result && setValueRef.current) {
			// After redo, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValueRef.current(cleanState);
			}
		}
		return result;
	}, [key, redoFn, getCleanState]);

	const acceptAllDiffs = useCallback(() => {
		const result = acceptFn(key);
		if (result && setValueRef.current) {
			// After accepting, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValueRef.current(cleanState);
			}
		}
		return result;
	}, [key, acceptFn, getCleanState]);

	const rejectAllDiffs = useCallback(() => {
		const result = rejectFn(key);
		if (result && setValueRef.current) {
			// After rejecting, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValueRef.current(cleanState);
			}
		}
		return result;
	}, [key, rejectFn, getCleanState]);

	return {
		computedState,
		oldState,
		newState,
		undo,
		redo,
		acceptAllDiffs,
		rejectAllDiffs,
	};
}

/**
 * Alias for backwards compatibility
 */
export const registerCedarDiffState = useRegisterCedarDiffState;

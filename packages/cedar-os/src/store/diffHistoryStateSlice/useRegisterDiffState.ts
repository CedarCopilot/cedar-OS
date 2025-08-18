import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import type {
	BasicStateValue,
	Setter,
	SetterFunction,
} from '@/store/stateSlice/stateSlice';
import type {
	DiffMode,
	DiffState,
	DiffHistoryState,
	ComputeStateFunction,
} from './diffHistorySlice';
import { compare } from 'fast-json-patch';

/**
 * Configuration for registerDiffState
 */
export interface RegisterDiffStateConfig<T extends BasicStateValue> {
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
 * Return type for registerDiffState
 */
export interface DiffStateReturn<T> {
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
 * Hook version of registerDiffState for use in React components
 * Sets up diff tracking for a state without overriding setters.
 * The stateSlice will automatically notify diffHistorySlice of changes.
 *
 * @example
 * ```typescript
 * // For React Flow nodes, add diff markers to the data property
 * const nodesDiff = useRegisterDiffState({
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
 *         setNodes([...currentNodes, node]); // Diff tracking happens automatically
 *       }
 *     }
 *   }
 * });
 *
 * // Access the computed state and diff operations
 * const { computedState, undo, redo, acceptAllDiffs, rejectAllDiffs } = nodesDiff;
 * ```
 */
export function useRegisterDiffState<T extends BasicStateValue>({
	key,
	value,
	setValue,
	description,
	schema,
	customSetters,
	diffMode = 'defaultAccept',
	computeState,
}: RegisterDiffStateConfig<T>): DiffStateReturn<T> {
	const store = useCedarStore();
	const {
		registerState,
		getDiffHistoryState,
		setDiffHistoryState,
		setComputeStateFunction,
		getComputedState,
		getCleanState,
		undo: undoFn,
		redo: redoFn,
		acceptAllDiffs: acceptFn,
		rejectAllDiffs: rejectFn,
	} = store;

	// Initialize diff history state if it doesn't exist
	useEffect(() => {
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
				computeState,
			};
			setDiffHistoryState(key, initialDiffHistoryState);
		} else if (computeState !== existingDiffState.computeState) {
			// Update the computeState function if it changed
			setComputeStateFunction(key, computeState);
		}
	}, [
		key,
		value,
		diffMode,
		computeState,
		getDiffHistoryState,
		setDiffHistoryState,
		setComputeStateFunction,
	]);

	// Register the state in stateSlice (without overriding setValue)
	// The stateSlice will automatically notify diffHistorySlice of changes
	useEffect(() => {
		registerState<T>({
			key,
			value,
			setValue,
			description,
			customSetters,
			schema,
		});
	}, [key, value, setValue, description, customSetters, schema, registerState]);

	// Get current states
	const diffHistoryState = getDiffHistoryState<T>(key);
	const oldState = diffHistoryState?.diffState.oldState;
	const newState = diffHistoryState?.diffState.newState;

	// Get the computed state from the slice (it applies computeState internally)
	const computedState = getComputedState<T>(key) ?? value;

	// Create bound undo/redo functions
	const undo = useCallback(() => {
		const result = undoFn(key);
		if (result && setValue) {
			// After undo, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValue(cleanState);
			}
		}
		return result;
	}, [key, undoFn, getCleanState, setValue]);

	const redo = useCallback(() => {
		const result = redoFn(key);
		if (result && setValue) {
			// After redo, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValue(cleanState);
			}
		}
		return result;
	}, [key, redoFn, getCleanState, setValue]);

	const acceptAllDiffs = useCallback(() => {
		const result = acceptFn(key);
		if (result && setValue) {
			// After accepting, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValue(cleanState);
			}
		}
		return result;
	}, [key, acceptFn, getCleanState, setValue]);

	const rejectAllDiffs = useCallback(() => {
		const result = rejectFn(key);
		if (result && setValue) {
			// After rejecting, sync the clean state with setValue
			const cleanState = getCleanState<T>(key);
			if (cleanState !== undefined) {
				setValue(cleanState);
			}
		}
		return result;
	}, [key, rejectFn, getCleanState, setValue]);

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
export const registerDiffState = useRegisterDiffState;

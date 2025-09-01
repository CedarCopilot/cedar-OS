import { useCallback, useEffect, useRef } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue, Setter } from '@/store/stateSlice/stateSlice';
import type { ComputeStateFunction, DiffMode } from './diffHistorySlice';

/**
 * Hook that registers and returns a diff-tracked state from the Cedar store,
 * working like React's useState but with automatic diff tracking and history.
 *
 * This is a simpler alternative to useRegisterDiffState that provides a
 * useState-like API while handling all diff tracking internally.
 *
 * @param key Unique key for the state in the store.
 * @param initialValue Initial value for the state.
 * @param options Optional configuration for the diff state.
 * @returns [state, setState] tuple where state is the computed state with diffs applied.
 *
 * @example
 * ```typescript
 * // Simple usage - just like useState but with diff tracking
 * const [nodes, setNodes] = useDiffState('nodes', initialNodes);
 *
 * // With options for diff visualization
 * const [nodes, setNodes] = useDiffState('nodes', initialNodes, {
 *   description: 'Product roadmap nodes',
 *   diffMode: 'holdAccept',
 *   computeState: (oldState, newState) => {
 *     return addDiffToArrayObjs(oldState, newState, 'id', '/data');
 *   }
 * });
 *
 * // With custom setters
 * const [nodes, setNodes] = useDiffState('nodes', initialNodes, {
 *   customSetters: {
 *     addNode: {
 *       name: 'addNode',
 *       description: 'Add a new node',
 *       parameters: [{ name: 'node', type: 'Node', description: 'Node to add' }],
 *       execute: (currentNodes, setValue, node) => {
 *         setValue([...currentNodes, node]);
 *       }
 *     }
 *   }
 * });
 * ```
 */
export function useDiffState<T extends BasicStateValue>(
	key: string,
	initialValue: T,
	options?: {
		description?: string;
		stateSetters?: Record<string, Setter<T>>;
		schema?: ZodSchema<T>;
		diffMode?: DiffMode;
		computeState?: ComputeStateFunction<T>;
	}
): [T, (newValue: T) => void] {
	// Determine Zod schema to use
	const effectiveSchema =
		options?.schema ?? (z.any() as unknown as ZodSchema<T>);

	// Get store functions
	const store = useCedarStore();
	const { registerDiffState, getComputedState, newDiffState } = store;

	// Use a ref to track if we've already registered
	const hasRegistered = useRef(false);

	// Register the diff state only once on mount
	useEffect(() => {
		if (!hasRegistered.current) {
			hasRegistered.current = true;
			registerDiffState({
				key,
				value: initialValue,
				// setValue is intentionally omitted to avoid circular dependencies
				description: options?.description,
				schema: effectiveSchema,
				stateSetters: options?.stateSetters,
				diffMode: options?.diffMode,
				computeState: options?.computeState,
			});
		}
	}, []); // Empty dependency array - register only once

	// Get the computed state from the store
	const computedState = getComputedState<T>(key) ?? initialValue;

	// Create a stable setter function that uses setDiffState
	const setState = useCallback(
		(newValue: T) => {
			// Use newDiffState directly for user updates
			// This will handle all the diff tracking internally
			newDiffState(key, newValue);
		},
		[key, newDiffState]
	);

	// Return the computed state and the setter
	return [computedState, setState];
}

/**
 * Hook that provides access to diff operations for a state registered with useDiffState.
 * This allows components to access undo/redo and diff management functions without
 * needing to manage the state registration themselves.
 *
 * @param key The key of the diff state to access operations for.
 * @returns Object with diff operation functions, or null if state not found.
 *
 * @example
 * ```typescript
 * // In one component, register the diff state
 * const [nodes, setNodes] = useDiffState('nodes', initialNodes);
 *
 * // In another component, access diff operations
 * const nodesDiffOps = useDiffStateOperations('nodes');
 * if (nodesDiffOps) {
 *   const { undo, redo, acceptAllDiffs, rejectAllDiffs } = nodesDiffOps;
 *   // Use the operations...
 * }
 * ```
 */
export function useDiffStateOperations<T extends BasicStateValue>(
	key: string
): {
	undo: () => boolean;
	redo: () => boolean;
	acceptAllDiffs: () => boolean;
	rejectAllDiffs: () => boolean;
	oldState: T | undefined;
	newState: T | undefined;
} | null {
	const store = useCedarStore();
	const {
		getDiffHistoryState,
		undo: undoFn,
		redo: redoFn,
		acceptAllDiffs: acceptFn,
		rejectAllDiffs: rejectFn,
	} = store;

	// Get current diff history state
	const diffHistoryState = getDiffHistoryState<T>(key);

	// Create bound functions - must be before conditional return
	const undo = useCallback(() => undoFn(key), [key, undoFn]);
	const redo = useCallback(() => redoFn(key), [key, redoFn]);
	const acceptAllDiffs = useCallback(() => acceptFn(key), [key, acceptFn]);
	const rejectAllDiffs = useCallback(() => rejectFn(key), [key, rejectFn]);

	// If no diff state exists, return null
	if (!diffHistoryState) {
		return null;
	}

	return {
		undo,
		redo,
		acceptAllDiffs,
		rejectAllDiffs,
		oldState: diffHistoryState.diffState.oldState,
		newState: diffHistoryState.diffState.newState,
	};
}

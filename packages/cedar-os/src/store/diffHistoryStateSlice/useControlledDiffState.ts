import { useCallback, useEffect, useRef } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue, Setter } from '@/store/stateSlice/stateSlice';
import type {
	ComputeStateFunction,
	DiffMode,
	DiffState,
} from './diffHistorySlice';

/**
 * Options for useControlledDiffState hook
 */
export interface UseControlledDiffStateOptions<T extends BasicStateValue> {
	description?: string;
	stateSetters?: Record<string, Setter<T>>;
	schema?: ZodSchema<T>;
	diffMode?: DiffMode;
	computeState?: ComputeStateFunction<T>;
}

/**
 * Return type for useControlledDiffState hook
 */
export interface ControlledDiffStateReturn<T extends BasicStateValue> {
	/** The current computed state with diff markers applied */
	state: T;
	/** The current diff state information */
	diffState: DiffState<T> | undefined;
	/** Set state without creating a diff (updates both old and new state) */
	setState: (newValue: T) => void;
	/** Create a new diff state (updates only new state, keeping old state for comparison) */
	newDiffState: (newValue: T) => void;
	/** Save the current state as a version in history */
	saveVersion: () => void;
	/** Undo to the previous state in history */
	undo: () => boolean;
	/** Redo to the next state in history */
	redo: () => boolean;
	/** Accept all current diffs */
	acceptAllDiffs: () => boolean;
	/** Reject all current diffs */
	rejectAllDiffs: () => boolean;
	/** Accept a specific diff */
	acceptDiff: <ItemT = T>(
		jsonPath: string,
		identificationField: string | ((item: ItemT) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	) => boolean;
	/** Reject a specific diff */
	rejectDiff: <ItemT = T>(
		jsonPath: string,
		identificationField: string | ((item: ItemT) => unknown),
		targetId?: unknown,
		diffMarkerPaths?: string[]
	) => boolean;
	/** Execute a custom setter with diff tracking */
	executeDiffSetter: (
		setterKey: string,
		options?: { isDiff?: boolean },
		args?: unknown
	) => void;
	/** Check if currently in diff mode */
	isDiffMode: boolean;
	/** Get the old state (before changes) */
	oldState: T | undefined;
	/** Get the new state (with changes) */
	newState: T | undefined;
}

/**
 * Hook that provides controlled diff state management with manual control over
 * when diffs are created, saved, and managed. Unlike useRegisterDiffState which
 * automatically tracks changes, this hook gives you explicit control over all
 * diff operations.
 *
 * @param key Unique key for the state in the store.
 * @param initialValue Initial value for the state.
 * @param options Optional configuration for the diff state.
 * @returns Object with state and all diff control functions.
 *
 * @example
 * ```typescript
 * // Basic usage with manual diff control
 * const diffControl = useControlledDiffState('nodes', initialNodes, {
 *   description: 'Product roadmap nodes',
 *   diffMode: 'holdAccept',
 *   computeState: (oldState, newState) => {
 *     return addDiffToArrayObjs(oldState, newState, 'id', '/data');
 *   }
 * });
 *
 * const {
 *   state,           // Current computed state with diff markers
 *   setState,        // Set state without creating a diff
 *   newDiffState,    // Create a new diff state
 *   saveVersion,     // Save current state to history
 *   undo,            // Undo to previous version
 *   redo,            // Redo to next version
 *   acceptAllDiffs,  // Accept all current diffs
 *   rejectAllDiffs,  // Reject all current diffs
 *   isDiffMode       // Check if in diff mode
 * } = diffControl;
 *
 * // Update state without creating a diff (both old and new state updated)
 * setState(newNodes);
 *
 * // Create a diff between current and new state
 * newDiffState(modifiedNodes);
 *
 * // Save current state as a version before making changes
 * saveVersion();
 * newDiffState(experimentalNodes);
 *
 * // If changes are good, accept them
 * acceptAllDiffs();
 * // Or reject them to revert
 * rejectAllDiffs();
 * ```
 */
export function useControlledDiffState<T extends BasicStateValue>(
	key: string,
	initialValue: T,
	options?: UseControlledDiffStateOptions<T>
): ControlledDiffStateReturn<T> {
	// Determine Zod schema to use
	const effectiveSchema =
		options?.schema ?? (z.any() as unknown as ZodSchema<T>);

	// Get store functions
	const store = useCedarStore();
	const {
		registerDiffState,
		getComputedState,
		getDiffHistoryState,
		newDiffState: newDiffStateFn,
		setDiffState,
		undo: undoFn,
		redo: redoFn,
		acceptAllDiffs: acceptFn,
		rejectAllDiffs: rejectFn,
		acceptDiff: acceptDiffFn,
		rejectDiff: rejectDiffFn,
		executeDiffSetter: executeDiffSetterFn,
	} = store;

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
				diffMode: options?.diffMode ?? 'defaultAccept',
				computeState: options?.computeState,
			});
		}
	}, []); // Empty dependency array - register only once

	// Get the current state and diff information
	const computedState = getComputedState<T>(key) ?? initialValue;
	const diffHistoryState = getDiffHistoryState<T>(key);
	const diffState = diffHistoryState?.diffState;

	// Create stable callback functions

	/**
	 * Set state without creating a diff - updates both old and new state
	 * Use this when you want to update the base state without tracking changes
	 */
	const setState = useCallback(
		(newValue: T) => {
			// Update state without creating a diff (isDiffChange = false)
			newDiffStateFn(key, newValue, false);
		},
		[key, newDiffStateFn]
	);

	/**
	 * Create a new diff state - updates only new state, keeping old state for comparison
	 * Use this when you want to track changes for review
	 */
	const newDiffState = useCallback(
		(newValue: T) => {
			// Create a diff change (isDiffChange = true)
			newDiffStateFn(key, newValue, true);
		},
		[key, newDiffStateFn]
	);

	/**
	 * Save the current state as a version in history
	 * Use this before making experimental changes you might want to revert
	 */
	const saveVersion = useCallback(() => {
		if (!diffHistoryState) return;

		const { diffState: currentDiffState, history } = diffHistoryState;

		// Save current state to history
		const updatedHistory = [...history, currentDiffState];

		// Update the diff history state with the new history
		const updatedDiffHistoryState = {
			...diffHistoryState,
			history: updatedHistory,
		};

		setDiffState(key, updatedDiffHistoryState);
	}, [key, diffHistoryState, setDiffState]);

	// Bound operation functions
	const undo = useCallback(() => undoFn(key), [key, undoFn]);
	const redo = useCallback(() => redoFn(key), [key, redoFn]);
	const acceptAllDiffs = useCallback(() => acceptFn(key), [key, acceptFn]);
	const rejectAllDiffs = useCallback(() => rejectFn(key), [key, rejectFn]);

	const acceptDiff = useCallback(
		<ItemT = T>(
			jsonPath: string,
			identificationField: string | ((item: ItemT) => unknown),
			targetId?: unknown,
			diffMarkerPaths?: string[]
		) => {
			return acceptDiffFn<ItemT>(
				key,
				jsonPath,
				identificationField,
				targetId,
				diffMarkerPaths
			);
		},
		[key, acceptDiffFn]
	);

	const rejectDiff = useCallback(
		<ItemT = T>(
			jsonPath: string,
			identificationField: string | ((item: ItemT) => unknown),
			targetId?: unknown,
			diffMarkerPaths?: string[]
		) => {
			return rejectDiffFn<ItemT>(
				key,
				jsonPath,
				identificationField,
				targetId,
				diffMarkerPaths
			);
		},
		[key, rejectDiffFn]
	);

	const executeDiffSetter = useCallback(
		(setterKey: string, options?: { isDiff?: boolean }, args?: unknown) => {
			executeDiffSetterFn(key, setterKey, options, args);
		},
		[key, executeDiffSetterFn]
	);

	return {
		state: computedState,
		diffState,
		setState,
		newDiffState,
		saveVersion,
		undo,
		redo,
		acceptAllDiffs,
		rejectAllDiffs,
		acceptDiff,
		rejectDiff,
		executeDiffSetter,
		isDiffMode: diffState?.isDiffMode ?? false,
		oldState: diffState?.oldState,
		newState: diffState?.newState,
	};
}

/**
 * Helper function to add diff markers to array objects (re-exported from useRegisterDiffState)
 * Use this in your computeState function to visualize changes in arrays
 */
export { addDiffToArrayObjs } from './useRegisterDiffState';

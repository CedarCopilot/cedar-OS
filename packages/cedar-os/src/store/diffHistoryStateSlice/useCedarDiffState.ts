import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod/v4';
import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue, Setter } from '@/store/stateSlice/stateSlice';
import type { DiffMode, DiffState, DiffHistoryState } from './diffHistorySlice';

/**
 * Hook that registers and returns a piece of state from the Cedar store with diff management,
 * working as a superset of useCedarState but with diff tracking and history.
 *
 * @param key Unique key for the state in the store.
 * @param initialValue Initial value for the state.
 * @param diffMode Mode for handling diffs: 'defaultAccept' or 'holdAccept'.
 * @param description Optional human-readable description for AI metadata.
 * @param customSetters Optional custom setter functions for this state.
 * @param schema Optional Zod schema for validating the state.
 * @returns [cleanState, setState, diffState] tuple.
 */
export function useCedarDiffState<T extends BasicStateValue>(
	key: string,
	initialValue: T,
	diffMode: DiffMode,
	description?: string,
	customSetters?: Record<string, Setter<T>>,
	schema?: ZodSchema<T>
): [T, (newValue: T) => void, DiffState<T> | undefined] {
	// Determine Zod schema to use
	const effectiveSchema = schema ?? (z.any() as unknown as ZodSchema<T>);

	// Register state on first render (and only once) - this uses the same stateSlice as useCedarState
	const registerStateFn = useCedarStore((s) => s.registerState);
	useEffect(() => {
		registerStateFn<T>({
			key,
			value: initialValue,
			description,
			customSetters,
			schema: effectiveSchema,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	// Initialize diff history state if it doesn't exist
	const getDiffHistoryState = useCedarStore((s) => s.getDiffHistoryState);
	const getCleanState = useCedarStore((s) => s.getCleanState);
	const setDiffState = useCedarStore((s) => s.setDiffState);
	const newDiffState = useCedarStore((s) => s.newDiffState);

	useEffect(() => {
		const existingDiffState = getDiffHistoryState<T>(key);
		if (!existingDiffState) {
			const initialDiffState: DiffState<T> = {
				oldState: initialValue,
				newState: initialValue,
				computedState: initialValue,
				isDiffMode: false,
			};
			const initialDiffHistoryState: DiffHistoryState<T> = {
				diffState: initialDiffState,
				history: [initialDiffState],
				redoStack: [],
				diffMode,
			};
			setDiffState(key, initialDiffHistoryState);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	// Get the clean state based on diffMode
	const cleanState = getCleanState<T>(key) ?? initialValue;

	// Get the current diff state
	const diffHistoryState = getDiffHistoryState<T>(key);
	const diffState = diffHistoryState?.diffState;

	// Provide a setter that updates both the regular state and diff state
	const stableSetState = useCallback(
		(newValue: T) => {
			// Update the regular state slice (like useCedarState does)
			registerStateFn<T>({
				key,
				value: newValue,
				description,
				customSetters,
				schema: effectiveSchema,
			});

			// Use the newDiffState method to handle diff state updates
			// Any change through this setter is considered a diff change (isDiffChange = true)
			newDiffState<T>(key, newValue, true);
		},
		[
			key,
			registerStateFn,
			description,
			customSetters,
			effectiveSchema,
			setDiffState,
		]
	);

	return [cleanState, stableSetState, diffState];
}

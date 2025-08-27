import { useCallback } from 'react';
import { useCedarStore } from '@/store/CedarStore';

/**
 * Hook that provides helpers for working with diff state
 * @param key - The state key to get helpers for
 * @returns Object containing computedValue, undo, and redo functions
 */
export const useDiffStateHelpers = <T = unknown>(key: string) => {
	// Get the computed value for the state
	const computedValue = useCedarStore((state) =>
		state.getComputedState<T>(key)
	);

	// Get the store methods
	const undoMethod = useCedarStore((state) => state.undo);
	const redoMethod = useCedarStore((state) => state.redo);

	// Create memoized callbacks for undo and redo
	const undo = useCallback(() => {
		return undoMethod(key);
	}, [undoMethod, key]);

	const redo = useCallback(() => {
		return redoMethod(key);
	}, [redoMethod, key]);

	return {
		computedValue,
		undo,
		redo,
	};
};

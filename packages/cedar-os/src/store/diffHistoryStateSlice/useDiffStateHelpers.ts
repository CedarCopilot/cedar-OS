import { useCallback } from 'react';
import { useCedarStore } from '@/store/CedarStore';

/**
 * Hook that provides helpers for working with diff state
 * @param key - The state key to get helpers for
 * @returns Object containing computedValue, undo, and redo functions
 */
export const useDiffStateHelpers = <T = unknown>(key: string) => {
	// Get the computed value for the state by subscribing to the specific diff history state
	// This ensures the component re-renders when the computed state changes
	const computedValue = useCedarStore((state) => {
		const diffHistoryState = state.diffHistoryStates[key];
		if (!diffHistoryState) return undefined;
		return diffHistoryState.diffState.computedState as T;
	});

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

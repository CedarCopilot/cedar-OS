import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getValueByPointer } from 'fast-json-patch';
import { isEqual } from 'lodash';
import { useCedarStore } from '@/store/CedarStore';
import { DiffHistoryState, DiffMode } from './diffHistorySlice';

/**
 * Options for the useSubscribeToDiffValue hook
 */
export interface UseSubscribeToDiffValueOptions {
	/**
	 * Optional default value to return if the pointer doesn't resolve
	 */
	defaultValue?: unknown;

	/**
	 * Optional equality function for shallow comparison
	 */
	equalityFn?: (a: unknown, b: unknown) => boolean;
}

/**
 * Return type for the useSubscribeToDiffValue hook
 */
export interface DiffValue<T = unknown> {
	/**
	 * The old value at the specified path
	 */
	oldValue: T | undefined;

	/**
	 * The new value at the specified path
	 */
	newValue: T | undefined;

	/**
	 * Whether the state is currently in diff mode
	 */
	isDiffMode: boolean;

	/**
	 * The clean value based on the diff mode
	 * - If diffMode is 'defaultAccept': returns newValue
	 * - If diffMode is 'holdAccept': returns oldValue
	 */
	cleanValue: T | undefined;

	/**
	 * Whether there is a difference between old and new values
	 */
	hasChanges: boolean;
}

/**
 * Hook to subscribe to a specific value within a diff state using JSON Pointer paths
 *
 * @param key - The key of the diff history state to subscribe to
 * @param path - The JSON Pointer path (e.g., '/title', '/user/name', '/items/0')
 * @param options - Optional configuration
 * @returns The old value, new value, isDiffMode flag, and clean value at the specified path
 *
 * @example
 * ```tsx
 * // Subscribe to the title field
 * const { oldValue, newValue, isDiffMode, cleanValue } = useSubscribeToDiffValue('myState', '/title');
 *
 * // Subscribe to a nested field
 * const { oldValue, newValue } = useSubscribeToDiffValue('myState', '/user/profile/name');
 *
 * // Subscribe to an array element
 * const { oldValue, newValue } = useSubscribeToDiffValue('myState', '/items/0');
 *
 * // With default value
 * const { cleanValue } = useSubscribeToDiffValue('myState', '/optionalField', {
 *   defaultValue: 'N/A'
 * });
 * ```
 */
export function useSubscribeToDiffValue<T = unknown>(
	key: string,
	path: string,
	options: UseSubscribeToDiffValueOptions = {}
): DiffValue<T> {
	const { defaultValue, equalityFn } = options;

	// Create a selector that extracts only the values we need at the specified path
	const selector = useCallback(
		(state: {
			getDiffHistoryState: (key: string) => DiffHistoryState | undefined;
		}) => {
			const diffHistoryState = state.getDiffHistoryState(key);

			if (!diffHistoryState) {
				return {
					oldValue: defaultValue,
					newValue: defaultValue,
					isDiffMode: false,
					diffMode: 'defaultAccept' as DiffMode,
				};
			}

			const { diffState, diffMode } = diffHistoryState;

			// Extract values at the specified path
			// Handle empty path (root) specially
			let oldValue;
			let newValue;

			if (path === '' || path === '/') {
				oldValue = diffState.oldState;
				newValue = diffState.newState;
			} else {
				// Safely get values, handling cases where the state might not be an object
				try {
					oldValue =
						diffState.oldState && typeof diffState.oldState === 'object'
							? getValueByPointer(diffState.oldState as object, path)
							: undefined;
				} catch {
					oldValue = undefined;
				}

				try {
					newValue =
						diffState.newState && typeof diffState.newState === 'object'
							? getValueByPointer(diffState.newState as object, path)
							: undefined;
				} catch {
					newValue = undefined;
				}
			}

			return {
				oldValue: oldValue ?? defaultValue,
				newValue: newValue ?? defaultValue,
				isDiffMode: diffState.isDiffMode,
				diffMode,
			};
		},
		[key, path, defaultValue]
	);

	// Use shallow comparison by default to avoid unnecessary re-renders
	const diffData = useCedarStore(useShallow(selector));

	// Compute derived values
	const result = useMemo(() => {
		const { oldValue, newValue, isDiffMode, diffMode } = diffData;

		// Determine clean value based on diff mode
		const cleanValue = diffMode === 'defaultAccept' ? newValue : oldValue;

		// Check if values have changed using the provided equality function or deep equality
		const hasChanges = equalityFn
			? !equalityFn(oldValue, newValue)
			: !isEqual(oldValue, newValue);

		return {
			oldValue: oldValue as T | undefined,
			newValue: newValue as T | undefined,
			isDiffMode,
			cleanValue: cleanValue as T | undefined,
			hasChanges,
		};
	}, [diffData, equalityFn]);

	return result;
}

/**
 * Hook to subscribe to multiple values within a diff state using JSON Pointer paths
 *
 * @param key - The key of the diff history state to subscribe to
 * @param paths - Array of JSON Pointer paths
 * @param options - Optional configuration
 * @returns An object mapping paths to their diff values
 *
 * @example
 * ```tsx
 * const values = useSubscribeToDiffValues('myState', ['/title', '/description', '/status']);
 *
 * // Access individual values
 * console.log(values['/title'].oldValue, values['/title'].newValue);
 * ```
 */
export function useSubscribeToDiffValues(
	key: string,
	paths: string[],
	options: UseSubscribeToDiffValueOptions = {}
): Record<string, DiffValue> {
	// Simply use multiple individual hooks - this is more stable
	// and avoids complex dependency tracking issues
	const results: Record<string, DiffValue> = {};

	// We need to call hooks unconditionally and in the same order
	// So we create an array of results first
	const hookResults = paths.map((path) => {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		return useSubscribeToDiffValue(key, path, options);
	});

	// Then build the result object
	paths.forEach((path, index) => {
		results[path] = hookResults[index];
	});

	return results;
}

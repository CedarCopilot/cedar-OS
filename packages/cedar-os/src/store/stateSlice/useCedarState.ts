import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod';
import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue, Setter } from '@/store/stateSlice/stateSlice';

/**
 * Hook that registers and returns a piece of state from the Cedar store,
 * working like React's useState but persisting to the global state slice.
 *
 * @param config Configuration object for the state registration and management
 * @param config.key Unique key for the state in the store
 * @param config.initialValue Initial value for the state
 * @param config.description Optional human-readable description for AI metadata
 * @param config.stateSetters Optional state setter functions for this state
 * @param config.customSetters Optional custom setter functions for this state (deprecated)
 * @param config.schema Optional Zod schema for validating the state
 * @returns [state, setState] tuple.
 */
export function useCedarState<T extends BasicStateValue>(config: {
	key: string;
	initialValue: T;
	description?: string;
	stateSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
	/** @deprecated Use stateSetters instead */
	customSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
	schema?: ZodSchema<T>;
}): [T, (newValue: T) => void] {
	const {
		key,
		initialValue,
		description,
		stateSetters,
		customSetters,
		schema,
	} = config;

	// Show deprecation warning if customSetters is used
	if (customSetters && !stateSetters) {
		console.warn(
			`⚠️ 'customSetters' is deprecated in useCedarState for state "${key}". Use 'stateSetters' instead.`
		);
	}

	// Determine Zod schema to use
	const effectiveSchema = schema ?? (z.any() as unknown as ZodSchema<T>);

	// Register state on first render with cleanup on unmount
	const registerStateFn = useCedarStore((s) => s.registerState);
	const unregisterState = useCedarStore((s) => s.unregisterState);

	useEffect(() => {
		registerStateFn<T>({
			key,
			value: initialValue,
			description,
			stateSetters,
			customSetters, // Keep for backward compatibility
			schema: effectiveSchema,
		});

		// Cleanup on unmount
		return () => {
			unregisterState(key);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, unregisterState]);

	// Selector for the state value
	const stateValue = useCedarStore(
		(state) => state.registeredStates[key]?.value as T | undefined
	);
	// Fallback to initialValue if for some reason undefined
	const value = stateValue !== undefined ? stateValue : initialValue;

	// Provide a setter that re-registers with the new value (updates stored state)
	const stableSetState = useCallback(
		(newValue: T) => {
			registerStateFn<T>({
				key,
				value: newValue,
				description,
				stateSetters,
				customSetters, // Keep for backward compatibility
				schema: effectiveSchema,
			});
		},
		[
			key,
			registerStateFn,
			description,
			stateSetters,
			customSetters,
			effectiveSchema,
		]
	);

	return [value, stableSetState];
}

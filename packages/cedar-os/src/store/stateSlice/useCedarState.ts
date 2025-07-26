import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod/v4';
import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue, Setter } from '@/store/stateSlice/stateSlice';

/**
 * Hook that registers and returns a piece of state from the Cedar store,
 * working like React's useState but persisting to the global state slice.
 *
 * @param key Unique key for the state in the store.
 * @param initialValue Initial value for the state.
 * @param description Optional human-readable description for AI metadata.
 * @param customSetters Optional custom setter functions for this state.
 * @param schema Optional Zod schema for validating the state.
 * @returns [state, setState] tuple.
 */
export function useCedarState<T extends BasicStateValue>(
	key: string,
	initialValue: T,
	description?: string,
	customSetters?: Record<string, Setter<T>>,
	schema?: ZodSchema<T>
): [T, (newValue: T) => void] {
	// Determine Zod schema to use
	const effectiveSchema = schema ?? (z.any() as unknown as ZodSchema<T>);

	// Register state on first render (and only once)
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
				customSetters,
				schema: effectiveSchema,
			});
		},
		[key, registerStateFn, description, customSetters, effectiveSchema]
	);

	return [value, stableSetState];
}

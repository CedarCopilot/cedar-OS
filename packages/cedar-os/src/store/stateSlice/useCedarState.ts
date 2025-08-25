import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod/v4';
import { useCedarStore } from '@/store/CedarStore';
import type {
	BasicStateValue,
	Setter,
	BaseSetter,
} from '@/store/stateSlice/stateSlice';
import type { CedarStore } from '@/store/CedarOSTypes';

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

/**
 * Hook to register a state with Cedar Store.
 * This hook automatically handles the registration and cleanup of state in the Cedar Store.
 * Unlike useCedarState, this hook does not create its own state but registers external state.
 *
 * This hook is designed to be safe to call during render. It uses useEffect internally,
 * allowing you to call it directly in the component body without worrying about
 * state updates during render.
 *
 * @param config Configuration object for the state registration
 * @param config.key Unique key for the state in the store
 * @param config.value Current value for the state
 * @param config.setValue Optional React setState function for external state syncing
 * @param config.description Optional human-readable description for AI metadata
 * @param config.customSetters Optional custom setter functions for this state
 * @param config.schema Optional Zod schema for validating the state
 */
export function useRegisterState<T extends BasicStateValue>(config: {
	key: string;
	value: T;
	setValue?: BaseSetter<T>;
	description?: string;
	schema?: ZodSchema<T>;
	customSetters?: Record<string, Setter<T>>;
}): void {
	const registerState = useCedarStore((s: CedarStore) => s.registerState);

	useEffect(() => {
		registerState(config);
	}, [
		config.key,
		config.value,
		config.setValue,
		config.description,
		config.schema,
		config.customSetters,
		registerState,
	]);
}

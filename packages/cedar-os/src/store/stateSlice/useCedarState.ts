import { useEffect, useCallback } from 'react';
import type { ZodSchema } from 'zod';
import { z } from 'zod';
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

/**
 * Hook that registers a state in the Cedar store.
 * This is a hook version of registerState that handles the useEffect internally,
 * allowing you to call it directly in the component body without worrying about
 * state updates during render.
 *
 * @param config Configuration object for the state registration
 * @param config.key Unique key for the state in the store
 * @param config.value Current value for the state
 * @param config.setValue Optional React setState function for external state syncing
 * @param config.description Optional human-readable description for AI metadata
 * @param config.customSetters Optional custom setter functions for this state (deprecated)
 * @param config.schema Optional Zod schema for validating the state
 */
export function useRegisterState<T extends BasicStateValue>(config: {
	key: string;
	value: T;
	setValue?: BaseSetter<T>;
	description?: string;
	schema?: ZodSchema<T>;
	stateSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
	/** @deprecated Use stateSetters instead */
	customSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
}): void {
	const registerState = useCedarStore((s: CedarStore) => s.registerState);
	const unregisterState = useCedarStore((s: CedarStore) => s.unregisterState);

	useEffect(() => {
		registerState(config);

		// Cleanup on unmount
		return () => {
			unregisterState(config.key);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		config.key,
		config.value,
		config.setValue,
		config.description,
		config.schema,
		config.stateSetters,
		registerState,
		unregisterState,
	]);
}

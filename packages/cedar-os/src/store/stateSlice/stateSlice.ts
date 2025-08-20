// @stateSlice: central registry for React component states with AI-readable metadata.
// Supports manual registration via registerState (with optional external setter) and automatic registration via useCedarState hook.
import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import type { ZodSchema } from 'zod';
import { z } from 'zod/v4';
import { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';

// Define types that our state values can be
export type BasicStateValue =
	| string
	| number
	| boolean
	| object
	| unknown[]
	| undefined
	| void;

// Setter types
export interface SetterParameter {
	name: string;
	type: string;
	description: string;
	optional?: boolean;
}

// Options for executeCustomSetter
export interface ExecuteCustomSetterOptions {
	isDiff?: boolean;
	[key: string]: unknown;
}

// Parameters for executeCustomSetter
export interface ExecuteCustomSetterParams {
	key: string;
	setterKey: string;
	options?: ExecuteCustomSetterOptions;
	args?: unknown[];
}

// A setter function that takes an input value and the current state to produce updates
export type BaseSetter<T = BasicStateValue> = (state: T) => void;

// A setter function that takes an input value and the current state to produce updates
export type SetterFunction<
	T = BasicStateValue,
	Args extends unknown[] = unknown[]
> = (state: T, ...args: Args) => void;

// Setter object that includes both metadata and execution function
export interface Setter<
	T = BasicStateValue,
	Args extends unknown[] = unknown[]
> {
	name: string;
	description: string;
	parameters?: SetterParameter[];
	/** Optional Zod schema describing the input shape expected by this setter. Acts as an alternative to 'parameters'. */
	schema?: ZodSchema;
	execute: SetterFunction<T, Args>;
}

// Represents a single registered state with separate primary setter and additional custom setters
export interface registeredState<T = BasicStateValue> {
	key: string;
	value: T;
	setValue?: BaseSetter<T>;
	description?: string;
	schema?: ZodSchema<T>;
	// Primary state updater
	// Additional named setter functions
	customSetters?: Record<string, Setter<T>>;
}

// Define the registered state slice
export interface StateSlice {
	// State
	registeredStates: Record<string, registeredState>;

	// Actions
	/**
	 * Register a new state or replace an existing one.
	 * @param config.setValue Optional React setState function for external state syncing.
	 * @param config.customSetters Optional custom setters for this state.
	 * @param config.key Unique key for the state.
	 * @param config.value Initial value for the state.
	 * @param config.description Optional description for AI metadata.
	 * @param config.schema Zod schema for value validation.
	 */
	registerState: <T extends BasicStateValue>(config: {
		key: string;
		value: T;
		// Primary state updater: (inputValue, currentState)
		setValue?: SetterFunction<T>;
		description?: string;
		schema?: ZodSchema<T>;
		customSetters?: Record<string, Setter<T>>;
	}) => void;
	getState: (key: string) => registeredState | undefined;

	// Method to add custom setters to an existing state
	addCustomSetters: (key: string, setters: Record<string, Setter>) => boolean;
	/**
	 * Execute a named custom setter for a state.
	 * @param params Object containing key, setterKey, optional options, and optional args
	 */
	executeCustomSetter: (params: ExecuteCustomSetterParams) => void;
	/** Retrieves the stored value for a given state key */
	getCedarState: (key: string) => BasicStateValue | undefined;
	/**
	 * Set a registered state value and call its external setter if provided.
	 * @param key The state key.
	 * @param value The new value to set.
	 */
	setCedarState: <T extends BasicStateValue>(key: string, value: T) => void;
}

// Create the registered state slice
export const createStateSlice: StateCreator<CedarStore, [], [], StateSlice> = (
	set,
	get
) => {
	return {
		// Default state
		registeredStates: {},

		// Register a new state or replace an existing one
		registerState: <T extends BasicStateValue>(config: {
			key: string;
			value: T;
			setValue?: SetterFunction<T>;
			description?: string;
			schema?: ZodSchema<T>;
			customSetters?: Record<string, Setter<T>>;
		}) => {
			const stateExists = Boolean(get().registeredStates[config.key]);
			if (stateExists) {
				// Update the entire registration to ensure fresh closures
				set((state) => {
					// Create a properly typed updated state
					const updatedState: registeredState<T> = {
						key: config.key,
						value: config.value,
						// Update ALL fields to ensure fresh closures after remount
						setValue: config.setValue,
						customSetters: config.customSetters,
						description: config.description,
						schema: config.schema,
					};

					return {
						registeredStates: {
							...state.registeredStates,
							[config.key]: updatedState,
						},
					} as Partial<CedarStore>;
				});
				return;
			}

			// Initial registration of a new state
			set((state) => {
				// Create the state object
				const registeredState: registeredState<T> = {
					key: config.key,
					value: config.value,
					description: config.description,
					schema: config.schema,
					// Primary updater separate from namedSetters
					setValue: config.setValue,
					customSetters: config.customSetters,
				};

				// Return updated state with the new/replaced registered state
				return {
					registeredStates: {
						...state.registeredStates,
						[config.key]: registeredState,
					},
				} as Partial<CedarStore>;
			});
		},

		getState: (key: string): registeredState | undefined => {
			return get().registeredStates[key];
		},
		/** Retrieves the stored value for a given state key */
		getCedarState: (key: string) => {
			const record = get().registeredStates[key];
			return record?.value;
		},
		/**
		 * Set a registered state value and call its external setter if provided.
		 * @param key The state key.
		 * @param value The new value to set.
		 */
		setCedarState: <T extends BasicStateValue>(key: string, value: T) => {
			const existingState = get().registeredStates[key];
			if (!existingState) {
				console.warn(`State with key "${key}" not found.`);
				return;
			}
			// Update stored value
			set(
				(state) =>
					({
						registeredStates: {
							...state.registeredStates,
							[key]: {
								...state.registeredStates[key],
								value,
							},
						},
					} as Partial<CedarStore>)
			);
			// Call external setter if provided
			if (existingState.setValue) {
				try {
					existingState.setValue(value);
				} catch (error) {
					console.warn(`Error calling external setter for "${key}"`, error);
				}
			}
		},

		// Add custom setters to an existing state
		addCustomSetters: (
			key: string,
			setters: Record<string, Setter>
		): boolean => {
			const existingState = get().registeredStates[key];

			if (!existingState) {
				// Create a placeholder state with the setters
				// We use empty/default values that will be properly set when registerState is called
				console.info(
					`Creating placeholder state for "${key}" with custom setters`
				);
				set(
					(state) =>
						({
							registeredStates: {
								...state.registeredStates,
								[key]: {
									key: key,
									value: '', // Default empty value
									schema: z.any() as unknown as ZodSchema<BasicStateValue>,
									// Optional description placeholder
									description: '',
									customSetters: { ...setters },
								},
							},
						} as Partial<CedarStore>)
				);
				return true;
			}

			set(
				(state) =>
					({
						registeredStates: {
							...state.registeredStates,
							[key]: {
								...state.registeredStates[key],
								// Merge existing customSetters with new ones
								customSetters: {
									...(state.registeredStates[key].customSetters || {}),
									...setters,
								},
							},
						},
					} as Partial<CedarStore>)
			);

			return true;
		},
		/**
		 * Execute a named custom setter for a registered state.
		 */
		executeCustomSetter: (params: ExecuteCustomSetterParams) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { key, setterKey, options = {}, args = [] } = params;
			// Note: options will be used for features like diff tracking
			const existingState = get().registeredStates[key];
			if (!existingState) {
				console.warn(`State with key "${key}" not found.`);
				return;
			}
			const setters = existingState.customSetters;
			if (!setters || !setters[setterKey]) {
				console.warn(
					`Custom setter "${setterKey}" not found for state "${key}".`
				);
				return;
			}
			const setter = setters[setterKey];
			setter.execute(existingState.value, ...args);
		},
	};
};

export function isRegisteredState<T>(
	value: unknown
): value is registeredState<T> {
	return (
		typeof value === 'object' &&
		value !== null &&
		'value' in value &&
		'key' in value &&
		'customSetters' in value &&
		'schema' in value
	);
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
 * @param config.customSetters Optional custom setter functions for this state
 * @param config.schema Optional Zod schema for validating the state
 */
export function useRegisterState<T extends BasicStateValue>(config: {
	key: string;
	value: T;
	setValue?: SetterFunction<T>;
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

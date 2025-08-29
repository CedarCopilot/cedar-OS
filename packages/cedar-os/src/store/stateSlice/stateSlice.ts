// @stateSlice: central registry for React component states with AI-readable metadata.
// Supports manual registration via registerState (with optional external setter) and automatic registration via useCedarState hook.
import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import type { ZodSchema } from 'zod';
import { z } from 'zod';
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

// Options for executeStateSetter
export interface ExecuteStateSetterOptions {
	isDiff?: boolean;
	[key: string]: unknown;
}

/** @deprecated Use ExecuteStateSetterOptions instead */
export interface ExecuteCustomSetterOptions {
	isDiff?: boolean;
	[key: string]: unknown;
}

export type SetterArgs = unknown;

// Parameters for executeStateSetter
export interface ExecuteStateSetterParams {
	key: string;
	setterKey: string;
	options?: ExecuteStateSetterOptions;
	args?: SetterArgs; // Now supports any type
}

/** @deprecated Use ExecuteStateSetterParams instead */
export interface ExecuteCustomSetterParams {
	key: string;
	setterKey: string;
	options?: ExecuteCustomSetterOptions;
	args?: SetterArgs; // Now supports any type
}

// A setter function that takes an input value and the current state to produce updates
export type BaseSetter<T = BasicStateValue> = (state: T) => void;

// Enhanced SetterFunction with typed args - supports any type or void
export type SetterFunction<
	T = BasicStateValue,
	TArgs = SetterArgs
> = TArgs extends void
	? (state: T) => void // No args
	: (state: T, args: TArgs) => void; // Any type (array, object, string, etc.) passed as single parameter

// Enhanced Setter interface with generic schema
export interface Setter<T = BasicStateValue, TArgsSchema = z.ZodTypeAny> {
	name: string;
	description: string;
	/** @deprecated Use argsSchema instead */
	schema?: TArgsSchema;
	/** Zod schema describing the input shape expected by this setter. */
	argsSchema?: TArgsSchema;
	execute: SetterFunction<
		T,
		TArgsSchema extends z.ZodTypeAny ? z.infer<TArgsSchema> : unknown
	>;
}

// Represents a single registered state with separate primary setter and additional state setters
export interface registeredState<T = BasicStateValue> {
	key: string;
	value: T;
	setValue?: BaseSetter<T>;
	description?: string;
	schema?: ZodSchema<T>;
	// Primary state updater
	// Additional named setter functions
	stateSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
	/** @deprecated Use stateSetters instead */
	customSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
}

// Define the registered state slice
export interface StateSlice {
	// State
	registeredStates: Record<string, registeredState>;

	// Actions
	/**
	 * Register a new state or replace an existing one.
	 * @param config.setValue Optional React setState function for external state syncing.
	 * @param config.stateSetters Optional state setters for this state.
	 * @param config.customSetters Optional custom setters for this state (deprecated, use stateSetters).
	 * @param config.key Unique key for the state.
	 * @param config.value Initial value for the state.
	 * @param config.description Optional description for AI metadata.
	 * @param config.schema Zod schema for value validation.
	 */
	registerState: <T extends BasicStateValue>(config: {
		key: string;
		value: T;
		// Primary state updater: (inputValue, currentState)
		setValue?: BaseSetter<T>;
		description?: string;
		schema?: ZodSchema<T>;
		stateSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
		/** @deprecated Use stateSetters instead */
		customSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
	}) => void;
	getState: (key: string) => registeredState | undefined;

	// Method to add state setters to an existing state
	addStateSetters: (
		key: string,
		setters: Record<string, Setter<BasicStateValue, z.ZodTypeAny>>
	) => boolean;
	/** @deprecated Use addStateSetters instead */
	addCustomSetters: (
		key: string,
		setters: Record<string, Setter<BasicStateValue, z.ZodTypeAny>>
	) => boolean;
	/**
	 * Execute a named state setter for a state.
	 * @param params Object containing key, setterKey, optional options, and optional args
	 */
	executeStateSetter: (params: ExecuteStateSetterParams) => void;
	/** @deprecated Use executeStateSetter instead */
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
			setValue?: BaseSetter<T>;
			description?: string;
			schema?: ZodSchema<T>;
			stateSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
			/** @deprecated Use stateSetters instead */
			customSetters?: Record<string, Setter<T, z.ZodTypeAny>>;
		}) => {
			// Merge stateSetters and customSetters (backward compatibility)
			const mergedSetters = {
				...(config.customSetters || {}),
				...(config.stateSetters || {}), // stateSetters takes precedence
			};

			// Show deprecation warning if customSetters is used
			if (config.customSetters && !config.stateSetters) {
				console.warn(
					`⚠️ 'customSetters' is deprecated for state "${config.key}". Use 'stateSetters' instead.`
				);
			}
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
						stateSetters: mergedSetters,
						customSetters: config.customSetters, // Keep for backward compatibility
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
					stateSetters: mergedSetters,
					customSetters: config.customSetters, // Keep for backward compatibility
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

		// Add state setters to an existing state
		addStateSetters: (
			key: string,
			setters: Record<string, Setter<BasicStateValue, z.ZodTypeAny>>
		): boolean => {
			const existingState = get().registeredStates[key];

			if (!existingState) {
				// Create a placeholder state with the setters
				// We use empty/default values that will be properly set when registerState is called
				console.info(
					`Creating placeholder state for "${key}" with state setters`
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
									stateSetters: { ...setters },
									customSetters: { ...setters }, // Keep for backward compatibility
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
								// Merge existing stateSetters with new ones
								stateSetters: {
									...(state.registeredStates[key].stateSetters || {}),
									...setters,
								},
								// Also update customSetters for backward compatibility
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

		// Deprecated: Add custom setters to an existing state
		addCustomSetters: (
			key: string,
			setters: Record<string, Setter<BasicStateValue, z.ZodTypeAny>>
		): boolean => {
			console.warn(
				`⚠️ 'addCustomSetters' is deprecated for state "${key}". Use 'addStateSetters' instead.`
			);
			// Delegate to the new function
			return get().addStateSetters(key, setters);
		},
		/**
		 * Execute a named state setter for a registered state.
		 */
		executeStateSetter: (params: ExecuteStateSetterParams) => {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { key, setterKey, options = {}, args } = params;
			// Note: options will be used for features like diff tracking
			const existingState = get().registeredStates[key];
			if (!existingState) {
				console.warn(`State with key "${key}" not found.`);
				return;
			}
			// Try stateSetters first, then fall back to customSetters for backward compatibility
			const setters = existingState.stateSetters || existingState.customSetters;
			if (!setters || !setters[setterKey]) {
				console.warn(
					`State setter "${setterKey}" not found for state "${key}".`
				);
				return;
			}
			const setter = setters[setterKey];

			// Validate args against schema if available
			const schema = setter.argsSchema || setter.schema; // Support both new and deprecated property
			if (schema) {
				try {
					// Validate args against the schema
					const validatedArgs = schema.parse(args);

					// Handle args - always pass as single parameter or no parameter
					// Type assertion is necessary here because we support flexible args at runtime
					const executeFunction = setter.execute as (
						state: BasicStateValue,
						args?: unknown
					) => void;

					if (validatedArgs !== undefined) {
						// Any type (array, object, string, number, etc.): pass as single parameter
						executeFunction(existingState.value, validatedArgs);
					} else {
						// No args (void)
						executeFunction(existingState.value);
					}
				} catch (error) {
					// Schema validation failed - log all error information in a single message
					let validationErrors: unknown[] = [];

					if (error instanceof z.ZodError) {
						validationErrors = error.issues.map((err: z.ZodIssue) => {
							const errorInfo: Record<string, unknown> = {
								path: err.path.join('.') || 'root',
								message: err.message,
								code: err.code,
							};

							// Add received/expected if available (depends on error type)
							if ('received' in err) {
								errorInfo.received = (
									err as unknown as Record<string, unknown>
								).received;
							}
							if ('expected' in err) {
								errorInfo.expected = (
									err as unknown as Record<string, unknown>
								).expected;
							}

							return errorInfo;
						});
					}

					// Single consolidated error message with all information
					const errorMessage = [
						`❌ Args validation failed for setter "${setterKey}" on state "${key}"`,
						`📥 Received args: ${JSON.stringify(args, null, 2)}`,
						`🔍 Validation errors: ${JSON.stringify(
							validationErrors.length > 0 ? validationErrors : error,
							null,
							2
						)}`,
						`💡 Tip: Check your backend response format or update the setter's argsSchema`,
					].join('\n');

					console.error(errorMessage);
					return; // Don't execute the setter with invalid args
				}
			} else {
				// No schema validation - execute with original args
				console.warn(
					`⚠️ No schema validation for setter "${setterKey}" on state "${key}". Consider adding an argsSchema for better type safety.`
				);

				// Handle args - always pass as single parameter or no parameter
				// Type assertion is necessary here because we support flexible args at runtime
				const executeFunction = setter.execute as (
					state: BasicStateValue,
					args?: unknown
				) => void;

				if (args !== undefined) {
					// Any type (array, object, string, number, etc.): pass as single parameter
					executeFunction(existingState.value, args);
				} else {
					// No args (void)
					executeFunction(existingState.value);
				}
			}
		},

		/**
		 * @deprecated Use executeStateSetter instead
		 * Execute a named custom setter for a registered state.
		 */
		executeCustomSetter: (params: ExecuteCustomSetterParams) => {
			console.warn(
				`⚠️ 'executeCustomSetter' is deprecated. Use 'executeStateSetter' instead.`
			);
			// Convert params and delegate to the new function
			get().executeStateSetter({
				key: params.key,
				setterKey: params.setterKey,
				options: params.options,
				args: params.args,
			});
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
		('stateSetters' in value || 'customSetters' in value) &&
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
 * @param config.stateSetters Optional state setter functions for this state
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

	useEffect(() => {
		registerState(config);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		config.key,
		config.value,
		config.setValue,
		config.description,
		config.schema,
		config.stateSetters,
		config.customSetters,
		registerState,
	]);
}

import { CedarStore } from '@/store/CedarOSTypes';
import type { JSONContent } from '@tiptap/core';
import type { StateCreator } from 'zustand';
import type {
	AdditionalContext,
	ContextEntry,
	MentionProvider,
	SubscribedSetter,
} from '@/store/agentInputContext/AgentInputContextTypes';
import { ReactNode, useMemo, useRef } from 'react';
import { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import { sanitizeJson } from '@/utils/sanitizeJson';
import { zodToJsonSchema } from 'zod-to-json-schema';
export type ChatInput = JSONContent;

// Define the agent input context slice
export interface AgentInputContextSlice {
	// The up-to-date editor JSON content
	chatInputContent: ChatInput | null;
	// Actions to update content
	setChatInputContent: (content: ChatInput) => void;

	// Optional manual override content for the editor
	overrideInputContent: { input: string | JSONContent[] | null };
	setOverrideInputContent: (content: string | JSONContent[] | null) => void;

	// Enhanced context management
	additionalContext: AdditionalContext;
	// Additional context mapping keys to context entries
	addContextEntry: (key: string, entry: ContextEntry) => void;
	removeContextEntry: (key: string, entryId: string) => void;
	clearContextBySource: (source: ContextEntry['source']) => void;
	clearMentions: () => void;
	updateAdditionalContext: (context: Record<string, unknown>) => void;

	// Mention providers registry
	mentionProviders: Map<string, MentionProvider>;
	registerMentionProvider: (provider: MentionProvider) => void;
	unregisterMentionProvider: (providerId: string) => void;
	getMentionProvidersByTrigger: (trigger: string) => MentionProvider[];

	// Subscribed setters for agent toolsets
	subscribedSetters: Record<string, SubscribedSetter>;
	addSubscribedSetter: (setter: SubscribedSetter) => void;
	removeSubscribedSetter: (setterName: string) => void;
	clearSubscribedSetters: () => void;
	getSubscribedSetters: () => Record<string, SubscribedSetter>;

	// New stringify functions
	stringifyEditor: () => string;
	stringifyInputContext: () => string;
	stringifyAdditionalContext: () => string;

	// Serialization methods for different provider formats
	serializeSetters: () => Record<string, SubscribedSetter>;
	transformSettersToFunctions: () => Array<{
		type: 'function';
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	}>;
}

// Create the agent input context slice
export const createAgentInputContextSlice: StateCreator<
	CedarStore,
	[],
	[],
	AgentInputContextSlice
> = (set, get) => ({
	chatInputContent: null,
	overrideInputContent: { input: null },
	additionalContext: {},
	mentionProviders: new Map(),
	subscribedSetters: {},

	setChatInputContent: (content) => {
		set({ chatInputContent: content });
	},

	setOverrideInputContent: (content) => {
		set({ overrideInputContent: { input: content } });
	},

	addContextEntry: (key, entry) => {
		set((state) => {
			const currentEntries = state.additionalContext[key] || [];
			// Check if entry already exists
			const exists = currentEntries.some((e) => e.id === entry.id);
			if (exists) {
				return state;
			}

			return {
				additionalContext: {
					...state.additionalContext,
					[key]: [...currentEntries, entry],
				},
			};
		});
	},

	removeContextEntry: (key, entryId) => {
		set((state) => {
			const currentEntries = state.additionalContext[key] || [];
			return {
				additionalContext: {
					...state.additionalContext,
					[key]: currentEntries.filter((e) => e.id !== entryId),
				},
			};
		});
	},

	clearContextBySource: (source) => {
		set((state) => {
			const newContext: AdditionalContext = {};
			Object.entries(state.additionalContext).forEach(([key, entries]) => {
				const filtered = entries.filter((e) => e.source !== source);
				if (filtered.length > 0) {
					newContext[key] = filtered;
				}
			});
			return { additionalContext: newContext };
		});
	},

	clearMentions: () => {
		get().clearContextBySource('mention');
	},

	// Legacy method - converts simple objects to context entries
	updateAdditionalContext: (context) => {
		set((state) => {
			const newContext = { ...state.additionalContext };

			Object.entries(context).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					// Convert legacy array format to context entries
					newContext[key] = value.map((item, index) => ({
						id: item.id || `${key}-${index}`,
						source: 'subscription' as const,
						data: item,
						metadata: {
							label:
								item.title || item.label || item.name || item.id || 'Unknown',
							// Preserve any existing metadata including icon and color
							...item.metadata,
						},
					}));
				}
			});

			return { additionalContext: newContext };
		});
	},

	registerMentionProvider: (provider) => {
		set((state) => {
			const newProviders = new Map(state.mentionProviders);
			newProviders.set(provider.id, provider);
			return { mentionProviders: newProviders };
		});
	},

	unregisterMentionProvider: (providerId) => {
		set((state) => {
			const newProviders = new Map(state.mentionProviders);
			newProviders.delete(providerId);
			return { mentionProviders: newProviders };
		});
	},

	getMentionProvidersByTrigger: (trigger) => {
		const providers = get().mentionProviders;
		return Array.from(providers.values()).filter(
			(provider) => provider.trigger === trigger
		);
	},

	addSubscribedSetter: (setter) => {
		set((state) => ({
			subscribedSetters: {
				...state.subscribedSetters,
				[setter.name]: setter,
			},
		}));
	},

	removeSubscribedSetter: (setterName) => {
		set((state) => {
			const remaining = { ...state.subscribedSetters };
			delete remaining[setterName];
			return { subscribedSetters: remaining };
		});
	},

	clearSubscribedSetters: () => {
		set({ subscribedSetters: {} });
	},

	getSubscribedSetters: () => {
		return get().subscribedSetters;
	},

	stringifyEditor: () => {
		const content = get().chatInputContent;
		if (!content) return '';

		// Helper function to recursively extract text from JSONContent
		const extractText = (node: JSONContent): string => {
			let text = '';

			// Handle text nodes
			if (node.type === 'text' && node.text) {
				text += node.text;
			}

			// Handle mention nodes - display as @title
			if (node.type === 'mention' && node.attrs) {
				const label = node.attrs.label || node.attrs.id || 'mention';
				text += `@${label}`;
			}

			// Handle choice nodes if they exist
			if (node.type === 'choice' && node.attrs) {
				const selectedOption = node.attrs.selectedOption || '';
				const options = node.attrs.options || [];
				const optionValue =
					selectedOption || (options.length > 0 ? options[0] : '');
				text += optionValue;
			}

			// Recursively process child nodes
			if (node.content && Array.isArray(node.content)) {
				node.content.forEach((child) => {
					text += extractText(child);
				});
			}

			return text;
		};

		return extractText(content).trim();
	},

	stringifyAdditionalContext: () => {
		const state = get();
		const context = state.additionalContext;
		const registeredStates = state.registeredStates;

		// Enhance context with schemas from registered states
		const enhancedContext: Record<string, unknown> = {};
		Object.entries(context).forEach(([key, contextEntries]) => {
			if (Array.isArray(contextEntries)) {
				const registeredState = registeredStates[key];
				enhancedContext[key] = contextEntries.map((entry: unknown) => ({
					...(entry as Record<string, unknown>),
					...(registeredState?.schema && {
						schema: zodToJsonSchema(registeredState.schema),
					}),
				}));
			} else {
				enhancedContext[key] = contextEntries;
			}
		});

		// Sanitize enhanced context before stringifying
		const sanitizedContext = sanitizeJson(enhancedContext);
		return JSON.stringify(sanitizedContext, null, 2);
	},

	stringifyInputContext: () => {
		const state = get();
		const editorContent = state.stringifyEditor();
		const contextString = state.stringifyAdditionalContext();

		let result = `User Text: ${editorContent}\n\n`;
		result += `Additional Context: ${contextString}`;

		return result;
	},

	serializeSetters: () => {
		const state = get();
		return state.subscribedSetters;
	},

	transformSettersToFunctions: () => {
		const state = get();
		const subscribedSetters = state.subscribedSetters;

		return Object.values(subscribedSetters).map((setter) => {
			// Default parameters for OpenAI function format
			let parameters: Record<string, unknown> = {
				type: 'object',
				properties: {},
				required: [],
			};

			// Use the schema directly if it exists - it's already in JSON Schema format
			if (setter.schema) {
				// Ensure the schema is properly formatted for OpenAI
				if (setter.schema.type === 'object' && setter.schema.properties) {
					// Deep clone to avoid mutating the original
					parameters = JSON.parse(JSON.stringify(setter.schema));

					// Ensure required is an array at the top level
					if (!Array.isArray(parameters.required)) {
						if (
							parameters.required &&
							typeof parameters.required === 'object'
						) {
							// Convert object with numeric keys to array
							const requiredObj = parameters.required as Record<
								string,
								unknown
							>;
							const requiredArray: string[] = [];
							const keys = Object.keys(requiredObj).sort(
								(a, b) => Number(a) - Number(b)
							);
							for (const key of keys) {
								if (!isNaN(Number(key))) {
									requiredArray.push(requiredObj[key] as string);
								}
							}
							parameters.required = requiredArray;
						} else {
							parameters.required = [];
						}
					}

					// Remove any $schema or other non-OpenAI properties
					delete parameters.$schema;
					delete parameters.definitions;
					delete parameters.$ref;
					delete parameters.$defs;
					delete parameters.additionalProperties;
				} else {
					console.warn(
						`[transformSettersToFunctions] Schema for setter "${setter.name}" is not in expected object format:`,
						setter.schema
					);
				}
			} else {
				console.warn(
					`[transformSettersToFunctions] No schema found for setter "${setter.name}"`
				);
			}

			const functionDef = {
				type: 'function' as const,
				name: setter.name,
				description: setter.description || `Execute ${setter.name}`,
				parameters,
			};

			console.log(
				`[DEBUG] Function definition for "${setter.name}":`,
				JSON.stringify(functionDef, null, 2)
			);

			return functionDef;
		});
	},
});

// Type helper to extract element type from arrays
type ElementType<T> = T extends readonly (infer E)[] ? E : T;

/**
 * Subscribe the agent's context to a Cedar state
 * @param stateKey - The key of the state to subscribe to
 * @param mapFn - A function that maps the state to a record of context entries
 * @param options - Optional configuration for the context entries
 */
export function useSubscribeStateToInputContext<T>(
	stateKey: string,
	mapFn: (state: T) => Record<string, unknown>,
	options?: {
		icon?: ReactNode;
		color?: string;
		labelField?: string | ((item: ElementType<T>) => string);
		order?: number;
		/** If false, the generated context entries will not be rendered as badges in the chat UI */
		showInChat?: boolean;
	}
): void {
	const updateAdditionalContext = useCedarStore(
		(s) => s.updateAdditionalContext
	);

	// Subscribe to the cedar state value
	const stateValue = useCedarStore(
		(s) => s.registeredStates[stateKey]?.value as T | undefined
	);

	useEffect(() => {
		// Helper to extract label from an item (depends on options)
		const getLabel = (item: unknown): string => {
			const { labelField } = options || {};

			if (typeof labelField === 'function') {
				return labelField(item as ElementType<T>);
			}

			// For objects, try to extract label from field
			if (typeof item === 'object' && item !== null) {
				const obj = item as Record<string, unknown>;

				if (typeof labelField === 'string' && labelField in obj) {
					return String(obj[labelField]);
				}

				// Default label extraction for objects
				return String(obj.title || obj.label || obj.name || obj.id || item);
			}

			// For primitives, convert to string
			return String(item);
		};

		if (stateValue === undefined) {
			console.warn(
				`[useSubscribeStateToInputContext] State with key "${stateKey}" was not found in Cedar store. Did you forget to register it with useCedarState()?`
			);
			return;
		}

		const mapped = mapFn(stateValue);
		const normalized: Record<string, unknown> = {};

		// Normalize all values to arrays for consistent handling
		for (const [key, value] of Object.entries(mapped)) {
			if (Array.isArray(value)) {
				// Already an array, use as is
				normalized[key] = value;
			} else if (value !== null && value !== undefined) {
				// Single value - wrap in array with proper structure
				const label = getLabel(value);
				normalized[key] = [
					{
						id: `${key}-single`,
						value: value,
						// Use extracted label
						label: label,
						title: label,
						name: label,
					},
				];
			} else {
				// Null or undefined - create empty array
				normalized[key] = [];
			}
		}

		// If options are provided, enhance the normalized data with metadata and labels
		if (
			options &&
			(options.icon ||
				options.color ||
				options.labelField ||
				options.order !== undefined ||
				options.showInChat !== undefined)
		) {
			const enhanced: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(normalized)) {
				if (Array.isArray(value)) {
					// Add metadata and update labels for each item
					enhanced[key] = value.map((item) => {
						const label = getLabel(
							item.value !== undefined ? item.value : item
						);
						return {
							...item,
							// Update label fields if labelField is specified
							label: options.labelField ? label : item.label,
							title: options.labelField ? label : item.title,
							name: options.labelField ? label : item.name,
							metadata: {
								...item.metadata,
								label: options.labelField ? label : item.metadata?.label,
								icon: options.icon,
								color: options.color,
								order: options.order,
								showInChat:
									options.showInChat !== undefined ? options.showInChat : true,
							},
						};
					});
				}
			}
			updateAdditionalContext(enhanced);
		} else {
			updateAdditionalContext(normalized);
		}
	}, [stateValue, mapFn, updateAdditionalContext, options, stateKey]);
}

// Enhanced hook to render additionalContext entries
export function useRenderAdditionalContext(
	renderers: Record<string, (entry: ContextEntry) => ReactNode>
): ReactNode[] {
	const additionalContext = useCedarStore((s) => s.additionalContext);

	return useMemo(() => {
		const elements: ReactNode[] = [];
		Object.entries(renderers).forEach(([key, renderer]) => {
			const entries = additionalContext[key];
			if (Array.isArray(entries)) {
				entries.forEach((entry) => {
					const element = renderer(entry);
					elements.push(element);
				});
			}
		});
		return elements;
	}, [additionalContext, renderers]);
}

/**
 * Subscribe a specific custom setter from a Cedar state to the agent's toolset
 * @param stateKey - The key of the state to get the setter from
 * @param setterName - The name of the specific setter to subscribe
 */
export function useSubscribeSetterToInputContext(
	stateKey: string,
	setterName: string
): void {
	const addSubscribedSetter = useCedarStore((s) => s.addSubscribedSetter);
	const removeSubscribedSetter = useCedarStore((s) => s.removeSubscribedSetter);
	const subscribedRef = useRef(false);

	// Check if the setter exists without subscribing to the entire object
	const setterExists = useCedarStore((s) => {
		const state = s.registeredStates[stateKey];
		return Boolean(state?.customSetters?.[setterName]);
	});

	useEffect(() => {
		// Only subscribe once when the setter becomes available
		if (!setterExists || subscribedRef.current) {
			return;
		}

		// Get the setter directly from store without causing re-renders
		const store = useCedarStore.getState();
		const setter =
			store.registeredStates[stateKey]?.customSetters?.[setterName];

		if (!setter) {
			console.warn(
				`[useSubscribeSetterToContext] Setter "${setterName}" not found in state "${stateKey}".`
			);
			return;
		}

		if (!setter.argsSchema) {
			console.warn(
				`[useSubscribeSetterToContext] Setter "${setterName}" in state "${stateKey}" has no Zod argsSchema. This is required for agent toolsets.`
			);
			return;
		}

		// Serialize the Zod schema properly
		let serializedSchema: Record<string, unknown> | undefined;
		try {
			// Use minimal options for zodToJsonSchema to avoid refs
			serializedSchema = zodToJsonSchema(setter.argsSchema, {
				$refStrategy: 'none',
				removeAdditionalStrategy: 'passthrough',
				target: 'openApi3',
			}) as Record<string, unknown>;

			console.log(`[DEBUG] Raw Zod schema:`, setter.argsSchema);
			console.log(
				`[DEBUG] Serialized schema for "${setterName}":`,
				JSON.stringify(serializedSchema, null, 2)
			);

			// Clean up the schema for OpenAI function calling
			if (serializedSchema) {
				// Remove any top-level properties that OpenAI doesn't support
				delete serializedSchema.$schema;
				delete serializedSchema.definitions;
				delete serializedSchema.$defs;
				delete serializedSchema.$ref;
				delete serializedSchema.additionalProperties;

				// Ensure it's an object type
				if (!serializedSchema.type) {
					serializedSchema.type = 'object';
				}

				// Ensure properties exist
				if (!serializedSchema.properties) {
					serializedSchema.properties = {};
				}

				// Ensure required is an array
				if (!serializedSchema.required) {
					serializedSchema.required = [];
				} else if (!Array.isArray(serializedSchema.required)) {
					serializedSchema.required = [];
				}

				// Clean nested properties recursively
				const cleanProperties = (obj: unknown): unknown => {
					if (typeof obj !== 'object' || obj === null) return obj;

					// Handle arrays properly
					if (Array.isArray(obj)) {
						return obj.map((item) => cleanProperties(item));
					}

					const cleaned = { ...(obj as Record<string, unknown>) };
					delete cleaned.$ref;
					delete cleaned.$defs;
					delete cleaned.definitions;
					delete cleaned.$schema;

					// Fix required fields that might have been converted to objects
					if (
						cleaned.required &&
						typeof cleaned.required === 'object' &&
						!Array.isArray(cleaned.required)
					) {
						// Convert object with numeric keys back to array
						const requiredObj = cleaned.required as Record<string, unknown>;
						const requiredArray: string[] = [];
						const keys = Object.keys(requiredObj).sort(
							(a, b) => Number(a) - Number(b)
						);
						for (const key of keys) {
							if (!isNaN(Number(key))) {
								requiredArray.push(requiredObj[key] as string);
							}
						}
						cleaned.required = requiredArray;
					}

					// Recursively clean nested objects
					for (const key of Object.keys(cleaned)) {
						if (typeof cleaned[key] === 'object' && cleaned[key] !== null) {
							cleaned[key] = cleanProperties(cleaned[key]);
						}
					}

					return cleaned;
				};

				serializedSchema = cleanProperties(serializedSchema) as Record<
					string,
					unknown
				>;
			}

			// Validate the schema is suitable for OpenAI
			if (serializedSchema && serializedSchema.type !== 'object') {
				console.warn(
					`[useSubscribeSetterToInputContext] Schema for setter "${setterName}" is not object type (${serializedSchema.type}). This may cause issues with function calling.`
				);
			}

			// Check if properties are empty
			if (serializedSchema && serializedSchema.type === 'object') {
				const properties = serializedSchema.properties as
					| Record<string, unknown>
					| undefined;
				if (!properties || Object.keys(properties).length === 0) {
					console.warn(
						`[useSubscribeSetterToInputContext] Schema for setter "${setterName}" has empty properties.`,
						'Original Zod schema:',
						setter.argsSchema
					);
				} else {
					console.log(
						`[DEBUG] Schema properties for "${setterName}":`,
						Object.keys(properties)
					);
				}
			}
		} catch (error) {
			console.error(
				`[useSubscribeSetterToInputContext] Error serializing schema for setter "${setterName}":`,
				error
			);
			serializedSchema = undefined;
		}

		// Add the specific setter to the subscribed setters
		const subscribedSetter: SubscribedSetter = {
			name: setterName,
			description: setter.description,
			stateKey: stateKey,
			schema: serializedSchema,
		};

		addSubscribedSetter(subscribedSetter);
		subscribedRef.current = true;

		// Cleanup function to remove the specific setter when component unmounts
		return () => {
			removeSubscribedSetter(setterName);
			subscribedRef.current = false;
		};
	}, [
		stateKey,
		setterName,
		setterExists,
		addSubscribedSetter,
		removeSubscribedSetter,
	]);
}

import type {
	AdditionalContext,
	AdditionalContextParam,
	ContextEntry,
	MentionProvider,
} from '@/store/agentContext/AgentContextTypes';
import { CedarStore } from '@/store/CedarOSTypes';
import { useCedarStore } from '@/store/CedarStore';
import { sanitizeJson } from '@/utils/sanitizeJson';
import type { JSONContent } from '@tiptap/core';
import { ReactNode, useEffect, useMemo } from 'react';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { StateCreator } from 'zustand';
export type ChatInput = JSONContent;

/**
 * Helper to normalize context entries to an array for internal processing
 */
function normalizeToArray(
	value: ContextEntry | ContextEntry[]
): ContextEntry[] {
	return Array.isArray(value) ? value : [value];
}

/**
 * Helper to extract label from an item based on labelField option
 */
function extractLabel<T>(
	item: unknown,
	labelField?: string | ((item: T) => string)
): string {
	// If labelField is a function, call it with the item
	if (typeof labelField === 'function') {
		return labelField(item as T);
	}

	// If labelField is a string, extract that field
	if (
		typeof labelField === 'string' &&
		typeof item === 'object' &&
		item !== null
	) {
		const obj = item as Record<string, unknown>;
		if (labelField in obj) {
			return String(obj[labelField]);
		}
	}

	// Default fallback: just try common fields
	if (typeof item === 'object' && item !== null) {
		const obj = item as Record<string, unknown>;
		return String(obj.title || obj.label || obj.name || obj.id || 'Unknown');
	}
	return String(item);
}

/**
 * Formats raw data into properly structured context entries
 */
function formatContextEntries<T>(
	key: string,
	value: unknown,
	options?: {
		icon?: ReactNode | ((item: T) => ReactNode);
		color?: string;
		labelField?: string | ((item: T) => string);
		order?: number;
		showInChat?: boolean | ((entry: ContextEntry) => boolean);
		source?: ContextEntry['source'];
	}
): ContextEntry | ContextEntry[] {
	// Handle null/undefined values
	if (value === null || value === undefined) {
		return [];
	}

	// Check if input is an array to determine return type
	const isInputArray = Array.isArray(value);

	// Ensure value is an array for consistent processing
	const items = isInputArray ? value : [value];

	// Transform each item into a proper context entry
	const entries = items.map((item, index) => {
		// Generate a unique ID for this entry
		const id =
			typeof item === 'object' && item !== null && 'id' in item
				? String(item.id)
				: `${key}-${index}`;

		// Extract the label using the configured method
		const label = extractLabel<T>(item, options?.labelField);

		// Resolve icon - either static ReactNode or function result
		const resolvedIcon = options?.icon
			? typeof options.icon === 'function'
				? options.icon(item as T)
				: options.icon
			: undefined;

		// Create the context entry with clean separation of concerns
		const entry: ContextEntry = {
			id,
			source: options?.source || ('subscription' as const),
			data: item, // The original data, unchanged
			metadata: {
				label,
				...(resolvedIcon && { icon: resolvedIcon }),
				...(options?.color && { color: options.color }),
				...(options?.order !== undefined && { order: options.order }),
				showInChat: true, // Default to true, will be resolved later if function
			},
		};

		// Resolve showInChat - either boolean or function result
		if (options?.showInChat !== undefined) {
			entry.metadata!.showInChat =
				typeof options.showInChat === 'function'
					? options.showInChat(entry)
					: options.showInChat;
		}

		return entry;
	});

	// Return single entry if input was not an array, otherwise return array
	return isInputArray ? entries : entries[0];
}

// Define the agent context slice
export interface AgentContextSlice {
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

	// New method for programmatically adding context
	putAdditionalContext: <T>(
		key: string,
		value: unknown,
		options?: {
			icon?: ReactNode;
			color?: string;
			labelField?: string | ((item: T) => string);
			order?: number;
			showInChat?: boolean;
		}
	) => void;

	// Mention providers registry
	mentionProviders: Map<string, MentionProvider>;
	registerMentionProvider: (provider: MentionProvider) => void;
	unregisterMentionProvider: (providerId: string) => void;
	getMentionProvidersByTrigger: (trigger: string) => MentionProvider[];

	// Collapsing configuration storage
	collapsingConfigs: Map<string, boolean | number>;
	setCollapsingConfig: (key: string, config: boolean | number) => void;
	removeCollapsingConfig: (key: string) => void;

	// New stringify functions
	stringifyEditor: () => string;
	stringifyInputContext: () => string;
	compileAdditionalContext: () => AdditionalContextParam<Record<string, never>>;
	compileFrontendTools: () => Record<
		string,
		{
			name: string;
			description?: string;
			argsSchema: Record<string, unknown>;
		}
	>;
	compileStateSetters: () => Record<string, unknown>;
}

// Create the agent context slice
export const createAgentContextSlice: StateCreator<
	CedarStore,
	[],
	[],
	AgentContextSlice
> = (set, get) => ({
	chatInputContent: null,
	overrideInputContent: { input: null },
	additionalContext: {},
	mentionProviders: new Map(),
	collapsingConfigs: new Map(),

	setChatInputContent: (content) => {
		set({ chatInputContent: content });
	},

	setOverrideInputContent: (content) => {
		set({ overrideInputContent: { input: content } });
	},

	addContextEntry: (key, entry) => {
		set((state) => {
			const currentValue = state.additionalContext[key];
			const currentEntries = currentValue ? normalizeToArray(currentValue) : [];

			// Check if entry already exists
			const exists = currentEntries.some((e) => e.id === entry.id);
			if (exists) {
				return state;
			}

			// Add the new entry to the array
			const updatedEntries = [...currentEntries, entry];

			return {
				additionalContext: {
					...state.additionalContext,
					[key]: updatedEntries,
				},
			};
		});
	},

	removeContextEntry: (key, entryId) => {
		set((state) => {
			const currentValue = state.additionalContext[key];
			if (!currentValue) return state;

			const currentEntries = normalizeToArray(currentValue);
			const filtered = currentEntries.filter((e) => e.id !== entryId);

			// If we filtered out all entries, remove the key or keep as empty array
			// If only one entry remains, store as single value, otherwise as array
			const newValue =
				filtered.length === 0
					? []
					: filtered.length === 1
					? filtered[0]
					: filtered;

			return {
				additionalContext: {
					...state.additionalContext,
					[key]: newValue,
				},
			};
		});
	},

	clearContextBySource: (source) => {
		set((state) => {
			const newContext: AdditionalContext = {};
			Object.entries(state.additionalContext).forEach(([key, value]) => {
				const entries = normalizeToArray(value);
				const filtered = entries.filter((e) => e.source !== source);

				// Preserve the single/array structure based on filtered results
				if (filtered.length === 0) {
					newContext[key] = [];
				} else if (filtered.length === 1 && !Array.isArray(value)) {
					// If original was single value and we still have one, keep as single
					newContext[key] = filtered[0];
				} else {
					newContext[key] = filtered;
				}
			});
			return { additionalContext: newContext };
		});
	},

	clearMentions: () => {
		get().clearContextBySource('mention');
	},

	// internal method to update the additional context
	updateAdditionalContext: (context) => {
		set((state) => {
			const newContext = { ...state.additionalContext };

			Object.entries(context).forEach(([key, value]) => {
				if (Array.isArray(value)) {
					// Handle empty arrays
					if (value.length === 0) {
						newContext[key] = [];
					} else {
						// Array input - preserve as array (even if single item)
						newContext[key] = value.map((item) => ({
							...item,
							source: item.source || 'subscription',
						}));
					}
				} else if (value && typeof value === 'object') {
					// Single object - store as single value
					const entry = value as { source?: string };
					newContext[key] = {
						...entry,
						source: entry.source || 'subscription',
					} as ContextEntry;
				}
			});

			return { additionalContext: newContext };
		});
	},

	putAdditionalContext: <T>(
		key: string,
		value: unknown,
		options?: {
			icon?: ReactNode;
			color?: string;
			labelField?: string | ((item: T) => string);
			order?: number;
			showInChat?: boolean;
		}
	) => {
		set((state) => {
			const newContext = { ...state.additionalContext };
			// Format the entries using the common helper with "function" source
			const formattedEntries = formatContextEntries<T>(key, value, {
				...options,
				source: 'function',
			});

			// formatContextEntries now returns the correct type based on input
			newContext[key] = formattedEntries;
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

	setCollapsingConfig: (key, config) => {
		set((state) => {
			const newConfigs = new Map(state.collapsingConfigs);
			newConfigs.set(key, config);
			return { collapsingConfigs: newConfigs };
		});
	},

	removeCollapsingConfig: (key) => {
		set((state) => {
			const newConfigs = new Map(state.collapsingConfigs);
			newConfigs.delete(key);
			return { collapsingConfigs: newConfigs };
		});
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

	compileStateSetters: () => {
		const registeredStates = get().registeredStates;
		const stateSetters: Record<string, unknown> = {};
		const setters: Record<string, unknown> = {}; // Deprecated but maintained for compatibility
		const schemas: Record<string, unknown> = {};

		// Process ALL registered states (not just subscribed ones) for comprehensive setter coverage
		Object.keys(registeredStates).forEach((stateKey) => {
			const state = registeredStates[stateKey];

			// Add state schema if it exists
			if (state?.schema) {
				schemas[stateKey] = {
					stateKey,
					description: state.description,
					schema: zodToJsonSchema(state.schema, stateKey),
				};
			}

			// Add state setter schemas (with backward compatibility for customSetters)
			const settersToProcess = state?.stateSetters || state?.customSetters;
			if (settersToProcess) {
				Object.entries(settersToProcess).forEach(([setterKey, setter]) => {
					const setterInfo = {
						name: setter.name,
						stateKey,
						description: setter.description,
						argsSchema: setter.argsSchema
							? zodToJsonSchema(setter.argsSchema, setter.name)
							: undefined,
					};

					// Add to new stateSetters structure
					stateSetters[setterKey] = setterInfo;
				});
			}
		});

		return {
			stateSetters,
			setters, // Deprecated but maintained for compatibility
			schemas,
		};
	},

	compileAdditionalContext: () => {
		const context = get().additionalContext;

		// Process context to simplify structure
		const simplifiedContext: Record<string, unknown> = {};
		Object.entries(context).forEach(([key, value]) => {
			const entries = normalizeToArray(value);
			const wasArray = Array.isArray(value);

			// Extract just the data and source from each entry
			const simplified = entries.map((entry) => ({
				data: entry.data,
				source: entry.source,
			}));

			// If single entry, extract it; otherwise keep as array
			simplifiedContext[key] = wasArray ? simplified : simplified[0];
		});

		// Get compiled state setters and schemas
		const compiledStateSetters = get().compileStateSetters();

		// Get frontend tools
		const frontendTools = get().compileFrontendTools();

		// Merge simplified context with setter schemas, state schemas, and frontend tools
		const mergedContext = {
			...simplifiedContext,
			...compiledStateSetters,
			...(Object.keys(frontendTools).length > 0 && { frontendTools }),
		};

		// Sanitize before stringifying
		const sanitizedContext = sanitizeJson(
			mergedContext
		) as AdditionalContextParam<Record<string, never>>;
		return sanitizedContext;
	},

	stringifyInputContext: () => {
		const state = get();
		const editorContent = state.stringifyEditor();
		const contextData = JSON.stringify(state.compileAdditionalContext());

		let result = `User Text: ${editorContent}\n\n`;
		result += `Additional Context: ${contextData}`;

		return result;
	},

	compileFrontendTools: () => {
		const tools = get().registeredTools;
		const toolsObject: Record<
			string,
			{
				name: string;
				description?: string;
				argsSchema: Record<string, unknown>;
			}
		> = {};

		tools.forEach((tool, name) => {
			toolsObject[name] = {
				name,
				description: tool.description,
				// Convert Zod schema to JSON schema for agent compatibility
				argsSchema: zodToJsonSchema(tool.argsSchema, name),
			};
		});

		return toolsObject;
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
export function useSubscribeStateToAgentContext<T>(
	stateKey: string,
	mapFn: (state: T) => Record<string, unknown>,
	options?: {
		icon?: ReactNode | ((item: ElementType<T>) => ReactNode);
		color?: string;
		labelField?: string | ((item: ElementType<T>) => string);
		order?: number;
		/** If false, the generated context entries will not be rendered as badges in the chat UI. Can also be a function to filter specific entries. */
		showInChat?: boolean | ((entry: ContextEntry) => boolean);
		/** Collapse multiple entries into a single badge. Can be boolean (default threshold 5) or number (custom threshold) */
		collapse?: boolean | number;
	}
): void {
	const updateAdditionalContext = useCedarStore(
		(s) => s.updateAdditionalContext
	);
	const setCollapsingConfig = useCedarStore((s) => s.setCollapsingConfig);
	const removeCollapsingConfig = useCedarStore((s) => s.removeCollapsingConfig);

	// Subscribe to the cedar state value and check if state exists
	const stateExists = useCedarStore((s) => stateKey in s.registeredStates);

	const stateValue = useCedarStore(
		(s) => s.registeredStates[stateKey]?.value as T | undefined
	);

	// Memoize options to prevent unnecessary re-renders when options object is redeclared
	const memoizedOptions = useMemo(
		() => options,
		[
			options?.icon,
			options?.color,
			options?.labelField,
			options?.order,
			options?.showInChat,
			options?.collapse,
		]
	);

	// Memoize the mapped result to avoid recalculating when stateValue hasn't changed
	const mappedData = useMemo(() => {
		if (!stateExists) {
			console.warn(
				`State with key "${stateKey}" was not found in Cedar store. Did you forget to register it with useCedarState()?`
			);
			return {};
		}
		return mapFn(stateValue as T);
	}, [stateExists, stateValue, mapFn]);

	// Memoize the formatted context to avoid reformatting when mapped data hasn't changed
	const formattedContext = useMemo(() => {
		const context: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(mappedData)) {
			// Use the common formatting helper
			const entries = formatContextEntries<ElementType<T>>(
				key,
				value,
				memoizedOptions
			);
			// formatContextEntries now returns the correct type based on input
			context[key] = entries;
		}

		return context;
	}, [mappedData, memoizedOptions]);

	useEffect(() => {
		// Only update if we have actual context data
		if (Object.keys(formattedContext).length > 0) {
			updateAdditionalContext(formattedContext);
		}
	}, [formattedContext, updateAdditionalContext]);

	// Manage collapsing configuration for each context key
	useEffect(() => {
		if (options?.collapse && Object.keys(mappedData).length > 0) {
			// Store collapsing config for each context key from mapFn result
			Object.keys(mappedData).forEach((contextKey) => {
				setCollapsingConfig(contextKey, options.collapse!);
			});
		} else if (!options?.collapse) {
			// Remove collapsing config for all context keys if not provided
			Object.keys(mappedData).forEach((contextKey) => {
				removeCollapsingConfig(contextKey);
			});
		}

		// Cleanup on unmount
		return () => {
			Object.keys(mappedData).forEach((contextKey) => {
				removeCollapsingConfig(contextKey);
			});
		};
	}, [
		mappedData,
		options?.collapse,
		setCollapsingConfig,
		removeCollapsingConfig,
	]);
}

// Enhanced hook to render additionalContext entries
export function useRenderAdditionalContext(
	renderers: Record<string, (entry: ContextEntry) => ReactNode>
): ReactNode[] {
	const additionalContext = useCedarStore((s) => s.additionalContext);

	return useMemo(() => {
		const elements: ReactNode[] = [];
		Object.entries(renderers).forEach(([key, renderer]) => {
			const value = additionalContext[key];
			if (value) {
				const entries = normalizeToArray(value);
				entries.forEach((entry) => {
					const element = renderer(entry);
					elements.push(element);
				});
			}
		});
		return elements;
	}, [additionalContext, renderers]);
}

export { useSubscribeStateToAgentContext as useSubscribeStateToInputContext };

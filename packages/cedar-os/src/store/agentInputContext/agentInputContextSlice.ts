import { CedarStore } from '@/store/CedarOSTypes';
import type { JSONContent } from '@tiptap/core';
import type { StateCreator } from 'zustand';
import type {
	AdditionalContext,
	ContextEntry,
	MentionProvider,
} from '@/store/agentInputContext/AgentInputContextTypes';
import { ReactNode, useMemo } from 'react';
import { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import { sanitizeJson } from '@/utils/sanitizeJson';
import { zodToJsonSchema } from 'zod-to-json-schema';
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
		icon?: ReactNode;
		color?: string;
		labelField?: string | ((item: T) => string);
		order?: number;
		showInChat?: boolean;
		source?: ContextEntry['source'];
	}
): ContextEntry[] {
	// Handle null/undefined values
	if (value === null || value === undefined) {
		return [];
	}

	// Ensure value is an array for consistent processing
	const items = Array.isArray(value) ? value : [value];

	// Transform each item into a proper context entry
	return items.map((item, index) => {
		// Generate a unique ID for this entry
		const id =
			typeof item === 'object' && item !== null && 'id' in item
				? String(item.id)
				: `${key}-${index}`;

		// Extract the label using the configured method
		const label = extractLabel<T>(item, options?.labelField);

		// Create the context entry with clean separation of concerns
		return {
			id,
			source: options?.source || ('subscription' as const),
			data: item, // The original data, unchanged
			metadata: {
				label,
				...(options?.icon && { icon: options.icon }),
				...(options?.color && { color: options.color }),
				...(options?.order !== undefined && { order: options.order }),
				showInChat:
					options?.showInChat !== undefined ? options.showInChat : true,
			},
		};
	});
}

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

	// New stringify functions
	stringifyEditor: () => string;
	stringifyInputContext: () => string;
	stringifyAdditionalContext: () => string;
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

			// If input was an array, keep as array (even if single item)
			// If input was not an array, unwrap to single value
			newContext[key] = Array.isArray(value)
				? formattedEntries
				: formattedEntries.length === 1
				? formattedEntries[0]
				: formattedEntries;
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
		const context = get().additionalContext;
		// Collect setter schemas for ALL registered states (comprehensive coverage)
		const registeredStates = get().registeredStates;
		const stateSetters: Record<string, unknown> = {};
		const setters: Record<string, unknown> = {}; // Deprecated but maintained for compatibility
		const schemas: Record<string, unknown> = {};

		// Process context to simplify structure
		const simplifiedContext: Record<string, unknown> = {};
		Object.entries(context).forEach(([key, value]) => {
			const entries = normalizeToArray(value);

			// Extract just the data and source from each entry
			const simplified = entries.map((entry) => ({
				data: entry.data,
				source: entry.source,
			}));

			// If single entry, extract it; otherwise keep as array
			simplifiedContext[key] =
				simplified.length === 1 ? simplified[0] : simplified;
		});

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
						// Deprecated schema property for backward compatibility
						schema: setter.argsSchema
							? zodToJsonSchema(setter.argsSchema, setter.name)
							: undefined,
					};

					// Add to new stateSetters structure
					stateSetters[setterKey] = setterInfo;
					// Also add to deprecated setters structure for backward compatibility
					setters[setterKey] = {
						name: setter.name,
						stateKey,
						description: setter.description,
						schema: setterInfo.schema,
					};
				});
			}
		});

		// Merge simplified context with setter schemas and state schemas
		// Include both new and deprecated keys for backward compatibility
		const mergedContext = {
			...simplifiedContext,
			stateSetters, // New key
			setters, // Deprecated key for backward compatibility
			schemas,
		};

		// Sanitize before stringifying
		const sanitizedContext = sanitizeJson(mergedContext);
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

	// Subscribe to the cedar state value and check if state exists
	const stateExists = useCedarStore((s) => stateKey in s.registeredStates);
	const stateValue = useCedarStore(
		(s) => s.registeredStates[stateKey]?.value as T | undefined
	);

	useEffect(() => {
		// Check if state key exists
		if (!stateExists) {
			return;
		}

		// Apply the mapping function to get the context data
		const mapped = mapFn(stateValue as T);

		// Transform mapped data into properly formatted context entries
		const formattedContext: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(mapped)) {
			// Use the common formatting helper
			const entries = formatContextEntries<ElementType<T>>(key, value, options);
			// If mapped value was an array, keep as array (even if single item)
			// If mapped value was not an array, unwrap to single value
			formattedContext[key] = Array.isArray(value)
				? entries
				: entries.length === 1
				? entries[0]
				: entries;
		}

		// Update the additional context
		updateAdditionalContext(formattedContext);
	}, [
		stateExists,
		stateValue,
		mapFn,
		updateAdditionalContext,
		options,
		stateKey,
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

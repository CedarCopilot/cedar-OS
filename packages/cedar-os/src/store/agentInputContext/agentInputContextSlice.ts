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

// Helper for legacy label extraction
const extractLegacyLabel = (item: unknown): string => {
	if (typeof item === 'object' && item !== null) {
		const obj = item as Record<string, unknown>;
		return String(obj.title || obj.label || obj.name || obj.id || 'Unknown');
	}
	return String(item);
};

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
				// Always retain the key in the context, even if no entries remain after filtering.
				newContext[key] = filtered;
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
					// Handle empty arrays
					if (value.length === 0) {
						newContext[key] = [];
					} else {
						// Check if items are already properly formatted context entries
						const firstItem = value[0];
						const isContextEntry =
							firstItem &&
							typeof firstItem === 'object' &&
							'id' in firstItem &&
							'data' in firstItem &&
							'metadata' in firstItem;

						if (isContextEntry) {
							// Already properly formatted, ensure source field exists
							newContext[key] = value.map((item) => ({
								...item,
								source: item.source || 'subscription',
							}));
						} else {
							// Legacy format: convert to context entries
							// This path is for backwards compatibility
							newContext[key] = value.map((item, index) => ({
								id:
									item && typeof item === 'object' && 'id' in item
										? String(item.id)
										: `${key}-${index}`,
								source: 'subscription' as const,
								data: item,
								metadata: {
									label: extractLegacyLabel(item),
									// Preserve any existing metadata if present
									...(item && typeof item === 'object' && 'metadata' in item
										? item.metadata
										: {}),
								},
							}));
						}
					}
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
		// Collect setter schemas for each subscribed state (keys present in additionalContext)
		const registeredStates = get().registeredStates;
		const setters: Record<string, unknown> = {};
		const schemas: Record<string, unknown> = {};

		Object.keys(context).forEach((stateKey) => {
			const state = registeredStates[stateKey];

			// Add state schema if it exists
			if (state?.schema) {
				schemas[stateKey] = {
					stateKey,
					description: state.description,
					schema: zodToJsonSchema(state.schema, stateKey),
				};
			}

			// Add custom setter schemas
			if (state?.customSetters) {
				Object.entries(state.customSetters).forEach(([setterKey, setter]) => {
					setters[setterKey] = {
						name: setter.name,
						stateKey,
						description: setter.description,
						parameters: setter.parameters,
						schema: setter.schema
							? zodToJsonSchema(setter.schema, setter.name)
							: undefined,
					};
				});
			}
		});

		// Merge original context with setter schemas and state schemas
		const mergedContext = { ...context, setters, schemas };

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
		// Helper to extract label from an item
		const getLabel = (item: unknown): string => {
			const { labelField } = options || {};

			// If labelField is a function, call it with the item
			if (typeof labelField === 'function') {
				return labelField(item as ElementType<T>);
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

			// Default fallback: try common label fields
			if (typeof item === 'object' && item !== null) {
				const obj = item as Record<string, unknown>;
				return String(
					obj.title || obj.label || obj.name || obj.id || 'Unknown'
				);
			}

			// For primitives, convert to string
			return String(item);
		};

		// Check if state key exists
		if (!stateExists) {
			console.warn(
				`[useSubscribeStateToInputContext] State with key "${stateKey}" was not found in Cedar store. Did you forget to register it with useCedarState()?`
			);
			return;
		}

		// Apply the mapping function to get the context data
		const mapped = mapFn(stateValue as T);

		// Transform mapped data into properly formatted context entries
		const formattedContext: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(mapped)) {
			// Handle null/undefined values
			if (value === null || value === undefined) {
				formattedContext[key] = [];
				continue;
			}

			// Ensure value is an array for consistent processing
			const items = Array.isArray(value) ? value : [value];

			// Transform each item into a proper context entry
			formattedContext[key] = items.map((item, index) => {
				// Generate a unique ID for this entry
				const id =
					typeof item === 'object' && item !== null && 'id' in item
						? String(item.id)
						: `${key}-${index}`;

				// Extract the label using the configured method
				const label = options?.labelField ? getLabel(item) : undefined;

				// Create the context entry with clean separation of concerns
				return {
					id,
					source: 'subscription' as const,
					data: item, // The original data, unchanged
					metadata: {
						label: label || getLabel(item), // Use extracted label or fallback
						...(options?.icon && { icon: options.icon }),
						...(options?.color && { color: options.color }),
						...(options?.order !== undefined && { order: options.order }),
						showInChat:
							options?.showInChat !== undefined ? options.showInChat : true,
					},
				};
			});
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

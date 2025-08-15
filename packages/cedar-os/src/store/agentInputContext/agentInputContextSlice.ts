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
	updateAdditionalContext: (context: Record<string, any>) => void;

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

		// Sanitize context before stringifying
		const sanitizedContext = sanitizeJson(context);
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
 * Subscribe to local state changes and update additional context
 * @param localState - The local state to subscribe to
 * @param mapFn - Function to map local state to context entries
 * @param options - Optional configuration for icon, color, and label extraction
 */
export function useSubscribeInputContext<T>(
	localState: T,
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

	// Helper to extract label from an item
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

	useEffect(() => {
		const mapped = mapFn(localState);
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
	}, [localState, mapFn, updateAdditionalContext, options]);
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

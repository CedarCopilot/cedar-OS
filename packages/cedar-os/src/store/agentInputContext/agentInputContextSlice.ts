import { CedarStore } from '@/store/types';
import type { JSONContent } from '@tiptap/core';
import type { StateCreator } from 'zustand';
import type { AdditionalContext, ContextEntry, MentionProvider } from './types';
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
	overrideInputContent: { input: string | any[] | null };
	setOverrideInputContent: (content: string | any[] | null) => void;

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

/**
 * Subscribe to local state changes and update additional context
 * @param localState - The local state to subscribe to
 * @param mapFn - Function to map local state to context entries
 * @param options - Optional configuration for icon and color
 */
export function subscribeInputContext<T>(
	localState: T,
	mapFn: (state: T) => Record<string, any>,
	options?: {
		icon?: ReactNode;
		color?: string;
	}
): void {
	const updateAdditionalContext = useCedarStore(
		(s) => s.updateAdditionalContext
	);
	useEffect(() => {
		const mapped = mapFn(localState);

		// If options are provided, enhance the mapped data with metadata
		if (options && (options.icon || options.color)) {
			const enhanced: Record<string, any> = {};
			for (const [key, value] of Object.entries(mapped)) {
				if (Array.isArray(value)) {
					// For arrays, add metadata to each item
					enhanced[key] = value.map((item) => ({
						...item,
						metadata: {
							...item.metadata,
							icon: options.icon,
							color: options.color,
						},
					}));
				} else {
					// For non-arrays, keep as is
					enhanced[key] = value;
				}
			}
			updateAdditionalContext(enhanced);
		} else {
			updateAdditionalContext(mapped);
		}
	}, [localState, mapFn, updateAdditionalContext, options]);
}

// Enhanced hook to render additionalContext entries
export function renderAdditionalContext(
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

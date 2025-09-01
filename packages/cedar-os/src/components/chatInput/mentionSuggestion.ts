import { ReactRenderer } from '@tiptap/react';
import type { Editor, Range } from '@tiptap/core';
import {
	computePosition,
	flip,
	shift,
	offset,
	autoUpdate,
	type VirtualElement,
	type Placement,
} from '@floating-ui/dom';
import MentionList from '@/components/chatInput/MentionList';
import type { MentionItem } from '@/store/agentInputContext/AgentInputContextTypes';
import { useCedarStore } from '@/store/CedarStore';
import { MentionNodeAttrs } from '@tiptap/extension-mention';

// Define types for suggestion props
interface SuggestionProps<I> {
	editor: Editor;
	range: Range;
	query: string;
	text: string;
	items: I[];
	command: (props: I) => void;
	decorationNode: Element | null;
	clientRect?: (() => DOMRect | null) | null;
}

interface SuggestionKeyDownProps {
	event: KeyboardEvent;
	range: Range;
}

const mentionSuggestion = {
	items: async ({ query }: { query: string }) => {
		// Get providers for @ trigger
		const providers = useCedarStore
			.getState()
			.getMentionProvidersByTrigger('@');

		// Collect items from all providers
		const allItems: Array<MentionItem & { providerId: string }> = [];

		for (const provider of providers) {
			const items = await provider.getItems(query);
			// Add provider ID to each item
			allItems.push(
				...items.map((item) => ({
					...item,
					providerId: provider.id,
				}))
			);
		}

		return allItems;
	},

	render: () => {
		let component: ReactRenderer;
		let popupElement: HTMLDivElement | null = null;
		let cleanup: (() => void) | null = null;

		return {
			onStart: (
				props: SuggestionProps<MentionItem & { providerId: string }>
			) => {
				component = new ReactRenderer(MentionList, {
					props,
					editor: props.editor,
				});

				if (!props.clientRect) {
					return;
				}

				// Create popup element
				popupElement = document.createElement('div');
				popupElement.style.position = 'absolute';
				popupElement.style.zIndex = '9999';
				popupElement.style.maxWidth = '32rem'; // equivalent to max-w-lg (512px)
				popupElement.style.minWidth = '12rem'; // equivalent to min-w-48 (192px)
				popupElement.style.width = 'fit-content';
				popupElement.appendChild(component.element);
				document.body.appendChild(popupElement);

				// Create virtual element for positioning
				const virtualElement: VirtualElement = {
					getBoundingClientRect: () => {
						const rect = props.clientRect?.();
						return rect || new DOMRect();
					},
				};

				// Update position function
				const updatePosition = async () => {
					if (!popupElement) return;

					const { x, y } = await computePosition(virtualElement, popupElement, {
						placement: 'bottom-start' as Placement,
						middleware: [offset(6), flip(), shift({ padding: 5 })],
					});

					Object.assign(popupElement.style, {
						left: `${x}px`,
						top: `${y}px`,
					});
				};

				// Set up auto update
				cleanup = autoUpdate(virtualElement, popupElement, updatePosition);
			},

			onUpdate(props: SuggestionProps<MentionItem & { providerId: string }>) {
				component.updateProps(props);

				if (!props.clientRect || !popupElement) {
					return;
				}

				// Create updated virtual element
				const virtualElement: VirtualElement = {
					getBoundingClientRect: () => {
						const rect = props.clientRect?.();
						return rect || new DOMRect();
					},
				};

				// Update position
				computePosition(virtualElement, popupElement, {
					placement: 'bottom-start' as Placement,
					middleware: [offset(6), flip(), shift({ padding: 5 })],
				}).then(({ x, y }) => {
					if (popupElement) {
						Object.assign(popupElement.style, {
							left: `${x}px`,
							top: `${y}px`,
						});
					}
				});
			},

			onKeyDown(props: SuggestionKeyDownProps) {
				if (props.event.key === 'Escape') {
					if (popupElement) {
						popupElement.style.display = 'none';
					}
					return true;
				}

				// Type assertion for MentionList ref
				const mentionListRef = component.ref as {
					onKeyDown?: (data: { event: KeyboardEvent }) => boolean;
				} | null;

				if (mentionListRef?.onKeyDown) {
					// Pass the native KeyboardEvent directly
					const handled = mentionListRef.onKeyDown({ event: props.event });

					// If the mention list handled the event (especially Enter),
					// prevent default and stop propagation to ensure absolute precedence
					if (handled) {
						props.event.preventDefault();
						props.event.stopPropagation();
					}

					return handled;
				}

				return false;
			},

			onExit() {
				if (cleanup) {
					cleanup();
				}
				if (popupElement && popupElement.parentNode) {
					popupElement.parentNode.removeChild(popupElement);
				}
				component.destroy();
			},
		};
	},

	command: ({
		editor,
		range,
		props,
	}: {
		editor: Editor;
		range: Range;
		props: MentionNodeAttrs & { providerId?: string };
	}) => {
		const item = props;

		// Get the provider that created this item
		const provider = useCedarStore
			.getState()
			.getMentionProvidersByTrigger('@')
			.find((p) => p.id === item.providerId);

		if (!provider) {
			console.warn('No provider found for item:', item);
			return;
		}

		// Create context entry
		const contextEntry = provider.toContextEntry(item);

		// For state-based providers, the context key is the provider ID (which is the stateKey)
		const contextKey = provider.id;

		// Add to additional context
		const state = useCedarStore.getState();
		state.addContextEntry(contextKey, contextEntry);

		// Insert mention with provider ID and context info
		editor
			.chain()
			.focus()
			.insertContentAt(range, [
				{
					type: 'mention',
					attrs: {
						id: item.id,
						label: item.label,
						providerId: provider.id,
						contextKey: contextKey,
						contextEntryId: contextEntry.id,
					},
				},
				{
					type: 'text',
					text: ' ',
				},
			])
			.run();
	},
};

export default mentionSuggestion;

import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import MentionList from './MentionList';
import type { MentionItem } from '@/store/agentInputContext/types';
import { useCedarStore } from '@/store/CedarStore';

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
		let popup: any;

		return {
			onStart: (props: any) => {
				component = new ReactRenderer(MentionList, {
					props,
					editor: props.editor,
				});

				if (!props.clientRect) {
					return;
				}

				popup = tippy('body', {
					getReferenceClientRect: props.clientRect,
					appendTo: () => document.body,
					content: component.element,
					showOnCreate: true,
					interactive: true,
					trigger: 'manual',
					placement: 'bottom-start',
				});
			},

			onUpdate(props: any) {
				component.updateProps(props);

				if (!props.clientRect) {
					return;
				}

				popup[0].setProps({
					getReferenceClientRect: props.clientRect,
				});
			},

			onKeyDown(props: any) {
				if (props.event.key === 'Escape') {
					popup[0].hide();
					return true;
				}

				return (component.ref as any)?.onKeyDown(props);
			},

			onExit() {
				popup[0].destroy();
				component.destroy();
			},
		};
	},

	command: ({ editor, range, props }: any) => {
		const item = props as MentionItem & { providerId: string };

		// Get the provider that created this item
		const provider = useCedarStore
			.getState()
			.getMentionProvidersByTrigger('@')
			.find((p: any) => p.id === item.providerId);

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

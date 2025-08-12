import { useCedarStore } from '@/store/CedarStore';
import { ReactNode, useEffect } from 'react';
import { v4 } from 'uuid';
import type {
	ContextEntry,
	MentionItem,
	MentionProvider,
	StateBasedMentionProviderConfig,
} from './AgentInputContextTypes';

/**
 * Helper to extract label from an item
 */
function getLabel(
	item: any,
	labelField?: string | ((item: any) => string)
): string {
	if (typeof labelField === 'function') {
		return labelField(item);
	} else if (typeof labelField === 'string') {
		return item[labelField] || item.id || 'Unknown';
	}
	// Default label extraction
	return item.title || item.label || item.name || item.id || 'Unknown';
}

/**
 * Helper to search an item
 */
function searchItem(
	item: any,
	query: string,
	config: StateBasedMentionProviderConfig
): boolean {
	const lowerQuery = query.toLowerCase();

	// Search in label
	if (getLabel(item, config.labelField).toLowerCase().includes(lowerQuery)) {
		return true;
	}

	// Search in specified fields
	for (const field of config.searchFields || []) {
		const value = item[field];
		if (value && String(value).toLowerCase().includes(lowerQuery)) {
			return true;
		}
	}

	return false;
}

/**
 * Hook to create and register a state-based mention provider
 * This is an all-in-one hook that handles provider creation and registration
 */
export function useStateBasedMentionProvider(
	config: StateBasedMentionProviderConfig
): void {
	const registerMentionProvider = useCedarStore(
		(s) => s.registerMentionProvider
	);
	const unregisterMentionProvider = useCedarStore(
		(s) => s.unregisterMentionProvider
	);

	useEffect(() => {
		const provider: MentionProvider & { icon?: ReactNode; color?: string } = {
			id: config.stateKey, // Use stateKey as provider ID
			trigger: config.trigger || '@',
			label: config.description || `${config.stateKey} items`,
			description: config.description,
			icon: config.icon, // Store icon at provider level
			color: config.color, // Store color at provider level

			getItems: (query: string) => {
				// Get state from Cedar store
				const state = useCedarStore.getState();
				const stateValue = state.getCedarState(config.stateKey);

				if (!Array.isArray(stateValue)) {
					return [];
				}

				// Filter items based on query
				const filtered = query
					? stateValue.filter((item) => searchItem(item, query, config))
					: stateValue;

				// Convert to mention items
				return filtered.slice(0, 10).map((item) => ({
					id: item.id || String(Math.random()),
					label: getLabel(item, config.labelField),
					data: item,
					metadata: {
						...item.metadata,
						// Add icon, color, and order from config if provided
						icon: config.icon || item.metadata?.icon,
						color: config.color || item.metadata?.color,
						order: config.order, // Add order from config
					},
				}));
			},

			toContextEntry: (item: MentionItem): ContextEntry => ({
				id: item.id || v4(),
				source: 'mention',
				data: item.data,
				metadata: {
					label: item.label!,
					...item.metadata,
					// Ensure icon, color, and order are passed through
					icon: item.metadata?.icon || config.icon,
					color: item.metadata?.color || config.color,
					order: config.order, // Add order from config
				},
			}),

			// Pass through optional renderers
			renderMenuItem: config.renderMenuItem,
			renderEditorItem: config.renderEditorItem,
			renderContextBadge: config.renderContextBadge,
		};

		registerMentionProvider(provider);

		return () => {
			unregisterMentionProvider(config.stateKey);
		};
	}, [config, registerMentionProvider, unregisterMentionProvider]);
}

/**
 * Hook to register a custom mention provider
 * For advanced use cases where you need full control over the provider
 */
export function useMentionProvider(provider: MentionProvider): void {
	const registerMentionProvider = useCedarStore(
		(s) => s.registerMentionProvider
	);
	const unregisterMentionProvider = useCedarStore(
		(s) => s.unregisterMentionProvider
	);

	useEffect(() => {
		registerMentionProvider(provider);

		return () => {
			unregisterMentionProvider(provider.id);
		};
	}, [provider, registerMentionProvider, unregisterMentionProvider]);
}

/**
 * Hook to get all registered mention providers
 */
export function useMentionProviders(): MentionProvider[] {
	const mentionProviders = useCedarStore((s) => s.mentionProviders);
	return Array.from(mentionProviders.values());
}

/**
 * Hook to get mention providers by trigger
 */
export function useMentionProvidersByTrigger(
	trigger: string
): MentionProvider[] {
	const mentionProviders = useCedarStore((s) => s.mentionProviders);
	return Array.from(mentionProviders.values()).filter(
		(provider) => provider.trigger === trigger
	);
}

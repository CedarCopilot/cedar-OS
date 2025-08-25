import React from 'react';
import {
	useCedarStore,
	useRenderAdditionalContext,
	ContextEntry,
	withClassName,
	type CedarEditor as Editor,
} from 'cedar-os';
import { X } from 'lucide-react';

/**
 * Helper to normalize context entries to an array for internal processing
 */
function normalizeToArray(
	value: ContextEntry | ContextEntry[]
): ContextEntry[] {
	return Array.isArray(value) ? value : [value];
}

interface ContextBadgeRowProps {
	editor?: Editor | null;
}

export const ContextBadgeRow: React.FC<ContextBadgeRowProps> = ({ editor }) => {
	const removeContextEntry = useCedarStore((s) => s.removeContextEntry);
	const mentionProviders = useCedarStore((s) => s.mentionProviders);
	const additionalContext = useCedarStore((s) => s.additionalContext);

	const renderContextBadge = (key: string, entry: ContextEntry) => {
		// Try to find a provider that might have created this entry
		const provider = mentionProviders.get(key);

		// Respect visibility flag
		if (entry.metadata?.showInChat === false) {
			return null;
		}

		// Use custom renderer if available
		if (provider?.renderContextBadge) {
			return provider.renderContextBadge(entry);
		}

		// Get the label from metadata or fall back to id
		const label = entry.metadata?.label || entry.id;

		// Get color from metadata and apply 20% opacity
		const color = entry.metadata?.color;
		const bgStyle = color ? { backgroundColor: `${color}33` } : {}; // 33 in hex = 20% opacity

		return (
			<div
				key={entry.id}
				className={`px-2 py-1 border text-xs rounded-sm cursor-pointer flex items-center gap-1 whitespace-nowrap hover:border-opacity-80 hover:text-opacity-80 group`}
				style={bgStyle}
				tabIndex={0}
				aria-label={`Selected ${key} ${label}`}
				onClick={() => {
					if (entry.source === 'mention') {
						removeContextEntry(key, entry.id);
						// Also remove the mention from the editor
						if (editor) {
							const { state } = editor;
							const { doc, tr } = state;
							let found = false;

							doc.descendants((node, pos) => {
								if (
									node.type.name === 'mention' &&
									node.attrs.contextEntryId === entry.id
								) {
									tr.delete(pos, pos + node.nodeSize);
									found = true;
									return false;
								}
							});

							if (found) {
								editor.view.dispatch(tr);
							}
						}
					}
				}}>
				{entry.metadata?.icon && entry.source === 'mention' && (
					<>
						<span className='flex-shrink-0 group-hover:hidden'>
							{withClassName(entry.metadata.icon, 'w-3 h-3')}
						</span>
						<X className='w-3 h-3 flex-shrink-0 hidden group-hover:block' />
					</>
				)}
				{entry.metadata?.icon && entry.source !== 'mention' && (
					<span className='flex-shrink-0'>
						{withClassName(entry.metadata.icon, 'w-3 h-3')}
					</span>
				)}
				{!entry.metadata?.icon && entry.source === 'mention' && (
					<X className='w-3 h-3 flex-shrink-0 hidden group-hover:block' />
				)}
				<span>{label}</span>
			</div>
		);
	};

	// Build renderers dynamically from all registered mention providers
	// and sort entries by order metadata
	const contextRenderers = React.useMemo(() => {
		const renderers: Record<string, (entry: ContextEntry) => React.ReactNode> =
			{};

		// Create a sorted list of context keys based on their entries' order metadata
		const contextKeysWithOrder = Object.keys(additionalContext).map((key) => {
			const value = additionalContext[key];
			const entries = normalizeToArray(value);
			// Get the minimum order value from entries for this key (or MAX if none)
			const minOrder = entries.reduce((min: number, entry: ContextEntry) => {
				const order = entry.metadata?.order;
				return order !== undefined ? Math.min(min, order) : min;
			}, Number.MAX_SAFE_INTEGER);

			return { key, order: minOrder };
		});

		// Sort keys by their order
		contextKeysWithOrder.sort((a, b) => a.order - b.order);

		// Add a renderer for each key in sorted order
		contextKeysWithOrder.forEach(({ key }) => {
			const provider = mentionProviders.get(key);
			if (provider || additionalContext[key]) {
				renderers[key] = (entry: ContextEntry) =>
					renderContextBadge(key, entry);
			}
		});

		return renderers;
	}, [mentionProviders, additionalContext, renderContextBadge]);

	const contextElements = useRenderAdditionalContext(contextRenderers);

	const isDarkMode = useCedarStore((s) => s.styling.darkMode);

	return (
		<div id='input-context' className='flex items-center gap-2 flex-wrap mb-1'>
			<div
				className={`px-2 py-1 border text-xs rounded-sm flex items-center gap-1 whitespace-nowrap ${
					isDarkMode ? 'bg-gray-800' : 'bg-gray-50'
				}`}>
				<span>@ add context</span>
			</div>
			{contextElements}
		</div>
	);
};

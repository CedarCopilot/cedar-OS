import {
	ContextEntry,
	useCedarStore,
	withClassName,
	type CedarEditor as Editor,
} from 'cedar-os';
import { X } from 'lucide-react';
import React from 'react';

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
	const collapsingConfigs = useCedarStore((s) => s.collapsingConfigs);

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
		const hasBgStyle = !!color;

		return (
			<div
				key={key + ':' + entry.id}
				className={`px-2 py-1 text-xs rounded-sm cursor-pointer flex items-center gap-1 whitespace-nowrap hover:border-opacity-80 hover:text-opacity-80 group box-border border ${
					hasBgStyle ? 'border-transparent' : ''
				}`}
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

	// Process and render context with collapsing logic
	const contextElements = React.useMemo(() => {
		const elements: React.ReactNode[] = [];

		// Create a sorted list of context keys based on their entries' order metadata
		const contextKeysWithOrder = Object.keys(additionalContext).map((key) => {
			const value = additionalContext[key];
			const entries = normalizeToArray(value);
			// Get the minimum order value from entries for this key (or MAX if none)
			const minOrder = entries.reduce((min: number, entry: ContextEntry) => {
				const order = entry.metadata?.order;
				return order !== undefined ? Math.min(min, order) : min;
			}, Number.MAX_SAFE_INTEGER);

			return { key, order: minOrder, entries };
		});

		// Sort keys by their order
		contextKeysWithOrder.sort((a, b) => a.order - b.order);

		// Process each key with collapsing logic
		contextKeysWithOrder.forEach(({ key, entries }) => {
			if (!entries.length) return;

			// Filter visible entries
			const visibleEntries = entries.filter(
				(entry) => entry.metadata?.showInChat !== false
			);
			const hiddenEntries = entries.filter(
				(entry) => entry.metadata?.showInChat === false
			);

			// Check for collapsing configuration from store
			const keyCollapseConfig = collapsingConfigs.get(key);

			// Apply collapsing if configured and threshold exceeded
			if (
				keyCollapseConfig &&
				visibleEntries.length > keyCollapseConfig.threshold
			) {
				console.log(
					`[ContextBadgeRow] COLLAPSING ${key}: ${visibleEntries.length} entries > threshold ${keyCollapseConfig.threshold}`
				);
				const firstEntry = entries[0];
				// Create collapsed badge
				const collapsedLabel =
					keyCollapseConfig.label?.replace(
						'{count}',
						visibleEntries.length.toString()
					) || `${visibleEntries.length} Selected`;

				const collapsedEntry: ContextEntry = {
					id: `${key}-collapsed`,
					source: 'subscription',
					data: visibleEntries.map((e) => e.data),
					metadata: {
						label: collapsedLabel,
						icon: keyCollapseConfig.icon || firstEntry?.metadata?.icon,
						color: firstEntry?.metadata?.color,
						showInChat: true,
						isCollapsed: true,
						originalCount: visibleEntries.length,
					},
				};

				// Render the collapsed badge
				elements.push(renderContextBadge(key, collapsedEntry));

				// Render any hidden entries individually
				hiddenEntries.forEach((entry) => {
					elements.push(renderContextBadge(key, entry));
				});
			} else {
				// Render all entries individually
				console.log(
					`[ContextBadgeRow] NOT collapsing ${key}: visible=${
						visibleEntries.length
					}, hasConfig=${!!keyCollapseConfig}, threshold=${
						keyCollapseConfig?.threshold
					}`
				);
				entries.forEach((entry) => {
					elements.push(renderContextBadge(key, entry));
				});
			}
		});

		return elements;
	}, [
		additionalContext,
		mentionProviders,
		collapsingConfigs,
		renderContextBadge,
	]);

	return (
		<div id='input-context' className='flex items-center gap-2 flex-wrap'>
			<div
				className={`px-2 py-1 text-xs rounded-sm flex items-center gap-1 whitespace-nowrap dark:bg-gray-800 bg-gray-50 box-border border border-transparent`}>
				<span>@ to add context</span>
			</div>
			{contextElements}
		</div>
	);
};

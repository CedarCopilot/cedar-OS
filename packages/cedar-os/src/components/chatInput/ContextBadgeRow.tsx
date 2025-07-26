import { useCedarStore } from '@/store/CedarStore';
import { renderAdditionalContext } from '@/store/agentInputContext/agentInputContextSlice';
import type { ContextEntry } from '@/store/agentInputContext/types';
import { X } from 'lucide-react';
import { withClassName } from '@/styles/stylingUtils';
import React, { useMemo } from 'react';
import type { Editor } from '@tiptap/react';

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

		// Use custom renderer if available
		if (provider?.renderContextBadge) {
			return provider.renderContextBadge(entry);
		}

		// Get the label - for selectedNodes, use the title from data
		const label =
			key === 'selectedNodes' && entry.data?.data?.title
				? entry.data.data.title
				: entry.metadata?.label || entry.id;

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
	const contextRenderers = useMemo(() => {
		const renderers: Record<string, (entry: ContextEntry) => React.ReactNode> =
			{};

		// Add a renderer for each registered mention provider
		mentionProviders.forEach((provider, providerId) => {
			renderers[providerId] = (entry: ContextEntry) =>
				renderContextBadge(providerId, entry);
		});

		// Also include any legacy hardcoded keys that might not have providers yet
		Object.keys(additionalContext).forEach((key) => {
			if (!renderers[key]) {
				renderers[key] = (entry: ContextEntry) =>
					renderContextBadge(key, entry);
			}
		});

		return renderers;
	}, [mentionProviders, additionalContext]);

	const contextElements = renderAdditionalContext(contextRenderers);

	return (
		<div id='input-context' className='flex items-center gap-2 flex-wrap mb-1'>
			<div className='px-2 py-1 border text-xs rounded-sm flex items-center gap-1 whitespace-nowrap bg-gray-50'>
				<span>@ add context</span>
			</div>
			{contextElements}
		</div>
	);
};

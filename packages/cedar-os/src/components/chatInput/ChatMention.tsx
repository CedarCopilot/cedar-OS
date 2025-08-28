import { useMentionProvidersByTrigger } from '@/store/agentInputContext/mentionProviders';
import { withClassName } from '@/styles/stylingUtils';
import { NodeViewWrapper } from '@tiptap/react';
import type { Node as ProseMirrorNode } from 'prosemirror-model';

export const MentionNodeView = ({ node }: { node: ProseMirrorNode }) => {
	const providers = useMentionProvidersByTrigger('@');

	// Find the provider that created this mention
	const provider = node.attrs.providerId
		? providers.find((p) => p.id === node.attrs.providerId)
		: null;

	// If provider has custom renderer, use it
	if (provider?.renderEditorItem) {
		const item = {
			id: node.attrs.id,
			label: node.attrs.label,
			data: node.attrs.data,
			metadata: node.attrs.metadata,
		};

		return (
			<NodeViewWrapper className='inline' contentEditable={false}>
				{provider.renderEditorItem(item, node.attrs)}
			</NodeViewWrapper>
		);
	}

	// Get the provider configuration which includes icon and color
	// The provider itself has icon and color properties
	const providerWithConfig = node.attrs.providerId
		? providers.find((p) => p.id === node.attrs.providerId)
		: null;

	// Always get icon and color from the provider, not from node.attrs
	const icon = providerWithConfig?.icon;
	const color = providerWithConfig?.color;

	// Apply color with 50% opacity if provided, otherwise use default blue
	const bgStyle = color
		? { backgroundColor: `${color}80` } // 80 in hex = 50% opacity
		: { backgroundColor: 'rgba(30, 64, 175, 0.5)' }; // Default blue with 50% opacity

	return (
		<NodeViewWrapper className='inline' contentEditable={false}>
			<span
				className='rounded-sm px-1 pb-0.5 -my-1 inline-flex items-center gap-0.5 select-none'
				style={bgStyle}
				contentEditable={false}>
				{icon ? withClassName(icon, 'w-3 h-3') : '@'}
				{node.attrs.label}
			</span>
		</NodeViewWrapper>
	);
};

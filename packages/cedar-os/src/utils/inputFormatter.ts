import type { JSONContent } from '@tiptap/core';

/**
 * Traverse a Tiptap JSONContent tree and extract plain text,
 * including handling of custom choice nodes (attrs.options/selectedOption).
 */
export function inputFormatter(content: JSONContent): string {
	let result = '';

	function walk(node: JSONContent) {
		const anyNode = node as any;

		// Extract text nodes
		if (typeof anyNode.text === 'string') {
			result += anyNode.text;
		}

		// Handle custom 'choice' nodes
		if (anyNode.type === 'choice') {
			const attrs = anyNode.attrs || {};
			const options = Array.isArray(attrs.options) ? attrs.options : [];
			const selected = attrs.selectedOption || options[0] || '';
			if (typeof selected === 'string') {
				result += selected;
			}
		}

		// Recurse into children
		if (Array.isArray(anyNode.content)) {
			anyNode.content.forEach((child: JSONContent) => walk(child));
		}
	}

	walk(content);
	return result.trim();
}

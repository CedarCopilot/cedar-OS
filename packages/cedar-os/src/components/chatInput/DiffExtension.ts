import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		addedText: {
			setAddedText: () => ReturnType;
			toggleAddedText: () => ReturnType;
			unsetAddedText: () => ReturnType;
		};
		removedText: {
			setRemovedText: () => ReturnType;
			toggleRemovedText: () => ReturnType;
			unsetRemovedText: () => ReturnType;
		};
		diff: {
			insertDiff: (options: {
				text: string;
				type: 'added' | 'removed';
			}) => ReturnType;
			markSelectionAsDiff: (type: 'added' | 'removed') => ReturnType;
			clearDiffMarks: () => ReturnType;
			replaceWithDiff: (options: {
				oldText: string;
				newText: string;
			}) => ReturnType;
		};
	}
}

// Extension for Added text (insertions)
export const AddedText = Mark.create({
	name: 'added',

	addOptions() {
		return {
			HTMLAttributes: {
				class: 'text-added',
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'ins',
			},
			{
				tag: 'span[data-diff="added"]',
			},
			{
				style: 'background-color',
				getAttrs: (value) => {
					if (typeof value === 'string' && value.includes('34, 197, 94')) {
						return {};
					}
					return false;
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-diff': 'added',
				style: `
					background-color: rgba(34, 197, 94, 0.15);
					color: rgb(34, 197, 94);
					border-radius: 2px;
					padding: 0 2px;
					text-decoration: none;
				`,
			}),
			0,
		];
	},

	addCommands() {
		return {
			setAddedText:
				() =>
				({ commands }) => {
					return commands.setMark(this.name);
				},
			toggleAddedText:
				() =>
				({ commands }) => {
					return commands.toggleMark(this.name);
				},
			unsetAddedText:
				() =>
				({ commands }) => {
					return commands.unsetMark(this.name);
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Shift-a': () => this.editor.commands.toggleMark(this.name),
		};
	},
});

// Extension for Removed text (deletions)
export const RemovedText = Mark.create({
	name: 'removed',

	addOptions() {
		return {
			HTMLAttributes: {
				class: 'text-removed',
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'del',
			},
			{
				tag: 's',
			},
			{
				tag: 'span[data-diff="removed"]',
			},
			{
				style: 'text-decoration',
				getAttrs: (value) => {
					if (typeof value === 'string' && value.includes('line-through')) {
						return {};
					}
					return false;
				},
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-diff': 'removed',
				style: `
					background-color: rgba(239, 68, 68, 0.15);
					color: rgba(239, 68, 68, 0.7);
					border-radius: 2px;
					padding: 0 2px;
					text-decoration: line-through;
				`,
			}),
			0,
		];
	},

	addCommands() {
		return {
			setRemovedText:
				() =>
				({ commands }) => {
					return commands.setMark(this.name);
				},
			toggleRemovedText:
				() =>
				({ commands }) => {
					return commands.toggleMark(this.name);
				},
			unsetRemovedText:
				() =>
				({ commands }) => {
					return commands.unsetMark(this.name);
				},
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-Shift-r': () => this.editor.commands.toggleRemovedText(),
		};
	},
});

// Combined Diff extension that includes both Added and Removed marks
export const DiffExtension = Mark.create({
	name: 'diff',

	addExtensions() {
		return [AddedText, RemovedText];
	},

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('diff'),
				props: {
					// Optional: Add decorations or other visual feedback
					decorations() {
						// You can add custom decorations here if needed
						return null;
					},
				},
			}),
		];
	},

	addCommands() {
		return {
			// Insert text with diff marking
			insertDiff:
				({ text, type }: { text: string; type: 'added' | 'removed' }) =>
				({ commands }) => {
					if (type === 'added') {
						return commands.insertContent({
							type: 'text',
							text,
							marks: [{ type: 'added' }],
						});
					} else {
						return commands.insertContent({
							type: 'text',
							text,
							marks: [{ type: 'removed' }],
						});
					}
				},

			// Apply diff to selected text
			markSelectionAsDiff:
				(type: 'added' | 'removed') =>
				({ commands }) => {
					if (type === 'added') {
						return commands.setMark('added');
					} else {
						return commands.setMark('removed');
					}
				},

			// Clear all diff marks from selection
			clearDiffMarks:
				() =>
				({ commands }) => {
					return commands.unsetMark('added') && commands.unsetMark('removed');
				},

			// Replace text with diff (shows both old and new)
			replaceWithDiff:
				({ oldText, newText }: { oldText: string; newText: string }) =>
				({ commands }) => {
					return (
						commands.insertContent({
							type: 'text',
							text: oldText,
							marks: [{ type: 'removed' }],
						}) &&
						commands.insertContent(' ') &&
						commands.insertContent({
							type: 'text',
							text: newText,
							marks: [{ type: 'added' }],
						})
					);
				},
		};
	},
});

// Helper function to apply diffs to content
export function applyDiffToContent(
	editor: {
		commands: {
			replaceWithDiff: (options: { oldText: string; newText: string }) => void;
		};
	},
	oldText: string,
	newText: string
) {
	// This is a simplified version - you might want to use the diff library here
	// to compute actual word-by-word or character-by-character differences

	// For now, just show the full replacement
	editor.commands.replaceWithDiff({ oldText, newText });
}

// Export all extensions
export default DiffExtension;

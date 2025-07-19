import { Node } from '@tiptap/core';
import { TodoCategory } from '../types';

export interface CategoryHeadingOptions {
	HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		categoryHeading: {
			setCategoryHeading: (attributes: {
				category: TodoCategory;
				date: string;
			}) => ReturnType;
		};
	}
}

export const CategoryHeading = Node.create<CategoryHeadingOptions>({
	name: 'categoryHeading',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	group: 'block',

	content: 'inline*',

	addAttributes() {
		return {
			category: {
				default: 'development',
			},
			date: {
				default: new Date().toISOString(),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-category-heading]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			{
				...this.options.HTMLAttributes,
				...HTMLAttributes,
				'data-category-heading': '',
			},
			0,
		];
	},

	addCommands() {
		return {
			setCategoryHeading:
				(attributes) =>
				({ commands }) => {
					return commands.setNode(this.name, attributes);
				},
		};
	},
});

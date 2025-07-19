import { Node } from '@tiptap/core';

export interface DateColumnOptions {
	HTMLAttributes: Record<string, string>;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		dateColumn: {
			setDateColumn: (date: string) => ReturnType;
		};
	}
}

export const DateColumn = Node.create<DateColumnOptions>({
	name: 'dateColumn',

	addOptions() {
		return {
			HTMLAttributes: {},
		};
	},

	group: 'block',

	content: 'block+',

	addAttributes() {
		return {
			date: {
				default: new Date().toISOString(),
			},
		};
	},

	parseHTML() {
		return [
			{
				tag: 'div[data-date-column]',
			},
		];
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'div',
			{
				...this.options.HTMLAttributes,
				...HTMLAttributes,
				'data-date-column': '',
			},
			0,
		];
	},

	addCommands() {
		return {
			setDateColumn:
				(date) =>
				({ commands }) => {
					return commands.setNode(this.name, { date });
				},
		};
	},
});

export type TodoCategory =
	| 'development'
	| 'sales-marketing'
	| 'personal'
	| 'errands';

export interface Todo {
	id: string;
	title: string;
	completed: boolean;
	category: TodoCategory;
	date: string; // ISO date string
	createdAt: string;
	updatedAt: string;
}

export const CATEGORY_LABELS: Record<TodoCategory, string> = {
	development: 'Development',
	'sales-marketing': 'Sales & Marketing',
	personal: 'Personal',
	errands: 'Errands',
};

export const CATEGORY_COLORS: Record<TodoCategory, string> = {
	development: 'bg-blue-100 text-blue-800 border-blue-200',
	'sales-marketing': 'bg-purple-100 text-purple-800 border-purple-200',
	personal: 'bg-green-100 text-green-800 border-green-200',
	errands: 'bg-orange-100 text-orange-800 border-orange-200',
};

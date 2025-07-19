import { supabase } from '@/app/examples/product-roadmap/supabase/client';
import type { Todo } from '../types';

// Fetch todos from Supabase
export async function getTodos(): Promise<Todo[]> {
	const { data, error } = await supabase
		.from('todos')
		.select('*')
		.order('date', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		console.error('Error fetching todos:', error);
		return [];
	}

	return (data || []).map((row) => ({
		id: row.id,
		title: row.title,
		completed: row.completed,
		category: row.category,
		date: row.date,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}));
}

// Save todos to Supabase
export async function saveTodos(todos: Todo[]) {
	const rows = todos.map((todo) => ({
		id: todo.id,
		title: todo.title,
		completed: todo.completed,
		category: todo.category,
		date: todo.date,
		created_at: todo.createdAt,
		updated_at: todo.updatedAt,
	}));

	const { error } = await supabase
		.from('todos')
		.upsert(rows, { onConflict: 'id' });

	if (error) {
		console.error('Error saving todos:', error);
		throw error;
	}
}

// Delete todos by IDs
export async function deleteTodos(ids: string[]) {
	const { error } = await supabase.from('todos').delete().in('id', ids);

	if (error) {
		console.error('Error deleting todos:', error);
		throw error;
	}
}

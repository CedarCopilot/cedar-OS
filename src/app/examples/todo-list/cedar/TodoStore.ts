import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Todo } from '../types';

interface TodoStore {
	todos: Todo[];
	setTodos: (todos: Todo[]) => void;
	addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	updateTodo: (id: string, updates: Partial<Todo>) => void;
	deleteTodo: (id: string) => void;
	toggleTodo: (id: string) => void;
}

export const useTodoStore = create<TodoStore>()(
	persist(
		(set) => ({
			todos: [],

			setTodos: (todos) => set({ todos }),

			addTodo: (newTodo) =>
				set((state) => {
					const now = new Date().toISOString();
					const todo: Todo = {
						...newTodo,
						id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						createdAt: now,
						updatedAt: now,
					};
					return { todos: [...state.todos, todo] };
				}),

			updateTodo: (id, updates) =>
				set((state) => ({
					todos: state.todos.map((todo) =>
						todo.id === id
							? { ...todo, ...updates, updatedAt: new Date().toISOString() }
							: todo
					),
				})),

			deleteTodo: (id) =>
				set((state) => ({
					todos: state.todos.filter((todo) => todo.id !== id),
				})),

			toggleTodo: (id) =>
				set((state) => ({
					todos: state.todos.map((todo) =>
						todo.id === id
							? {
									...todo,
									completed: !todo.completed,
									updatedAt: new Date().toISOString(),
							  }
							: todo
					),
				})),
		}),
		{
			name: 'todo-store',
			partialize: (state) => ({ todos: state.todos }),
		}
	)
);

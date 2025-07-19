'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TodoItem } from './TodoItem';
import type { Todo, TodoCategory } from '../types';
import { CATEGORY_COLORS } from '../types';

interface CategorySectionProps {
	category: TodoCategory;
	categoryLabel: string;
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (title: string) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

export function CategorySection({
	category,
	categoryLabel,
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: CategorySectionProps) {
	const [isAddingTodo, setIsAddingTodo] = useState(false);
	const [newTodoTitle, setNewTodoTitle] = useState('');

	const handleAddTodo = () => {
		if (newTodoTitle.trim()) {
			onAddTodo(newTodoTitle.trim());
			setNewTodoTitle('');
			setIsAddingTodo(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleAddTodo();
		} else if (e.key === 'Escape') {
			setNewTodoTitle('');
			setIsAddingTodo(false);
		}
	};

	return (
		<div className='space-y-2'>
			{/* Category Header */}
			<div
				className={`px-3 py-2 rounded-md border ${CATEGORY_COLORS[category]}`}>
				<div className='flex items-center justify-between'>
					<h3 className='text-sm font-medium'>{categoryLabel}</h3>
					<button
						onClick={() => setIsAddingTodo(true)}
						className='p-1 hover:bg-white/50 rounded transition-colors'
						aria-label={`Add todo to ${categoryLabel}`}>
						<Plus size={16} />
					</button>
				</div>
			</div>

			{/* Todo Items */}
			<div className='space-y-1 pl-2'>
				{todos.map((todo) => (
					<TodoItem
						key={todo.id}
						todo={todo}
						onToggle={() => onToggleTodo(todo.id)}
						onUpdate={(updates) => onUpdateTodo(todo.id, updates)}
						onDelete={() => onDeleteTodo(todo.id)}
					/>
				))}

				{/* Add Todo Input */}
				{isAddingTodo && (
					<div className='flex items-center gap-2 p-2 bg-gray-50 rounded'>
						<input
							type='text'
							value={newTodoTitle}
							onChange={(e) => setNewTodoTitle(e.target.value)}
							onKeyDown={handleKeyDown}
							onBlur={() => {
								if (!newTodoTitle.trim()) {
									setIsAddingTodo(false);
								}
							}}
							placeholder='Add a task...'
							className='flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
							autoFocus
						/>
						<button
							onClick={handleAddTodo}
							className='px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600'>
							Add
						</button>
						<button
							onClick={() => {
								setNewTodoTitle('');
								setIsAddingTodo(false);
							}}
							className='px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400'>
							Cancel
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

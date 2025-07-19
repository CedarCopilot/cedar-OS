'use client';

import React from 'react';
import { format } from 'date-fns';
import { CategorySection } from './CategorySection';
import type { Todo, TodoCategory } from '../types';
import { CATEGORY_LABELS } from '../types';

interface DayColumnProps {
	date: Date;
	dateLabel: string;
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

export function DayColumn({
	date,
	dateLabel,
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: DayColumnProps) {
	const categories: TodoCategory[] = [
		'development',
		'sales-marketing',
		'personal',
		'errands',
	];
	const isToday =
		format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

	const handleAddTodo = (category: TodoCategory, title: string) => {
		onAddTodo({
			title,
			completed: false,
			category,
			date: date.toISOString(),
		});
	};

	return (
		<div
			className={`flex-shrink-0 w-[300px] bg-white rounded-lg shadow-sm border ${
				isToday ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
			}`}>
			{/* Date Header */}
			<div
				className={`px-4 py-3 border-b ${
					isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
				}`}>
				<h2
					className={`font-semibold ${
						isToday ? 'text-blue-900' : 'text-gray-900'
					}`}>
					{dateLabel}
				</h2>
				<p className='text-xs text-gray-500 mt-0.5'>
					{format(date, 'MMMM d, yyyy')}
				</p>
			</div>

			{/* Category Sections */}
			<div className='p-4 space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto'>
				{categories.map((category) => (
					<CategorySection
						key={category}
						category={category}
						categoryLabel={CATEGORY_LABELS[category]}
						todos={todos.filter((todo) => todo.category === category)}
						onToggleTodo={onToggleTodo}
						onAddTodo={(title) => handleAddTodo(category, title)}
						onUpdateTodo={onUpdateTodo}
						onDeleteTodo={onDeleteTodo}
					/>
				))}
			</div>
		</div>
	);
}

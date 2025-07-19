'use client';

import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import type { Todo } from '../types';

interface TodoItemProps {
	todo: Todo;
	onToggle: () => void;
	onUpdate: (updates: Partial<Todo>) => void;
	onDelete: () => void;
}

export function TodoItem({
	todo,
	onToggle,
	onUpdate,
	onDelete,
}: TodoItemProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editTitle, setEditTitle] = useState(todo.title);

	const handleSaveEdit = () => {
		if (editTitle.trim() && editTitle !== todo.title) {
			onUpdate({ title: editTitle.trim() });
		}
		setIsEditing(false);
	};

	const handleCancelEdit = () => {
		setEditTitle(todo.title);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSaveEdit();
		} else if (e.key === 'Escape') {
			handleCancelEdit();
		}
	};

	return (
		<div className='group flex items-center gap-2 p-2 hover:bg-gray-50 rounded transition-colors'>
			<input
				type='checkbox'
				checked={todo.completed}
				onChange={onToggle}
				className='w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500'
			/>

			{isEditing ? (
				<div className='flex-1 flex items-center gap-2'>
					<input
						type='text'
						value={editTitle}
						onChange={(e) => setEditTitle(e.target.value)}
						onKeyDown={handleKeyDown}
						className='flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
						autoFocus
					/>
					<button
						onClick={handleSaveEdit}
						className='p-1 text-green-600 hover:bg-green-100 rounded'
						aria-label='Save edit'>
						<Check size={14} />
					</button>
					<button
						onClick={handleCancelEdit}
						className='p-1 text-red-600 hover:bg-red-100 rounded'
						aria-label='Cancel edit'>
						<X size={14} />
					</button>
				</div>
			) : (
				<>
					<span
						className={`flex-1 text-sm ${
							todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
						}`}>
						{todo.title}
					</span>

					<div className='opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity'>
						<button
							onClick={() => setIsEditing(true)}
							className='p-1 text-gray-600 hover:bg-gray-200 rounded'
							aria-label='Edit todo'>
							<Edit2 size={14} />
						</button>
						<button
							onClick={onDelete}
							className='p-1 text-red-600 hover:bg-red-100 rounded'
							aria-label='Delete todo'>
							<Trash2 size={14} />
						</button>
					</div>
				</>
			)}
		</div>
	);
}

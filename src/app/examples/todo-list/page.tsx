'use client';

import React, { useEffect, useState } from 'react';
import { ChatInput, registerState } from 'cedar';
import { useTodoStore } from './cedar/TodoStore';
import { getTodos, saveTodos } from './supabase/todos';
import { CheckCircle, Loader } from 'lucide-react';
import { motion } from 'motion/react';
import { MultiColumnEditor } from './components/MultiColumnEditor';

export default function TodoListPage() {
	const [isSaving, setIsSaving] = useState(false);
	const [hasSaved, setHasSaved] = useState(false);
	const initialMount = React.useRef(true);
	const saveTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	const { todos, setTodos, toggleTodo, addTodo, updateTodo, deleteTodo } =
		useTodoStore();

	// Register state for Cedar - moved to useEffect to avoid render-time state updates
	useEffect(() => {
		registerState({
			value: todos,
			setValue: setTodos,
			key: 'todos',
			description: 'Todo list items organized by date and category',
		});
	}, [todos, setTodos]);

	// Load initial data
	useEffect(() => {
		getTodos().then(setTodos);
	}, [setTodos]);

	// Save changes with debounce
	useEffect(() => {
		if (initialMount.current) {
			initialMount.current = false;
			return;
		}
		if (saveTimeout.current) {
			clearTimeout(saveTimeout.current);
		}
		saveTimeout.current = setTimeout(() => {
			setIsSaving(true);
			saveTodos(todos)
				.then(() => {
					setIsSaving(false);
					setHasSaved(true);
					setTimeout(() => setHasSaved(false), 2000);
				})
				.catch(() => setIsSaving(false));
		}, 1000);
		return () => {
			if (saveTimeout.current) {
				clearTimeout(saveTimeout.current);
			}
		};
	}, [todos]);

	return (
		<div className='relative h-screen w-full bg-gray-50'>
			<div className='h-full flex flex-col'>
				{/* Header */}
				<div className='bg-white border-b border-gray-200 px-6 py-4'>
					<h1 className='text-2xl font-semibold text-gray-900'>Todo List</h1>
					<p className='text-sm text-gray-500 mt-1'>
						A Notion-like editor experience with multiple day columns
					</p>
				</div>

				{/* Editor */}
				<div className='flex-1 overflow-hidden'>
					<MultiColumnEditor
						todos={todos}
						onToggleTodo={toggleTodo}
						onAddTodo={addTodo}
						onUpdateTodo={updateTodo}
						onDeleteTodo={deleteTodo}
					/>
				</div>

				{/* Chat Input */}
				<ChatInput
					position='bottom-center'
					handleFocus={() => {}}
					handleBlur={() => {}}
					isInputFocused={false}
				/>
			</div>

			{/* Save Indicator */}
			<div className='absolute top-4 right-4 z-20'>
				{isSaving ? (
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
						<Loader size={20} className='text-gray-500' />
					</motion.div>
				) : hasSaved ? (
					<CheckCircle size={20} className='text-green-500' />
				) : null}
			</div>
		</div>
	);
}

'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import {
	format,
	addDays,
	startOfDay,
	isToday,
	isYesterday,
	isTomorrow,
} from 'date-fns';
import type { Todo, TodoCategory } from '../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import { DragHandle } from './DragHandle';

interface TodoEditorProps {
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

export function TodoEditor({
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: TodoEditorProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [visibleDates, setVisibleDates] = React.useState<Date[]>([]);

	// Initialize visible dates
	useEffect(() => {
		const dates: Date[] = [];
		for (let i = -7; i <= 7; i++) {
			dates.push(addDays(new Date(), i));
		}
		setVisibleDates(dates);
	}, []);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
			}),
			TaskList.configure({
				HTMLAttributes: {
					class: 'task-list space-y-1',
				},
			}),
			TaskItem.configure({
				nested: false,
				HTMLAttributes: {
					class:
						'task-item group relative flex items-start gap-2 p-2 hover:bg-gray-50 rounded transition-colors',
				},
				onReadOnlyChecked: (node, checked) => {
					// Handle checkbox changes
					const todoId = node.attrs['data-todo-id'];
					if (todoId) {
						onToggleTodo(todoId);
					}
					return false; // Allow the change
				},
			}),
			Placeholder.configure({
				placeholder: 'Type to add a task...',
				showOnlyWhenEditable: true,
				showOnlyCurrent: true,
			}),
		],
		content: '',
		editorProps: {
			attributes: {
				class: 'focus:outline-none min-h-full',
			},
		},
	});

	// Generate content when todos or dates change
	useEffect(() => {
		if (editor && visibleDates.length > 0) {
			editor.commands.setContent(generateEditorContent(visibleDates, todos));
		}
	}, [editor, todos, visibleDates]);

	// Scroll to yesterday on mount
	useEffect(() => {
		if (scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			setTimeout(() => {
				const yesterdayElement = container.querySelector(
					`[data-date="${format(addDays(new Date(), -1), 'yyyy-MM-dd')}"]`
				);
				if (yesterdayElement) {
					yesterdayElement.scrollIntoView({
						inline: 'start',
						behavior: 'smooth',
					});
				}
			}, 100);
		}
	}, []);

	const getDateLabel = (date: Date) => {
		if (isToday(date)) return 'Today';
		if (isYesterday(date)) return 'Yesterday';
		if (isTomorrow(date)) return 'Tomorrow';
		return format(date, 'EEEE, MMM d');
	};

	return (
		<div
			ref={scrollContainerRef}
			className='h-full overflow-x-auto overflow-y-hidden'>
			<div className='flex gap-4 p-6 min-w-max'>
				{visibleDates.map((date) => {
					const isCurrentDay = isToday(date);
					const dateTodos = todos.filter(
						(todo) =>
							format(startOfDay(new Date(todo.date)), 'yyyy-MM-dd') ===
							format(startOfDay(date), 'yyyy-MM-dd')
					);

					return (
						<div
							key={format(date, 'yyyy-MM-dd')}
							data-date={format(date, 'yyyy-MM-dd')}
							className={`flex-shrink-0 w-[300px] bg-white rounded-lg shadow-sm border ${
								isCurrentDay
									? 'border-blue-400 ring-2 ring-blue-100'
									: 'border-gray-200'
							}`}>
							{/* Date Header */}
							<div
								className={`px-4 py-3 border-b ${
									isCurrentDay
										? 'bg-blue-50 border-blue-200'
										: 'bg-gray-50 border-gray-200'
								}`}>
								<h2
									className={`font-semibold ${
										isCurrentDay ? 'text-blue-900' : 'text-gray-900'
									}`}>
									{getDateLabel(date)}
								</h2>
								<p className='text-xs text-gray-500 mt-0.5'>
									{format(date, 'MMMM d, yyyy')}
								</p>
							</div>

							{/* Categories */}
							<div className='p-4 space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto'>
								{(
									[
										'development',
										'sales-marketing',
										'personal',
										'errands',
									] as TodoCategory[]
								).map((category) => {
									const categoryTodos = dateTodos.filter(
										(todo) => todo.category === category
									);

									return (
										<div key={category} className='space-y-2'>
											{/* Category Header */}
											<div
												className={`px-3 py-2 rounded-md border ${CATEGORY_COLORS[category]}`}>
												<h3 className='text-sm font-medium'>
													{CATEGORY_LABELS[category]}
												</h3>
											</div>

											{/* Task List */}
											<div className='pl-2'>
												<EditorContent
													editor={editor}
													className='task-list-editor'
												/>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function generateEditorContent(dates: Date[], todos: Todo[]) {
	return `
		<div class="editor-content">
			${dates
				.map((date) => {
					const dateTodos = todos.filter(
						(todo) =>
							format(startOfDay(new Date(todo.date)), 'yyyy-MM-dd') ===
							format(startOfDay(date), 'yyyy-MM-dd')
					);

					return `
						<div data-date="${format(date, 'yyyy-MM-dd')}">
							${(['development', 'sales-marketing', 'personal', 'errands'] as TodoCategory[])
								.map((category) => {
									const categoryTodos = dateTodos.filter(
										(todo) => todo.category === category
									);

									return `
										<ul data-type="taskList">
											${categoryTodos
												.map(
													(todo) => `
													<li data-type="taskItem" data-checked="${todo.completed}" data-todo-id="${
														todo.id
													}">
														<label>
															<input type="checkbox" ${todo.completed ? 'checked' : ''}>
															<span>${todo.title}</span>
														</label>
													</li>
												`
												)
												.join('')}
										</ul>
									`;
								})
								.join('')}
						</div>
					`;
				})
				.join('')}
		</div>
	`;
}

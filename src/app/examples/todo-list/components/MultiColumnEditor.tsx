'use client';

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import DragHandle from '@tiptap/extension-drag-handle';
import {
	format,
	addDays,
	startOfDay,
	isToday,
	isYesterday,
	isTomorrow,
} from 'date-fns';
import type { Todo, TodoCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import '../styles/editor.css';

interface DayEditorProps {
	date: Date;
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

function DayEditor({
	date,
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: DayEditorProps) {
	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [3],
				},
				bulletList: false,
				orderedList: false,
				listItem: false,
			}),
			TaskList.configure({
				HTMLAttributes: {
					class: 'not-prose space-y-1',
				},
			}),
			TaskItem.configure({
				nested: true,
				HTMLAttributes: {
					class: 'task-item',
				},
			}),
			Placeholder.configure({
				placeholder: 'Add a task...',
			}),
			DragHandle.configure({
				render: () => {
					const element = document.createElement('div');
					element.classList.add('drag-handle');
					element.innerHTML = `
						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="9" cy="5" r="1"></circle>
							<circle cx="9" cy="12" r="1"></circle>
							<circle cx="9" cy="19" r="1"></circle>
							<circle cx="15" cy="5" r="1"></circle>
							<circle cx="15" cy="12" r="1"></circle>
							<circle cx="15" cy="19" r="1"></circle>
						</svg>
					`;
					return element;
				},
			}),
		],
		content: generateDayContent(date, todos),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none p-4 min-h-full',
			},
		},
	});

	// Handle task item changes
	useEffect(() => {
		if (!editor) return;

		const handleUpdate = () => {
			const doc = editor.getJSON();
			processTodoChanges(
				doc,
				todos,
				date,
				onToggleTodo,
				onAddTodo,
				onUpdateTodo
			);
		};

		editor.on('update', handleUpdate);
		return () => {
			editor.off('update', handleUpdate);
		};
	}, [
		editor,
		todos,
		date,
		onToggleTodo,
		onAddTodo,
		onUpdateTodo,
		onDeleteTodo,
	]);

	// Update content when todos change
	useEffect(() => {
		if (!editor || editor.isDestroyed) return;

		const currentContent = editor.getHTML();
		const newContent = generateDayContent(date, todos);

		// Only update if content actually changed
		if (currentContent !== newContent) {
			editor.commands.setContent(newContent);
		}
	}, [todos, date, editor]);

	const getDateLabel = (date: Date) => {
		if (isToday(date)) return 'Today';
		if (isYesterday(date)) return 'Yesterday';
		if (isTomorrow(date)) return 'Tomorrow';
		return format(date, 'EEEE, MMM d');
	};

	const isCurrentDay = isToday(date);

	return (
		<div
			className={`flex-shrink-0 w-[350px] bg-white rounded-lg shadow-sm border ${
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

			{/* Editor Content */}
			<div className='max-h-[calc(100vh-240px)] overflow-y-auto'>
				<EditorContent editor={editor} />
			</div>
		</div>
	);
}

interface MultiColumnEditorProps {
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

export function MultiColumnEditor({
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: MultiColumnEditorProps) {
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

	// Scroll to yesterday on mount
	useEffect(() => {
		if (scrollContainerRef.current && visibleDates.length > 0) {
			const container = scrollContainerRef.current;
			setTimeout(() => {
				const yesterdayIndex = visibleDates.findIndex((date) =>
					isYesterday(date)
				);
				if (yesterdayIndex !== -1) {
					const scrollPosition = yesterdayIndex * 366; // 350px width + 16px gap
					container.scrollLeft = scrollPosition;
				}
			}, 100);
		}
	}, [visibleDates]);

	return (
		<div
			ref={scrollContainerRef}
			className='h-full overflow-x-auto overflow-y-hidden'>
			<div className='flex gap-4 p-6 min-w-max'>
				{visibleDates.map((date) => {
					const dateTodos = todos.filter(
						(todo) =>
							format(startOfDay(new Date(todo.date)), 'yyyy-MM-dd') ===
							format(startOfDay(date), 'yyyy-MM-dd')
					);

					return (
						<DayEditor
							key={format(date, 'yyyy-MM-dd')}
							date={date}
							todos={dateTodos}
							onToggleTodo={onToggleTodo}
							onAddTodo={onAddTodo}
							onUpdateTodo={onUpdateTodo}
							onDeleteTodo={onDeleteTodo}
						/>
					);
				})}
			</div>
		</div>
	);
}

function generateDayContent(date: Date, todos: Todo[]) {
	const categories: TodoCategory[] = [
		'development',
		'sales-marketing',
		'personal',
		'errands',
	];
	const categoryEmojis = {
		development: '💻',
		'sales-marketing': '📈',
		personal: '👤',
		errands: '🏃',
	};

	let content = '';

	categories.forEach((category) => {
		const categoryTodos = todos.filter((todo) => todo.category === category);
		content += `<h3>${categoryEmojis[category]} ${CATEGORY_LABELS[category]}</h3>`;
		content += `<ul data-type="taskList">`;

		categoryTodos.forEach((todo) => {
			content += `
				<li data-type="taskItem" data-checked="${todo.completed}" data-todo-id="${
				todo.id
			}" data-category="${category}">
					<label>
						<input type="checkbox" ${todo.completed ? 'checked' : ''}>
						<span>${todo.title}</span>
					</label>
				</li>
			`;
		});

		// Add empty task item for new entries
		content += `
			<li data-type="taskItem" data-checked="false" data-category="${category}">
				<label>
					<input type="checkbox">
					<span></span>
				</label>
			</li>
		`;

		content += `</ul>`;
	});

	return content;
}

interface TodoNode {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: TodoNode[];
	text?: string;
}

function processTodoChanges(
	doc: TodoNode,
	currentTodos: Todo[],
	date: Date,
	onToggleTodo: (id: string) => void,
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void,
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void
) {
	// Extract all task items from the document
	const taskItems: TodoNode[] = [];

	function extractTaskItems(node: TodoNode) {
		if (node.type === 'taskItem') {
			taskItems.push(node);
		}
		if (node.content) {
			node.content.forEach(extractTaskItems);
		}
	}

	extractTaskItems(doc);

	// Process each task item
	taskItems.forEach((item) => {
		const todoId = item.attrs?.['data-todo-id'] as string | undefined;
		const category = item.attrs?.['data-category'] as string | undefined;
		const checked = (item.attrs?.checked as boolean) || false;
		const text = extractText(item);

		if (todoId) {
			// Existing todo
			const existingTodo = currentTodos.find((t) => t.id === todoId);
			if (existingTodo) {
				if (existingTodo.completed !== checked) {
					onToggleTodo(todoId);
				}
				if (existingTodo.title !== text && text) {
					onUpdateTodo(todoId, { title: text });
				}
			}
		} else if (text && category) {
			// New todo
			onAddTodo({
				title: text,
				completed: checked,
				category: category as TodoCategory,
				date: date.toISOString(),
			});
		}
	});
}

function extractText(node: TodoNode): string {
	if (node.type === 'text' && node.text) {
		return node.text;
	}
	if (node.content) {
		return node.content.map(extractText).join('');
	}
	return '';
}

'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import { format } from 'date-fns';
import type { Todo, TodoCategory } from '../types';
import { CATEGORY_LABELS } from '../types';
import '../styles/editor.css';

interface NotionEditorProps {
	todos: Todo[];
	onToggleTodo: (id: string) => void;
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void;
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void;
	onDeleteTodo: (id: string) => void;
}

export function NotionEditor({
	todos,
	onToggleTodo,
	onAddTodo,
	onUpdateTodo,
	onDeleteTodo,
}: NotionEditorProps) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
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
				nested: false,
				HTMLAttributes: {
					class: 'task-item',
				},
			}),
			Placeholder.configure({
				placeholder: ({ node }) => {
					if (node.type.name === 'paragraph' && !node.textContent) {
						return "Type '/' for commands or start typing...";
					}
					return '';
				},
			}),
		],
		content: generateInitialContent(),
		editorProps: {
			attributes: {
				class: 'prose prose-sm max-w-none focus:outline-none p-8 min-h-full',
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
				onToggleTodo,
				onAddTodo,
				onUpdateTodo,
				onDeleteTodo
			);
		};

		editor.on('update', handleUpdate);
		return () => {
			editor.off('update', handleUpdate);
		};
	}, [editor, todos, onToggleTodo, onAddTodo, onUpdateTodo, onDeleteTodo]);

	// Update content when todos change from external sources
	useEffect(() => {
		if (!editor || editor.isDestroyed) return;

		// Check if we should update (only if todos changed externally)
		const shouldUpdate = todos.some((todo) => {
			const taskItem = editor.$doc.querySelector(`[data-todo-id="${todo.id}"]`);
			return !taskItem;
		});

		if (shouldUpdate) {
			editor.commands.setContent(generateContentFromTodos(todos));
		}
	}, [todos, editor]);

	return (
		<div className='h-full bg-white overflow-y-auto'>
			<EditorContent editor={editor} className='h-full' />
		</div>
	);
}

function generateInitialContent() {
	const today = new Date();
	return `
		<h1>📝 Todo List</h1>
		<p>Welcome to your Notion-style todo list. Click anywhere and start typing to add tasks.</p>
		<h2>📅 ${format(today, 'EEEE, MMMM d, yyyy')}</h2>
		<h3>💻 Development</h3>
		<ul data-type="taskList">
			<li data-type="taskItem" data-checked="false" data-category="development">
				<label>
					<input type="checkbox">
					<span></span>
				</label>
			</li>
		</ul>
		<h3>📈 Sales & Marketing</h3>
		<ul data-type="taskList">
			<li data-type="taskItem" data-checked="false" data-category="sales-marketing">
				<label>
					<input type="checkbox">
					<span></span>
				</label>
			</li>
		</ul>
		<h3>👤 Personal</h3>
		<ul data-type="taskList">
			<li data-type="taskItem" data-checked="false" data-category="personal">
				<label>
					<input type="checkbox">
					<span></span>
				</label>
			</li>
		</ul>
		<h3>🏃 Errands</h3>
		<ul data-type="taskList">
			<li data-type="taskItem" data-checked="false" data-category="errands">
				<label>
					<input type="checkbox">
					<span></span>
				</label>
			</li>
		</ul>
	`;
}

function generateContentFromTodos(todos: Todo[]) {
	const today = new Date();
	const todayTodos = todos.filter(
		(todo) =>
			format(new Date(todo.date), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
	);

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

	let content = `<h1>📝 Todo List</h1>`;
	content += `<p>Welcome to your Notion-style todo list. Click anywhere and start typing to add tasks.</p>`;
	content += `<h2>📅 ${format(today, 'EEEE, MMMM d, yyyy')}</h2>`;

	categories.forEach((category) => {
		const categoryTodos = todayTodos.filter(
			(todo) => todo.category === category
		);
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
	type: string;
	attrs?: Record<string, unknown>;
	content?: TodoNode[];
	text?: string;
}

function processTodoChanges(
	doc: TodoNode,
	currentTodos: Todo[],
	onToggleTodo: (id: string) => void,
	onAddTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'updatedAt'>) => void,
	onUpdateTodo: (id: string, updates: Partial<Todo>) => void,
	_onDeleteTodo: (id: string) => void
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
				date: new Date().toISOString(),
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

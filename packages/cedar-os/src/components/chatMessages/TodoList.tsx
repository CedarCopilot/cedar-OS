import React from 'react';
import { TodoListMessage } from '@/store/messages/types';
import { Check } from 'lucide-react';
import { useMessages } from '@/store/CedarStore';

interface TodoListProps {
	message: TodoListMessage;
}

const TodoList: React.FC<TodoListProps> = ({ message }) => {
	const { items } = message;
	const { messages, setMessages } = useMessages();
	if (!items || items.length === 0) return null;

	const toggleItem = (index: number) => {
		setMessages(
			messages.map((msg) => {
				if (msg.id !== message.id) return msg;
				const m = msg as TodoListMessage;
				const newItems = m.items.map((it, i) =>
					i === index ? { ...it, done: !it.done } : it
				);
				return { ...m, items: newItems };
			})
		);
	};

	return (
		<ul className='space-y-2'>
			{items.map((item, index) => (
				<li
					key={`${message.id}-${item.text}`}
					onClick={() => toggleItem(index)}
					className={`p-4 rounded-md cursor-pointer ${
						item.done
							? 'bg-green-100 border border-green-200'
							: 'bg-blue-50 border border-blue-200'
					}`}>
					<div className='flex items-start'>
						{item.done ? (
							<Check className='text-green-600 w-5 h-5 mt-1 mr-2' />
						) : (
							<div className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 mr-2'>
								{index + 1}
							</div>
						)}
						<div>
							<span className='font-medium'>{item.text}</span>
							{item.description && (
								<p className='text-sm text-gray-500 mt-1'>{item.description}</p>
							)}
						</div>
					</div>
				</li>
			))}
		</ul>
	);
};

export default TodoList;

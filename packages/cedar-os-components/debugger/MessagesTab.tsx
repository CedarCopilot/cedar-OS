import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	User,
	Bot,
	Check,
	Copy,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';
import { cn } from 'cedar-os';
import type { MessagesTabProps, Message } from './types';

export const MessagesTab: React.FC<MessagesTabProps> = ({
	messages,
	onCopy,
	copiedId,
}) => {
	const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
		new Set()
	);
	const [selectedThread, setSelectedThread] = useState<string | null>(null);

	// Group messages by thread
	const threads = React.useMemo(() => {
		const threadMap = new Map<string, Message[]>();
		messages.forEach((msg) => {
			const threadId = msg.threadId || 'default';
			if (!threadMap.has(threadId)) {
				threadMap.set(threadId, []);
			}
			threadMap.get(threadId)!.push(msg);
		});
		return threadMap;
	}, [messages]);

	const currentMessages = selectedThread
		? threads.get(selectedThread) || []
		: messages;

	const toggleExpanded = (messageId: string) => {
		setExpandedMessages((prev) => {
			const next = new Set(prev);
			if (next.has(messageId)) {
				next.delete(messageId);
			} else {
				next.add(messageId);
			}
			return next;
		});
	};

	const getMessageTypeColor = (type: string) => {
		const colors: Record<string, string> = {
			text: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
			progress_update:
				'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
			humanInTheLoop:
				'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
			dialogue_options:
				'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
			multiple_choice:
				'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300',
			todolist: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300',
			ticker: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300',
		};
		return (
			colors[type] ||
			'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
		);
	};

	const formatTimestamp = (msg: Message) => {
		const timestamp = msg.timestamp || msg.createdAt;
		if (!timestamp) return null;
		return new Date(timestamp).toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	return (
		<div className='h-full flex flex-col'>
			{/* Thread selector */}
			{threads.size > 1 && (
				<div className='px-2 py-1 border-b border-gray-200 dark:border-gray-700'>
					<select
						value={selectedThread || 'all'}
						onChange={(e) =>
							setSelectedThread(
								e.target.value === 'all' ? null : e.target.value
							)
						}
						className='text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'>
						<option value='all'>All Threads ({messages.length})</option>
						{Array.from(threads.entries()).map(([threadId, msgs]) => (
							<option key={threadId} value={threadId}>
								Thread: {threadId} ({msgs.length})
							</option>
						))}
					</select>
				</div>
			)}

			{/* Messages list */}
			<div className='flex-1 overflow-y-auto p-2 space-y-1'>
				{currentMessages.length === 0 ? (
					<div className='text-center text-gray-500 dark:text-gray-400 py-4 text-xs'>
						No messages yet
					</div>
				) : (
					currentMessages.map((msg) => {
						const isExpanded = expandedMessages.has(msg.id);
						const timestamp = formatTimestamp(msg);

						return (
							<div
								key={msg.id}
								className={cn(
									'border rounded-lg transition-all cursor-pointer hover:shadow-md',
									msg.role === 'user'
										? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/80'
										: 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900/80'
								)}
								onClick={() => toggleExpanded(msg.id)}>
								<div className='flex items-center justify-between p-2 rounded-t-lg'>
									<div className='flex items-center gap-1.5 flex-1'>
										{msg.role === 'user' ? (
											<User className='w-3 h-3' />
										) : (
											<Bot className='w-3 h-3' />
										)}
										<span className='font-medium text-xs'>
											{msg.role === 'user' ? 'User' : 'Assistant'}
										</span>
										<span
											className={cn(
												'px-1.5 py-0.5 rounded text-xs',
												getMessageTypeColor(msg.type)
											)}>
											{msg.type}
										</span>
										{timestamp && (
											<span className='text-xs text-gray-500 dark:text-gray-500 ml-auto mr-2'>
												{timestamp}
											</span>
										)}
									</div>
									<div className='flex items-center gap-1'>
										<button
											onClick={(e) => {
												e.stopPropagation();
												onCopy(JSON.stringify(msg, null, 2), msg.id);
											}}
											className={cn(
												'p-0.5 rounded transition-colors',
												msg.role === 'user'
													? 'hover:bg-blue-200 dark:hover:bg-blue-800'
													: 'hover:bg-gray-200 dark:hover:bg-gray-700'
											)}>
											{copiedId === msg.id ? (
												<Check className='w-3 h-3 text-green-600' />
											) : (
												<Copy className='w-3 h-3' />
											)}
										</button>
										{isExpanded ? (
											<ChevronDown className='w-3 h-3' />
										) : (
											<ChevronRight className='w-3 h-3' />
										)}
									</div>
								</div>

								{!isExpanded && msg.content && (
									<div className='px-2 pb-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2'>
										{typeof msg.content === 'string'
											? msg.content.substring(0, 100) +
											  (msg.content.length > 100 ? '...' : '')
											: JSON.stringify(msg.content).substring(0, 100) + '...'}
									</div>
								)}

								<AnimatePresence>
									{isExpanded && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{ height: 'auto', opacity: 1 }}
											exit={{ height: 0, opacity: 0 }}
											transition={{ duration: 0.2 }}
											className='overflow-hidden'>
											<div className='p-2 pt-0 rounded-b-lg'>
												<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto'>
													{JSON.stringify(msg, null, 2)}
												</pre>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
};

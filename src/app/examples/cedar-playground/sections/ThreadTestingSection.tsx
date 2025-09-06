'use client';

import { useState } from 'react';
import { type MessageThreadMap } from 'cedar-os';

interface ThreadTestingSectionProps {
	currentThreadId: string;
	threadIds: string[];
	threadMap: MessageThreadMap;
	createThread: (threadId?: string, name?: string) => string;
	deleteThread: (threadId: string) => void;
	switchThread: (threadId: string, name?: string) => void;
	updateThreadName: (threadId: string, name: string) => void;
}

export function ThreadTestingSection({
	currentThreadId,
	threadIds,
	threadMap,
	createThread,
	deleteThread,
	switchThread,
	updateThreadName,
}: ThreadTestingSectionProps) {
	const [newThreadName, setNewThreadName] = useState('');

	const handleCreateThread = () => {
		const name =
			newThreadName.trim() || `Thread ${Date.now().toString().slice(-4)}`;
		const newThreadId = createThread(undefined, name);
		switchThread(newThreadId);
		setNewThreadName('');
	};

	const handleDeleteThread = (threadId: string) => {
		if (threadIds.length > 1) {
			deleteThread(threadId);
		}
	};

	const handleRenameThread = (threadId: string) => {
		const newName = prompt(
			'Enter new thread name:',
			threadMap[threadId]?.name || ''
		);
		if (newName && newName.trim()) {
			updateThreadName(threadId, newName.trim());
		}
	};

	return (
		<div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 border border-gray-200 dark:border-gray-700'>
			<div className='flex items-center justify-between mb-6'>
				<div>
					<h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
						🧵 Thread Management Testing
					</h2>
					<p className='text-gray-600 dark:text-gray-300'>
						Test thread creation, switching, and naming functionality. Each
						thread maintains its own message history.
					</p>
				</div>
			</div>

			{/* Current Thread Info */}
			<div className='mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
				<h3 className='font-semibold text-blue-900 dark:text-blue-100 mb-2'>
					Current Thread
				</h3>
				<div className='text-blue-700 dark:text-blue-300 text-sm'>
					<p>
						<strong>ID:</strong> {currentThreadId}
					</p>
					<p>
						<strong>Name:</strong>{' '}
						{threadMap[currentThreadId]?.name || 'Unnamed'}
					</p>
					<p>
						<strong>Messages:</strong>{' '}
						{threadMap[currentThreadId]?.messages?.length || 0}
					</p>
				</div>
			</div>

			{/* Create New Thread */}
			<div className='mb-6'>
				<h3 className='font-semibold text-gray-900 dark:text-white mb-3'>
					Create New Thread
				</h3>
				<div className='flex gap-3'>
					<input
						type='text'
						value={newThreadName}
						onChange={(e) => setNewThreadName(e.target.value)}
						placeholder='Enter thread name (optional)'
						className='flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
						onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
					/>
					<button
						onClick={handleCreateThread}
						className='px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors'>
						Create Thread
					</button>
				</div>
			</div>

			{/* Thread List */}
			<div className='mb-6'>
				<h3 className='font-semibold text-gray-900 dark:text-white mb-3'>
					Available Threads ({threadIds.length})
				</h3>
				<div className='space-y-2'>
					{threadIds.map((threadId) => {
						const thread = threadMap[threadId];
						const isActive = threadId === currentThreadId;
						const isDefault = threadId === 'default-thread';

						return (
							<div
								key={threadId}
								className={`p-3 border rounded-lg transition-colors ${
									isActive
										? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
										: 'bg-gray-50 border-gray-200 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
								}`}>
								<div className='flex justify-between items-center'>
									<div className='flex-1'>
										<div className='flex items-center gap-2'>
											<span className='font-medium text-gray-900 dark:text-white'>
												{thread?.name || `Thread ${threadId.slice(0, 8)}`}
											</span>
											{isActive && (
												<span className='px-2 py-1 text-xs bg-blue-500 text-white rounded-full'>
													Active
												</span>
											)}
											{isDefault && (
												<span className='px-2 py-1 text-xs bg-gray-500 text-white rounded-full'>
													Default
												</span>
											)}
										</div>
										<div className='text-sm text-gray-600 dark:text-gray-400'>
											ID: {threadId.slice(0, 16)}... • Messages:{' '}
											{thread?.messages?.length || 0}
										</div>
									</div>
									<div className='flex gap-2'>
										{!isActive && (
											<button
												onClick={() => switchThread(threadId)}
												className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'>
												Switch
											</button>
										)}
										<button
											onClick={() => handleRenameThread(threadId)}
											className='px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors'>
											Rename
										</button>
										{!isDefault && threadIds.length > 1 && (
											<button
												onClick={() => handleDeleteThread(threadId)}
												className='px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors'>
												Delete
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Quick Actions */}
			<div className='flex gap-3 flex-wrap'>
				<button
					onClick={() => createThread(undefined, 'Project Discussion')}
					className='px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors'>
					+ Project Thread
				</button>
				<button
					onClick={() => createThread(undefined, 'Bug Reports')}
					className='px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors'>
					+ Bug Thread
				</button>
				<button
					onClick={() => createThread(undefined, 'Feature Ideas')}
					className='px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors'>
					+ Feature Thread
				</button>
			</div>

			{/* Instructions */}
			<div className='mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
				<h4 className='font-medium text-gray-900 dark:text-white mb-2'>
					How to Test:
				</h4>
				<ul className='text-sm text-gray-600 dark:text-gray-300 space-y-1'>
					<li>• Create new threads with custom names</li>
					<li>• Switch between threads to see message history separation</li>
					<li>• Send messages in different threads to test isolation</li>
					<li>• Rename threads to organize conversations</li>
					<li>• Delete threads when no longer needed</li>
				</ul>
			</div>
		</div>
	);
}

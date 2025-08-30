'use client';

import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

export function MessagesTab() {
	const sampleMessages = [
		{
			id: 1,
			role: 'user',
			type: 'text',
			content:
				'Can you help me summarize the Q4 performance review email from Sarah Chen?',
			metadata: {
				sessionId: 'sess_abc123',
				userId: 'user_456',
				source: 'email_interface',
			},
			timestamp: new Date('2024-01-01T12:15:49'),
		},
		{
			id: 2,
			role: 'assistant',
			type: 'ai_summary',
			content: "I've analyzed the email from Sarah Chen. Here's the summary:",
			metadata: {
				aiModel: 'gpt-4-turbo',
				token: {
					prompt: 85,
					completion: 42,
					total: 127,
				},
				confidence: 0.94,
			},
			timestamp: new Date('2024-01-01T12:16:49'),
		},
	];

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	return (
		<ScrollArea className='h-full'>
			<div className='p-3'>
				<div className='mb-4'>
					<h3 className='text-sm font-medium text-gray-500 dark:text-gray-400'>
						Messages (5)
					</h3>
				</div>

				<div className='space-y-4'>
					{sampleMessages.map((message) => (
						<div key={message.id} className='space-y-3'>
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-2'>
									<Badge
										variant='secondary'
										className={`text-xs ${
											message.role === 'user'
												? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
												: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
										}`}>
										{message.role}
									</Badge>
									<Badge
										variant='outline'
										className='text-xs text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'>
										{message.type}
									</Badge>
								</div>
								<span className='text-xs text-gray-500 dark:text-gray-400'>
									{formatTime(message.timestamp)}
								</span>
							</div>

							<div className='text-sm text-gray-900 dark:text-gray-100 leading-relaxed'>
								{message.content}
							</div>

							<div className='bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-600 p-3'>
								<pre className='text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto'>
									{JSON.stringify(message.metadata, null, 2)}
								</pre>
							</div>
						</div>
					))}
				</div>

				{sampleMessages.length === 0 && (
					<div className='text-center text-gray-500 dark:text-gray-400 text-sm py-8'>
						No messages recorded
					</div>
				)}
			</div>
		</ScrollArea>
	);
}

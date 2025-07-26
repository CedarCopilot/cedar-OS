import React, { useState } from 'react';
import { useCedarStore } from 'cedar-os';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
import { Mail } from 'lucide-react';

export function MessagesSection() {
	const [messagesCount, setMessagesCount] = useState(0);
	const { addMessage, messages, setShowChat, showChat } = useCedarStore();

	const handleSendMessage = () => {
		const messageContent = `Test message #${messagesCount + 1}`;
		addMessage({
			type: 'text',
			role: 'user',
			content: messageContent,
		});
		setMessagesCount((prev) => prev + 1);
		setShowChat(true);
	};

	return (
		<>
			<Card title='Messages'>
				<div className='flex items-center gap-2 mb-3'>
					<Mail className='w-5 h-5' />
					<span className='text-sm font-medium'>
						Messages: {messages.length}
					</span>
				</div>
				<Button onClick={handleSendMessage} className='w-full'>
					Send Test Message
				</Button>
				<Button
					onClick={() => setShowChat(!showChat)}
					variant='outline'
					className='w-full'>
					{showChat ? 'Hide Messages' : 'Show Messages'}
				</Button>
				<p className='text-xs text-gray-500'>
					Add messages and toggle the chat bubbles display
				</p>
			</Card>

			{/* Messages Display */}
			{showChat && messages.length > 0 && (
				<div className='mb-8 col-span-full'>
					<Card
						title='Messages Display'
						className='bg-green-50 border-green-200'>
						<div className='h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white p-4'>
							{messages.map((message, index) => (
								<div
									key={message.id || index}
									className={`mb-2 p-2 rounded ${
										message.role === 'user'
											? 'bg-blue-100 text-blue-900 ml-8'
											: 'bg-gray-100 text-gray-900 mr-8'
									}`}>
									<div className='text-xs text-gray-500 mb-1'>
										{message.role === 'user' ? 'You' : 'Assistant'}
									</div>
									<div className='text-sm'>
										{typeof message.content === 'string'
											? message.content
											: 'Complex message'}
									</div>
								</div>
							))}
						</div>
					</Card>
				</div>
			)}
		</>
	);
}

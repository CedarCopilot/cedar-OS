import React, { useState } from 'react';
import { ChatInput } from 'cedar-os';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
import { MessageSquare } from 'lucide-react';

interface ChatInputSectionProps {
	onSubmit?: (input: string) => void;
}

export function ChatInputSection({ onSubmit }: ChatInputSectionProps) {
	const [chatVisible, setChatVisible] = useState(false);

	return (
		<>
			<Card title='Chat Input'>
				<div className='flex items-center gap-2 mb-3'>
					<MessageSquare className='w-5 h-5' />
					<span className='text-sm font-medium'>Rich Input Editor</span>
				</div>
				<Button
					onClick={() => setChatVisible(!chatVisible)}
					variant='outline'
					className='w-full'>
					{chatVisible ? 'Hide Chat Input' : 'Show Chat Input'}
				</Button>
				<p className='text-xs text-gray-500'>
					Toggle the Cedar chat input with mention support and context
				</p>
			</Card>

			{/* Chat Interface */}
			{chatVisible && (
				<div className='mb-8 col-span-full'>
					<Card title='Chat Interface' className='bg-blue-50 border-blue-200'>
						<div className='h-64 border border-gray-200 rounded-lg bg-white relative'>
							<ChatInput
								position='bottom-center'
								handleFocus={() => {}}
								handleBlur={() => {}}
								isInputFocused={false}
								onSubmit={onSubmit}
							/>
						</div>
					</Card>
				</div>
			)}
		</>
	);
}

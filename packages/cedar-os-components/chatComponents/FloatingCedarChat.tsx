import { ChatInput } from '@/chatInput/ChatInput';
import ChatBubbles from '@/chatMessages/ChatBubbles';
import { CollapsedButton } from '@/chatMessages/structural/CollapsedChatButton';
import Container3D from '@/containers/Container3D';
import { FloatingContainer } from '@/structural/FloatingContainer';
import { useCedarStore } from 'cedar-os';
import { ChatThreadController } from 'cedar-os-components/threads/ChatThreadController';
import { X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import React from 'react';
interface FloatingCedarChatProps {
	side?: 'left' | 'right';
	title?: string;
	collapsedLabel?: string;
	companyLogo?: React.ReactNode;
	dimensions?: {
		width?: number;
		height?: number;
		minWidth?: number;
		minHeight?: number;
		maxWidth?: number;
		maxHeight?: number;
	};
	resizable?: boolean;
	showThreadController?: boolean;
	stream?: boolean; // Whether to use streaming for responses
}

export const FloatingCedarChat: React.FC<FloatingCedarChatProps> = ({
	side = 'right',
	title = 'Cedar Chat',
	collapsedLabel = 'How can I help you today?',
	companyLogo,
	dimensions = {
		minWidth: 350,
		minHeight: 400,
	},
	showThreadController = false,
	resizable = true,
	stream = true,
}) => {
	// Get showChat state and setShowChat from store
	const showChat = useCedarStore((state) => state.showChat);
	const setShowChat = useCedarStore((state) => state.setShowChat);

	return (
		<>
			<AnimatePresence mode='wait'>
				{!showChat && (
					<CollapsedButton
						side={side}
						label={collapsedLabel}
						layoutId='cedar-floating-chat'
						position='fixed'
					/>
				)}
			</AnimatePresence>

			<FloatingContainer
				isActive={showChat}
				position={side === 'left' ? 'bottom-left' : 'bottom-right'}
				dimensions={dimensions}
				resizable={resizable}
				className='cedar-floating-chat'>
				<Container3D className='flex flex-col h-full text-sm'>
					{/* Header */}
					<div>
						<div className='flex-shrink-0 z-20 flex flex-row items-center justify-between px-3 py-2 min-w-0 border-b border-gray-200 dark:border-gray-700'>
							<div className='flex items-center min-w-0 flex-1'>
								{companyLogo && (
									<div className='flex-shrink-0 w-6 h-6 mr-2'>
										{companyLogo}
									</div>
								)}
								<span className='font-bold text-lg truncate'>{title}</span>
							</div>
							<div className='flex items-center gap-1 flex-shrink-0'>
								{showThreadController && <ChatThreadController />}
								<button
									className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors'
									onClick={() => setShowChat(false)}
									aria-label='Close chat'>
									<X className='h-4 w-4' strokeWidth={2.5} />
								</button>
							</div>
						</div>
					</div>

					{/* Chat messages - takes up remaining space */}
					<div className='flex-1 min-h-0 overflow-hidden'>
						<ChatBubbles />
					</div>

					{/* Chat input - fixed at bottom */}
					<div className='flex-shrink-0 p-3'>
						<ChatInput
							handleFocus={() => {}}
							handleBlur={() => {}}
							isInputFocused={false}
							stream={stream}
						/>
					</div>
				</Container3D>
			</FloatingContainer>
		</>
	);
};

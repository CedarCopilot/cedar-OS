import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCedarStore } from '@/store/CedarStore';
import { FloatingContainer } from '@/components/structural/FloatingContainer';
import { CollapsedButton } from '@/components/chatMessages/structural/CollapsedChatButton';
import { ChatInput } from '@/components/chatInput/ChatInput';
import { ChatBubbles } from '@/components/chatMessages/ChatBubbles';
import Container3D from '@/components/containers/Container3D';

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
}

export const FloatingCedarChat: React.FC<FloatingCedarChatProps> = ({
	side = 'right',
	title = 'Cedar Chat',
	collapsedLabel = 'How can I help you today?',
	companyLogo,
	dimensions = {
		width: 400,
		height: 600,
		minWidth: 350,
		minHeight: 400,
		maxWidth: 600,
		maxHeight: 800,
	},
	resizable = true,
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
				<Container3D className='flex flex-col h-full'>
					{/* Header */}
					<div className='flex-shrink-0 z-20 flex flex-row items-center justify-between px-4 py-2 min-w-0 border-b border-gray-200 dark:border-gray-700'>
						<div className='flex items-center min-w-0 flex-1'>
							{companyLogo && (
								<div className='flex-shrink-0 w-6 h-6 mr-2'>{companyLogo}</div>
							)}
							<span className='font-bold text-lg truncate'>{title}</span>
						</div>
						<div className='flex items-center gap-2 flex-shrink-0'>
							<button
								className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors'
								onClick={() => setShowChat(false)}
								aria-label='Close chat'>
								<X className='h-4 w-4' strokeWidth={2.5} />
							</button>
						</div>
					</div>

					{/* Chat messages - takes up remaining space */}
					<div className='flex-1 min-h-0 overflow-hidden'>
						<ChatBubbles />
					</div>

					{/* Chat input - fixed at bottom */}
					<div className='flex-shrink-0 border-t border-gray-200 dark:border-gray-700'>
						<ChatInput
							handleFocus={() => {}}
							handleBlur={() => {}}
							isInputFocused={false}
						/>
					</div>
				</Container3D>
			</FloatingContainer>
		</>
	);
};

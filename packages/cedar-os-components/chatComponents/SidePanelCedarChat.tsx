import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useCedarStore } from 'cedar-os';
import { SidePanelContainer } from '@/structural/SidePanelContainer';
import { CollapsedButton } from '@/chatMessages/structural/CollapsedChatButton';
import { ChatInput } from '@/chatInput/ChatInput';
import ChatBubbles from '@/chatMessages/ChatBubbles';
import Container3D from '@/containers/Container3D';

interface SidePanelCedarChatProps {
	children?: React.ReactNode; // Page content to wrap
	side?: 'left' | 'right';
	title?: string;
	collapsedLabel?: string;
	showCollapsedButton?: boolean; // Control whether to show the collapsed button
	companyLogo?: React.ReactNode;
	dimensions?: {
		width?: number;
		minWidth?: number;
		maxWidth?: number;
	};
	resizable?: boolean;
	className?: string; // Additional CSS classes for positioning
	topOffset?: number; // Top offset in pixels (e.g., for navbar height)
	stream?: boolean; // Whether to use streaming for responses
}

export const SidePanelCedarChat: React.FC<SidePanelCedarChatProps> = ({
	children, // Page content
	side = 'right',
	title = 'Cedar Chat',
	collapsedLabel = 'How can I help you today?',
	showCollapsedButton = true,
	companyLogo,
	dimensions = {
		width: 600,
		minWidth: 300,
		maxWidth: 800,
	},
	resizable = true,
	className = '',
	topOffset = 0,
	stream = true,
}) => {
	// Get showChat state and setShowChat from store
	const showChat = useCedarStore((state) => state.showChat);
	const setShowChat = useCedarStore((state) => state.setShowChat);

	return (
		<>
			{showCollapsedButton && (
				<AnimatePresence mode='wait'>
					{!showChat && (
						<CollapsedButton
							side={side}
							label={collapsedLabel}
							onClick={() => setShowChat(true)}
							layoutId='cedar-sidepanel-chat'
							position='fixed'
						/>
					)}
				</AnimatePresence>
			)}

			<SidePanelContainer
				isActive={showChat}
				side={side}
				dimensions={dimensions}
				resizable={resizable}
				topOffset={topOffset}
				panelClassName={`dark:bg-gray-900 ${className}`}
				panelContent={
					<Container3D className='flex flex-col h-full'>
						{/* Header */}
						<div className='flex-shrink-0 z-20 flex flex-row items-center justify-between px-4 py-2 min-w-0 border-b border-gray-200 dark:border-gray-700'>
							<div className='flex items-center min-w-0 flex-1'>
								{companyLogo && (
									<div className='flex-shrink-0 w-6 h-6 mr-2'>
										{companyLogo}
									</div>
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
						<div className='flex-shrink-0 p-3'>
							<ChatInput
								handleFocus={() => {}}
								handleBlur={() => {}}
								isInputFocused={false}
								stream={stream}
							/>
						</div>
					</Container3D>
				}>
				{/* Page content that gets squished when panel opens */}
				{children}
			</SidePanelContainer>
		</>
	);
};

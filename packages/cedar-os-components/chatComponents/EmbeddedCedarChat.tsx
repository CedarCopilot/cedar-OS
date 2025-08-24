import { ChatInput } from '@/chatInput/ChatInput';
import ChatBubbles from '@/chatMessages/ChatBubbles';
import Container3D from '@/containers/Container3D';
import { useCedarStore } from 'cedar-os';
import { X } from 'lucide-react';
import React from 'react';

interface EmbeddedCedarChatProps {
	title?: string;
	companyLogo?: React.ReactNode;
	showHeader?: boolean;
	showCloseButton?: boolean;
	onClose?: () => void;
	stream?: boolean; // Whether to use streaming for responses
	className?: string;
}

export const EmbeddedCedarChat: React.FC<EmbeddedCedarChatProps> = ({
	title = 'Cedar Chat',
	companyLogo,
	showHeader = true,
	showCloseButton = false,
	onClose,
	stream = true,
	className = '',
}) => {
	const setShowChat = useCedarStore((state) => state.setShowChat);

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			setShowChat(false);
		}
	};

	return (
		<div className={`w-full h-full ${className}`}>
			<Container3D className='flex flex-col h-full w-full text-sm'>
				{/* Header */}
				{showHeader && (
					<div className='flex-shrink-0 z-20 flex flex-row items-center justify-between px-5 pt-3 min-w-0 border-b border-gray-200 dark:border-gray-700'>
						<div className='flex items-center min-w-0 flex-1'>
							{companyLogo && (
								<div className='flex-shrink-0 w-6 h-6 mr-2'>{companyLogo}</div>
							)}
							<span className='font-bold text-lg truncate'>{title}</span>
						</div>
						{showCloseButton && (
							<div className='flex items-center gap-2 flex-shrink-0'>
								<button
									className='p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors'
									onClick={handleClose}
									aria-label='Close chat'>
									<X className='h-4 w-4' strokeWidth={2.5} />
								</button>
							</div>
						)}
					</div>
				)}

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
		</div>
	);
};

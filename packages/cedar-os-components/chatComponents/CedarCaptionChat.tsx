import React from 'react';
import { FloatingContainer } from '@/structural/FloatingContainer';
import { ChatInput } from '@/chatInput/ChatInput';
import Container3D from '@/containers/Container3D';
import CaptionMessages from '@/chatMessages/CaptionMessages';

interface CedarCaptionChatProps {
	dimensions?: {
		width?: number;
		maxWidth?: number;
	};
	className?: string;
	showThinking?: boolean;
	stream?: boolean; // Whether to use streaming for responses
}

export const CedarCaptionChat: React.FC<CedarCaptionChatProps> = ({
	dimensions,
	className = '',
	showThinking = true,
	stream = true,
}) => {
	return (
		<FloatingContainer
			isActive={true}
			position='bottom-center'
			dimensions={dimensions}
			resizable={false}
			className={`cedar-caption-container ${className}`}>
			<div className='text-sm'>
				<Container3D className='p-2'>
					<div className='w-full pb-3'>
						<CaptionMessages showThinking={showThinking} />
					</div>

					<ChatInput className='bg-transparent p-0' stream={stream} />
				</Container3D>
			</div>
		</FloatingContainer>
	);
};

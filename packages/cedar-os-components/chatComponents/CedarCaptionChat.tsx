import React, { useCallback } from 'react';
import { FloatingContainer } from '@/structural/FloatingContainer';
import { ChatInput } from '@/chatInput/ChatInput';
import Container3D from '@/containers/Container3D';
import CaptionMessages from '@/chatMessages/CaptionMessages';
import { KeyboardShortcut } from '@/ui/KeyboardShortcut';
import {
	Bug,
	CheckCircle,
	History,
	Package,
	Settings,
	XCircle,
	Undo,
	Redo,
} from 'lucide-react';
import Container3DButton from 'cedar-os-components/containers/Container3DButton';

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
	// Always false since buttons do nothing
	const hasDiffs = false;

	// Empty handlers that do nothing
	const handleAddFeature = useCallback(() => {
		// Empty - does nothing
	}, []);

	const handleAddIssue = useCallback(() => {
		// Empty - does nothing
	}, []);

	const handleAcceptAllDiffs = useCallback(() => {
		// Empty - does nothing
	}, []);

	const handleRejectAllDiffs = useCallback(() => {
		// Empty - does nothing
	}, []);

	const handleUndo = useCallback(() => {
		// Empty - does nothing
	}, []);

	const handleRedo = useCallback(() => {
		// Empty - does nothing
	}, []);

	return (
		<FloatingContainer
			isActive={true}
			position='bottom-center'
			dimensions={dimensions}
			resizable={false}
			className={`cedar-caption-container ${className}`}>
			<div className='text-sm'>
				{/* Action buttons row */}
				<div className='flex justify-between items-center mb-2'>
					<div className='flex space-x-2'>
						<Container3DButton
							id='add-feature-btn'
							childClassName='p-1.5'
							onClick={handleAddFeature}>
							<span className='flex items-center gap-1'>
								<Package className='w-4 h-4' />
								Add X
							</span>
						</Container3DButton>
						<Container3DButton
							id='add-issue-btn'
							childClassName='p-1.5'
							onClick={handleAddIssue}>
							<span className='flex items-center gap-1'>
								<Bug className='w-4 h-4' />
								Add Y
							</span>
						</Container3DButton>
						{hasDiffs && (
							<>
								<Container3DButton
									id='accept-all-diffs-btn'
									childClassName='p-1.5'
									onClick={handleAcceptAllDiffs}>
									<span className='flex items-center gap-1'>
										<KeyboardShortcut
											shortcut='⇧ Enter'
											className='ml-1 text-xs'
										/>
										<CheckCircle className='w-4 h-4 text-green-600' />
										Accept All
									</span>
								</Container3DButton>
								<Container3DButton
									id='reject-all-diffs-btn'
									childClassName='p-1.5'
									onClick={handleRejectAllDiffs}>
									<span className='flex items-center gap-1'>
										<KeyboardShortcut
											shortcut='⇧ Del'
											className='ml-1 text-xs'
										/>
										<XCircle className='w-4 h-4 text-red-600' />
										Reject All
									</span>
								</Container3DButton>
							</>
						)}
					</div>
					<div className='flex space-x-2'>
						<Container3DButton
							id='undo-btn'
							childClassName='p-1.5'
							onClick={handleUndo}>
							<span className='flex items-center gap-1'>
								<Undo className='w-4 h-4' />
							</span>
						</Container3DButton>
						<Container3DButton
							id='redo-btn'
							childClassName='p-1.5'
							onClick={handleRedo}>
							<span className='flex items-center gap-1'>
								<Redo className='w-4 h-4' />
							</span>
						</Container3DButton>
						<Container3DButton id='history-btn' childClassName='p-1.5'>
							<span className='flex items-center gap-1'>
								<History className='w-4 h-4' />
							</span>
						</Container3DButton>
						<Container3DButton id='settings-btn' childClassName='p-1.5'>
							<span className='flex items-center gap-1'>
								<Settings className='w-4 h-4' />
							</span>
						</Container3DButton>
					</div>
				</div>

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

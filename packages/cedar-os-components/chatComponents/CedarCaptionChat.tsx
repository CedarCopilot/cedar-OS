import React, { useCallback } from 'react';
import { useCedarStore } from 'cedar-os';
import { FloatingContainer } from '@/structural/FloatingContainer';
import { ChatInput } from '@/chatInput/ChatInput';
import Container3D from '@/containers/Container3D';
import Container3DButton from '@/containers/Container3DButton';
import CaptionMessages from '@/chatMessages/CaptionMessages';
import { KeyboardShortcut } from '@/ui/KeyboardShortcut';
import {
	Bug,
	CheckCircle,
	History,
	Package,
	Settings,
	XCircle,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface CedarCaptionChatProps {
	dimensions?: {
		width?: number;
		maxWidth?: number;
	};
	className?: string;
}

export const CedarCaptionChat: React.FC<CedarCaptionChatProps> = ({
	dimensions,
	className = '',
}) => {
	// Check if there are any nodes with diffs
	const nodesState = useCedarStore((state) => state.registeredStates.nodes);
	const hasDiffs = React.useMemo(() => {
		if (!nodesState?.value || !Array.isArray(nodesState.value)) return false;
		return nodesState.value.some(
			(node: { data?: { diff?: string } }) => node.data?.diff
		);
	}, [nodesState]);

	const handleAddFeature = useCallback(() => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		const newFeature = {
			id: uuidv4(),
			type: 'featureNode',
			position: { x: Math.random() * 400, y: Math.random() * 400 },
			data: {
				title: 'New Feature',
				description: 'Describe your new feature here',
				upvotes: 0,
				comments: [],
				status: 'planned' as const,
				nodeType: 'feature' as const,
				diff: 'added' as const,
			},
		};
		executeCustomSetter('nodes', 'addNode', newFeature);
	}, []);

	const handleAddIssue = useCallback(() => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		const newIssue = {
			id: uuidv4(),
			type: 'featureNode',
			position: { x: Math.random() * 400, y: Math.random() * 400 },
			data: {
				title: 'New Bug',
				description: 'Describe the bug here',
				upvotes: 0,
				comments: [],
				status: 'backlog' as const,
				nodeType: 'bug' as const,
				diff: 'added' as const,
			},
		};
		executeCustomSetter('nodes', 'addNode', newIssue);
	}, []);

	const handleAcceptAllDiffs = useCallback(() => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		executeCustomSetter('nodes', 'acceptAllDiffs');
	}, []);

	const handleRejectAllDiffs = useCallback(() => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		executeCustomSetter('nodes', 'rejectAllDiffs');
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
								Add Feature
							</span>
						</Container3DButton>
						<Container3DButton
							id='add-issue-btn'
							childClassName='p-1.5'
							onClick={handleAddIssue}>
							<span className='flex items-center gap-1'>
								<Bug className='w-4 h-4' />
								Add Bug
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
						<CaptionMessages />
					</div>

					<ChatInput className='bg-transparent p-0' />
				</Container3D>
			</div>
		</FloatingContainer>
	);
};

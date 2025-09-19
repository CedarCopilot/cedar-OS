'use client';

import React, { useCallback } from 'react';
import { useCedarStore, useDiffStateHelpers } from 'cedar-os';
import { FloatingContainer } from 'cedar-os-components/structural/FloatingContainer';
import { ChatInput } from 'cedar-os-components/chatInput/ChatInput';
import Container3D from 'cedar-os-components/containers/Container3D';
import Container3DButton from 'cedar-os-components/containers/Container3DButton';
import CaptionMessages from 'cedar-os-components/chatMessages/CaptionMessages';
import { KeyboardShortcut } from 'cedar-os-components/ui/KeyboardShortcut';
import {
	Bug,
	CheckCircle,
	History,
	Package,
	Settings,
	Trash,
	XCircle,
	Undo,
	Redo,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ProductRoadmapChatProps {
	dimensions?: {
		width?: number;
		maxWidth?: number;
	};
	className?: string;
	showThinking?: boolean;
	stream?: boolean; // Whether to use streaming for responses
}

export const ProductRoadmapChat: React.FC<ProductRoadmapChatProps> = ({
	dimensions,
	className = '',
	showThinking = true,
	stream = true,
}) => {
	// Use diff state helpers for nodes state
	const { undo, redo } = useDiffStateHelpers<unknown[]>('nodes');

	// Check if there are any nodes with diffs
	const nodesState = useCedarStore((state) => state.registeredStates.nodes);
	const hasDiffs = React.useMemo(() => {
		if (!nodesState?.value || !Array.isArray(nodesState.value)) return false;
		return nodesState.value.some(
			(node: { data?: { diff?: string } }) => node.data?.diff
		);
	}, [nodesState]);

	const handleAddFeature = useCallback(() => {
		const executeStateSetter = useCedarStore.getState().executeStateSetter;
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
			},
		};
		executeStateSetter({
			key: 'nodes',
			setterKey: 'addNode',
			args: { node: newFeature },
			options: {
				isDiff: true,
			},
		});
	}, []);

	const handleAddIssue = useCallback(() => {
		const executeStateSetter = useCedarStore.getState().executeStateSetter;
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
			},
		};
		executeStateSetter({
			key: 'nodes',
			setterKey: 'addNode',
			args: { node: newIssue },
			options: {
				isDiff: true,
			},
		});
	}, []);

	const handleDeleteFeature = useCallback(() => {
		const executeStateSetter = useCedarStore.getState().executeStateSetter;
		// Get the first node from the current state
		const currentNodes = nodesState?.value;
		if (
			!currentNodes ||
			!Array.isArray(currentNodes) ||
			currentNodes.length === 0
		) {
			console.log('No nodes to delete');
			return;
		}

		const firstNode = currentNodes[0];
		executeStateSetter({
			key: 'nodes',
			setterKey: 'removeNode',
			args: { id: firstNode.id },
			options: {
				isDiff: true,
			},
		});
	}, [nodesState]);

	const handleAcceptAllDiffs = useCallback(() => {
		const acceptAllDiffs = useCedarStore.getState().acceptAllDiffs;
		acceptAllDiffs('nodes');
	}, []);

	const handleRejectAllDiffs = useCallback(() => {
		const rejectAllDiffs = useCedarStore.getState().rejectAllDiffs;
		rejectAllDiffs('nodes');
	}, []);

	const handleUndo = useCallback(() => {
		undo();
	}, [undo]);

	const handleRedo = useCallback(() => {
		redo();
	}, [redo]);

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
						<Container3DButton
							id='delete-feature-btn'
							childClassName='p-1.5'
							onClick={handleDeleteFeature}>
							<span className='flex items-center gap-1'>
								<Trash className='w-4 h-4' />
								Delete First
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

					<ChatInput
						className='bg-transparent dark:bg-transparent p-0'
						stream={stream}
					/>
				</Container3D>
			</div>
		</FloatingContainer>
	);
};

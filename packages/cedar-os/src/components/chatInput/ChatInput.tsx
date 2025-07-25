import { useCedarStore, useVoice } from '@/store/CedarStore';
import { EditorContent } from '@tiptap/react';
import {
	Bug,
	Code,
	History,
	Image,
	Mic,
	Package,
	SendHorizontal,
	Settings,
	CheckCircle,
	XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import '@/components/chatInput/ChatInput.css';
import Container3D from '@/components/containers/Container3D';
import Container3DButton from '@/components/containers/Container3DButton';
import { useChatInput } from '@/store/CedarStore';
import { VoiceIndicator } from '../../store/voice/VoiceIndicator';
import { ContextBadgeRow } from './ContextBadgeRow';
import { useCedarEditor } from './useCedarEditor';

// Create a voice-enabled store instance
import CaptionMessages from '@/components/chatMessages/CaptionMessages';

// ChatContainer component with position options
export type ChatContainerPosition = 'bottom-center' | 'embedded' | 'custom';

interface ChatContainerProps {
	children: React.ReactNode;
	position?: ChatContainerPosition;
	className?: string;
	color?: string;
	style?: React.CSSProperties;
	motionProps?: React.ComponentProps<typeof motion.div>;
}

// Replace ChatContainer definition with ChatInputContainer
export const ChatInputContainer: React.FC<ChatContainerProps> = ({
	children,
	position = 'bottom-center',
	className = '',
	style,
}) => {
	// Determine className based on position
	const positionClasses = {
		'bottom-center':
			'h-fit fixed bottom-8 left-1/2 transform -translate-x-1/2 w-full max-w-3xl z-[9999] cedar-caption-container',
		embedded: 'w-full',
		custom: '',
	};

	return (
		<div className={`${positionClasses[position]} ${className}`} style={style}>
			{children}
		</div>
	);
};

// Inlined mention items removed; using external suggestion module

export const ChatInput: React.FC<{
	position?: ChatContainerPosition;
	handleFocus: () => void;
	handleBlur: () => void;
	isInputFocused: boolean;
	onSubmit?: (input: string) => void;
}> = ({ position, handleFocus, handleBlur, isInputFocused, onSubmit }) => {
	const { setOverrideInputContent } = useChatInput();
	const { editor, isEditorEmpty, handleSubmit } = useCedarEditor({
		onSubmit,
		onFocus: handleFocus,
		onBlur: handleBlur,
	});

	// Check if there are any nodes with diffs
	const nodesState = useCedarStore((state) => state.registeredStates.nodes);
	const hasDiffs = React.useMemo(() => {
		if (!nodesState?.value || !Array.isArray(nodesState.value)) return false;
		return nodesState.value.some(
			(node: { data?: { diff?: string } }) => node.data?.diff
		);
	}, [nodesState]);

	// Initialize voice functionality
	const voice = useVoice();

	// Set up voice endpoint on mount
	useEffect(() => {
		// Configure the voice endpoint - adjust this to your agent's endpoint
		voice.setVoiceEndpoint('http://localhost:4111/chat/voice');

		// Cleanup on unmount
		return () => {
			voice.resetVoiceState();
		};
	}, []);

	// Handle voice toggle
	const handleVoiceToggle = useCallback(async () => {
		// Check if voice is supported
		if (!voice.checkVoiceSupport()) {
			console.error('Voice features are not supported in this browser');
			return;
		}

		// Request permission if needed
		if (voice.voicePermissionStatus === 'prompt') {
			await voice.requestVoicePermission();
		}

		// Toggle voice if permission is granted
		if (voice.voicePermissionStatus === 'granted') {
			voice.toggleVoice();
		} else if (voice.voicePermissionStatus === 'denied') {
			console.error('Microphone access denied');
		}
	}, [voice]);

	// Get mic button appearance based on voice state
	const getMicButtonClass = () => {
		if (voice.isListening) {
			return 'p-1 text-red-500 hover:text-red-600 cursor-pointer animate-pulse';
		}
		if (voice.isSpeaking) {
			return 'p-1 text-green-500 hover:text-green-600 cursor-pointer';
		}
		if (voice.voicePermissionStatus === 'denied') {
			return 'p-1 text-gray-400 cursor-not-allowed';
		}
		return 'p-1 text-gray-600 hover:text-black cursor-pointer';
	};

	// Focus the editor when isInputFocused changes to allow for controlled focusing
	useEffect(() => {
		if (isInputFocused && editor) {
			editor.commands.focus();
		}
	}, [isInputFocused, editor]);

	// Handle tab key to focus the editor
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Tab') {
				e.preventDefault();
				if (editor) {
					editor.commands.focus();
					handleFocus();
				}
			}
		};

		// Add the event listener
		window.addEventListener('keydown', handleKeyDown);

		// Clean up
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [editor, handleFocus]);

	const handleAddFeature = () => {
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
	};

	const handleAddIssue = () => {
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
	};

	const handleAcceptAllDiffs = () => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		executeCustomSetter('nodes', 'acceptAllDiffs');
	};

	const handleRejectAllDiffs = () => {
		const executeCustomSetter = useCedarStore.getState().executeCustomSetter;
		executeCustomSetter('nodes', 'rejectAllDiffs');
	};

	const handleTestOverride = () => {
		// Get selected nodes from additional context
		const state = useCedarStore.getState();
		const selectedNodesContext = state.additionalContext.selectedNodes || [];

		if (selectedNodesContext.length === 0) {
			setOverrideInputContent(
				'No nodes selected. Please select some nodes first!'
			);
			return;
		}

		// Create TipTap JSON content with mentions
		const content = {
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{
							type: 'text',
							text: 'Selected nodes: ',
						},
						...selectedNodesContext.flatMap((entry, index) => {
							// Get the node title from the entry data
							const nodeTitle =
								entry.data?.data?.title || entry.metadata?.label || entry.id;

							const mentionNode = {
								type: 'mention',
								attrs: {
									id: entry.data?.id || entry.id,
									label: nodeTitle,
									providerId: 'selectedNodes',
									contextKey: 'selectedNodes',
									contextEntryId: entry.id,
								},
							};

							// Add space after each mention except the last one
							if (index < selectedNodesContext.length - 1) {
								return [mentionNode, { type: 'text', text: ' ' }];
							}
							return [mentionNode];
						}),
					],
				},
			],
		};

		// Set the editor content using JSON format
		if (editor) {
			editor.commands.setContent(content);
		}
	};

	return (
		<ChatInputContainer position={position} className='text-sm'>
			{/* Action buttons row */}
			<div className='flex justify-between items-center mb-2 '>
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
									<CheckCircle className='w-4 h-4 text-green-600' />
									Accept All
								</span>
							</Container3DButton>
							<Container3DButton
								id='reject-all-diffs-btn'
								childClassName='p-1.5'
								onClick={handleRejectAllDiffs}>
								<span className='flex items-center gap-1'>
									<XCircle className='w-4 h-4 text-red-600' />
									Reject All
								</span>
							</Container3DButton>
						</>
					)}
					<Container3DButton
						id='test-override-btn'
						childClassName='p-1.5'
						onClick={handleTestOverride}>
						<span className='flex items-center gap-1'>
							<Code className='w-4 h-4' />
							Test Override
						</span>
					</Container3DButton>
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
				{/* Input context row showing selected context nodes */}
				<ContextBadgeRow editor={editor} />

				{/* Chat editor row */}
				<div className='relative w-full h-fit' id='cedar-chat-input'>
					{voice.isListening || voice.isSpeaking ? (
						<div className='py-2 items-center justify-center w-full'>
							<VoiceIndicator
								voiceState={{
									isListening: voice.isListening,
									isSpeaking: voice.isSpeaking,
									voiceError: voice.voiceError,
									voicePermissionStatus: voice.voicePermissionStatus,
								}}
							/>
						</div>
					) : (
						<div className='flex items-center'>
							<motion.div
								layoutId='chatInput'
								className='flex-1 justify-center py-3'
								aria-label='Message input'>
								<EditorContent
									editor={editor}
									className='prose prose-sm max-w-none focus:outline-none outline-none focus:ring-0 ring-0 [&_*]:focus:outline-none [&_*]:outline-none [&_*]:focus:ring-0 [&_*]:ring-0 placeholder-gray-500 dark:placeholder-gray-400 [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none'
								/>
							</motion.div>
						</div>
					)}
				</div>

				{/* Bottom rows. Contains tools and send chat button */}
				<div
					id='input-tools'
					className='flex items-center  space-x-2  justify-between'>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							className={getMicButtonClass()}
							onClick={handleVoiceToggle}
							disabled={
								voice.voicePermissionStatus === 'denied' ||
								voice.voicePermissionStatus === 'not-supported'
							}
							title={
								voice.isListening
									? 'Stop recording'
									: voice.isSpeaking
									? 'Speaking...'
									: voice.voicePermissionStatus === 'denied'
									? 'Microphone access denied'
									: 'Start voice chat'
							}>
							<Mic className='w-4 h-4' />
						</button>
						<button
							type='button'
							className='p-1 text-gray-600 hover:text-black cursor-pointer'>
							<Image className='w-4 h-4' />
						</button>
						<button
							type='button'
							className='p-1 text-gray-600 hover:text-black cursor-pointer'>
							<Code className='w-4 h-4' />
						</button>
					</div>
					<Container3DButton
						id='send-chat'
						motionProps={{
							layoutId: 'send-chat',
							animate: {
								opacity: isEditorEmpty ? 0.5 : 1,
								backgroundColor: isEditorEmpty ? '#ffffff' : '#93c5fd',
							},
							transition: { type: 'spring', stiffness: 300, damping: 20 },
						}}
						onClick={handleSubmit}
						color={isEditorEmpty ? undefined : '#93c5fd'}
						className='flex items-center flex-shrink-0 ml-auto -mt-0.5 rounded-full'
						childClassName='p-1.5'>
						<motion.div
							animate={{ rotate: isEditorEmpty ? 0 : -90 }}
							transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
							<SendHorizontal className='w-4 h-4' />
						</motion.div>
					</Container3DButton>
				</div>
			</Container3D>
		</ChatInputContainer>
	);
};

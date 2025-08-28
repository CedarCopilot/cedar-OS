import { useVoice, cn, useCedarStore, HumanInTheLoopMessage } from 'cedar-os';

import { CedarEditorContent as EditorContent } from 'cedar-os';
import { Code, Image, Mic, SendHorizonal } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useEffect } from 'react';

import './ChatInput.css';
import { ContextBadgeRow } from '@/chatInput/ContextBadgeRow';
import { useCedarEditor } from 'cedar-os';
import Container3DButton from '@/containers/Container3DButton';
import { VoiceIndicator } from '@/voice/VoiceIndicator';
import { HumanInTheLoopIndicator } from 'cedar-os-components/chatInput/HumanInTheLoopIndicator';

// ChatContainer component with position options
export type ChatContainerPosition = 'bottom-center' | 'embedded' | 'custom';

// Inlined mention items removed; using external suggestion module

export const ChatInput: React.FC<{
	handleFocus?: () => void;
	handleBlur?: () => void;
	isInputFocused?: boolean;
	className?: string; // Additional classes for the container
	stream?: boolean; // Whether to use streaming for responses
}> = ({
	handleFocus,
	handleBlur,
	isInputFocused,
	className = '',
	stream = true,
}) => {
	const { editor, isEditorEmpty, handleSubmit } = useCedarEditor({
		onFocus: handleFocus,
		onBlur: handleBlur,
		stream,
	});

	// Initialize voice functionality
	const voice = useVoice();

	// Get latest message to check for human-in-the-loop state
	const messages = useCedarStore((state) => state.messages);
	const latestMessage = messages[messages.length - 1];
	const isHumanInTheLoopSuspended =
		latestMessage?.type === 'humanInTheLoop' &&
		(latestMessage as HumanInTheLoopMessage).state === 'suspended';

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
					handleFocus?.();
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

	// Handle global keyboard shortcuts
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			// Check if user is currently typing in an input, textarea, or contenteditable element
			const target = e.target as HTMLElement;
			const isTypingInInput =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.getAttribute('contenteditable') === 'true' ||
				target.closest('[contenteditable="true"]') !== null;

			// Handle M key for microphone (only when not typing)
			if (e.key === 'm' || e.key === 'M') {
				if (
					!isTypingInInput &&
					!e.shiftKey &&
					!e.ctrlKey &&
					!e.altKey &&
					!e.metaKey
				) {
					e.preventDefault();
					handleVoiceToggle();
					return;
				}
			}
		};

		// Add the event listener
		window.addEventListener('keydown', handleGlobalKeyDown);

		// Clean up
		return () => {
			window.removeEventListener('keydown', handleGlobalKeyDown);
		};
	}, [handleVoiceToggle]);

	return (
		<div
			className={cn(
				'bg-gray-800/10 dark:bg-gray-400/80 rounded-lg p-3 text-sm',
				className
			)}>
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
				) : isHumanInTheLoopSuspended ? (
					<div className='py-2 items-center justify-center w-full'>
						<HumanInTheLoopIndicator
							state={(latestMessage as HumanInTheLoopMessage).state}
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
								: voice.voicePermissionStatus === 'not-supported'
								? 'Voice not supported'
								: 'Start voice chat (M)'
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
							backgroundColor: isEditorEmpty ? 'transparent' : '#93c5fd',
						},
						transition: { type: 'spring', stiffness: 300, damping: 20 },
					}}
					onClick={() => handleSubmit()}
					color={isEditorEmpty ? undefined : '#93c5fd'}
					className='flex items-center flex-shrink-0 ml-auto -mt-0.5 rounded-full bg-white dark:bg-gray-800'
					childClassName='p-1.5'>
					<motion.div
						animate={{ rotate: isEditorEmpty ? 0 : -90 }}
						transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
						<SendHorizonal className='w-4 h-4' />
					</motion.div>
				</Container3DButton>
			</div>
		</div>
	);
};

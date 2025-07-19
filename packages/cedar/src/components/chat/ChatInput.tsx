import KeyboardShortcut from '@/components/KeyboardShortcut';
import { useCedarStore, useChatInput } from '@/store/CedarStore';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Code, Italic, SendHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

import mentionSuggestion from '@/components/chat/suggestions';
import Container3D from '@/components/containers/Container3D';
import Container3DButton from '@/components/containers/Container3DButton';
import Mention from '@tiptap/extension-mention';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MentionNodeView } from './ChatMention';

// Define interfaces for ChatInput types based on usage
interface ChoiceInput {
	field: string;
	options: string[];
	chosenValue: string;
}

type ChatInputType = string | ChoiceInput;

// ChatContainer component with position options
type ChatContainerPosition = 'bottom-center' | 'embedded' | 'custom';

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
	color,
	style,
	motionProps,
}) => {
	// Determine className based on position
	const positionClasses = {
		'bottom-center':
			'h-fit fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-3xl z-[9999] cedar-caption-container',
		embedded: 'w-full',
		custom: '',
	};

	return (
		<Container3D
			className={`${positionClasses[position]} ${className}`}
			color={color}
			style={style}
			motionProps={motionProps}>
			{children}
		</Container3D>
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
	const nextMessage = useCedarStore((state) => state.nextMessage);
	const {
		chatInputContent,
		overrideInputContent,
		setChatInputContent,
		setOverrideInputContent,
	} = useChatInput();
	const [isEditorEmpty, setIsEditorEmpty] = useState(true);

	const editor = useEditor({
		immediatelyRender: false,
		extensions: [
			StarterKit.configure({
				// Exclude the default Document and HardBreak to enforce single line
				document: false,
				hardBreak: false,
			}),
			Document.extend({
				content: 'block',
			}), // Use our custom document
			Placeholder.configure({
				placeholder: 'Ask a question! Tab to start typing',
			}),
			// Use external suggestion configuration for mentions with custom React node view
			Mention.extend({
				addNodeView() {
					return ReactNodeViewRenderer(MentionNodeView);
				},
			}).configure({
				suggestion: mentionSuggestion,
			}),
		],
		content: '',
		editable: true,
		onFocus: () => {
			// Call handleFocus to update isInputFocused in parent
			handleFocus();
		},
		onBlur: handleBlur,
		onUpdate: ({ editor }) => {
			const editorState = editor.getJSON();
			setChatInputContent(editorState);

			// Update empty state
			setIsEditorEmpty(editor.isEmpty);
		},
	});

	// Extract text content including ChoiceNode values
	const getEditorTextWithChoices = () => {
		if (!editor) return '';

		// Get the editor's state
		const { state } = editor;
		const { doc } = state;

		// Initialize result text
		let resultText = '';

		// Process each node in the document
		doc.descendants((node) => {
			// Handle text nodes
			if (node.isText) {
				resultText += node.text;
			}

			// Handle ChoiceNode
			if (node.type.name === 'choice') {
				const attrs = node.attrs;
				// const field = attrs.field || '';
				const options = attrs.options || [];
				const selectedOption = attrs.selectedOption || '';

				// Use selectedOption if available, otherwise use the first option
				const optionValue =
					selectedOption || (options.length > 0 ? options[0] : '');

				// Add the field and selected option to the result text
				resultText += ` ${optionValue} `;
			}

			return true;
		});

		return resultText;
	};

	// Use overrideInputContent to update the editor
	useEffect(() => {
		if (!editor || !overrideInputContent?.input) return;

		setIsEditorEmpty(false);
		convertoverrideInputContentToEditor(overrideInputContent.input);
	}, [editor, overrideInputContent]);

	// Sync store chatInputContent to editor when no override is active
	useEffect(() => {
		if (!editor || overrideInputContent?.input) return;
		if (chatInputContent) {
			editor.commands.setContent(chatInputContent);
			setIsEditorEmpty(editor.isEmpty);
		}
	}, [editor, chatInputContent, overrideInputContent]);

	// Convert overrideInputContent to editor content
	const convertoverrideInputContentToEditor = (
		input: string | ChatInputType[] | null
	) => {
		if (!editor || !input) return;

		// Clear the editor content
		editor.commands.clearContent();

		// If overrideInputContent is a string, set it as plain text
		if (typeof input === 'string') {
			editor.commands.setContent(input);
			return;
		}

		// If overrideInputContent is an array of ChatInput, insert each item
		if (Array.isArray(input)) {
			// Insert each input item
			input.forEach((item) => {
				if (typeof item === 'string') {
					// Insert text
					editor.commands.insertContent(item);
				} else {
					// Insert choice node
					// Note: This would need a custom extension to handle choice nodes
					// For now, we'll just insert the chosen value as text
					editor.commands.insertContent(item.chosenValue || '');
				}
			});
		}
	};

	// Handle custom submit
	const handleSubmit = async () => {
		if (!editor || isEditorEmpty) return;

		const textContent = getEditorTextWithChoices();

		// Only submit if there's content
		if (textContent.trim()) {
			// Use onSubmit if provided, otherwise fallback to nextMessage
			if (onSubmit) {
				onSubmit(textContent);
			} else {
				nextMessage(textContent);
			}

			editor.commands.clearContent();
			setIsEditorEmpty(true);
			setOverrideInputContent('');

			// Clear the overrideInputContent state
			setChatInputContent({
				type: 'doc',
				content: [{ type: 'paragraph', content: [] }],
			});

			editor.commands.focus();
			handleFocus();
		}
	};

	// Handle keyboard events
	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Enter without Shift submits the form
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Focus the editor when isInputFocused changes to true
	useEffect(() => {
		if (isInputFocused && editor) {
			editor.commands.focus();
		}
	}, [isInputFocused, editor]);

	return (
		<ChatInputContainer position={position} className='p-2'>
			{/* Input context row - empty placeholder */}
			<div id='input-context' className='flex items-center text-sm'>
				<div>@</div>
			</div>

			{/* Chat editor row */}
			<div className='relative w-full h-fit' id='cedar-chat-input'>
				<div className='flex items-center text-sm'>
					{editor && !editor.isFocused && (
						<div className='flex items-center flex-shrink-0 mr-2'>
							<KeyboardShortcut shortcut='Tab to type' />
						</div>
					)}
					<motion.div
						layoutId='chatInput'
						className='flex-1 justify-center py-3'
						onKeyDown={handleKeyDown}
						aria-label='Message input'>
						<EditorContent
							editor={editor}
							className='prose prose-sm max-w-none focus:outline-none outline-none focus:ring-0 ring-0 [&_*]:focus:outline-none [&_*]:outline-none [&_*]:focus:ring-0 [&_*]:ring-0  placeholder-gray-500 dark:placeholder-gray-400 [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none [&_.ProseMirror]:empty:before:content-[attr(data-placeholder)] [&_.ProseMirror]:empty:before:text-gray-400 dark:[&_.ProseMirror]:empty:before:text-gray-500 [&_.ProseMirror]:empty:before:float-left [&_.ProseMirror]:empty:before:pointer-events-none'
						/>
					</motion.div>
				</div>
			</div>

			{/* Tools and send row */}
			<div
				id='input-tools'
				className='flex items-center  space-x-2  justify-between'>
				<div>
					<button
						type='button'
						className='p-1 text-gray-400 hover:text-gray-600'>
						<Bold className='w-4 h-4' />
					</button>
					<button
						type='button'
						className='p-1 text-gray-400 hover:text-gray-600'>
						<Italic className='w-4 h-4' />
					</button>
					<button
						type='button'
						className='p-1 text-gray-400 hover:text-gray-600'>
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
					className='flex items-center flex-shrink-0 ml-auto -mt-0.5'
					childClassName='p-1.5'>
					<motion.div
						animate={{ rotate: isEditorEmpty ? 0 : -90 }}
						transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
						<SendHorizontal className='w-4 h-4' />
					</motion.div>
				</Container3DButton>
			</div>
		</ChatInputContainer>
	);
};

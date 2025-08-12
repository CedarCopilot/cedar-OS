import { useCedarStore, useChatInput } from '@/store/CedarStore';
import type { CedarStore } from '@/store/CedarOSTypes';
import Document from '@tiptap/extension-document';
import Placeholder from '@tiptap/extension-placeholder';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Mention from '@tiptap/extension-mention';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MentionNodeView } from '@/components/chatInput/ChatMention';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import { AddedText, RemovedText } from '@/components/chatInput/DiffExtension';

import { useEffect, useState } from 'react';
import mentionSuggestion from '@/components/chatInput/mentionSuggestion';
import { SendMessageParams } from '@/store/agentConnection/agentConnectionSlice';

interface UseCedarEditorOptions {
	placeholder?: string;
	onSubmit?: (text: string) => void;
	onFocus?: () => void;
	onBlur?: () => void;
	stream?: boolean;
	sendMessageParams?: Partial<SendMessageParams>;
}

export const useCedarEditor = (options: UseCedarEditorOptions = {}) => {
	const {
		placeholder = 'Tab to start typing. Ask me anything!',
		onSubmit,
		onFocus,
		onBlur,
		stream = true,
		sendMessageParams,
	} = options;

	const sendMessage = useCedarStore((state: CedarStore) => state.sendMessage);
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
				document: false,
				hardBreak: {
					keepMarks: true,
					HTMLAttributes: {
						class: 'hard-break',
					},
				},
			}),
			Document.extend({
				content: 'block+',
			}),
			Placeholder.configure({
				placeholder,
				showOnlyWhenEditable: true,
				showOnlyCurrent: true,
			}),
			AddedText,
			RemovedText,
			Mention.extend({
				addAttributes() {
					return {
						id: {
							default: null,
							parseHTML: (element) => element.getAttribute('data-id'),
							renderHTML: (attributes) => {
								if (!attributes.id) {
									return {};
								}
								return {
									'data-id': attributes.id,
								};
							},
						},
						label: {
							default: null,
							parseHTML: (element) => element.getAttribute('data-label'),
							renderHTML: (attributes) => {
								if (!attributes.label) {
									return {};
								}
								return {
									'data-label': attributes.label,
								};
							},
						},
						providerId: {
							default: null,
							parseHTML: (element) => element.getAttribute('data-provider-id'),
							renderHTML: (attributes) => {
								if (!attributes.providerId) {
									return {};
								}
								return {
									'data-provider-id': attributes.providerId,
								};
							},
						},
						contextKey: {
							default: null,
							parseHTML: (element) => element.getAttribute('data-context-key'),
							renderHTML: (attributes) => {
								if (!attributes.contextKey) {
									return {};
								}
								return {
									'data-context-key': attributes.contextKey,
								};
							},
						},
						contextEntryId: {
							default: null,
							parseHTML: (element) =>
								element.getAttribute('data-context-entry-id'),
							renderHTML: (attributes) => {
								if (!attributes.contextEntryId) {
									return {};
								}
								return {
									'data-context-entry-id': attributes.contextEntryId,
								};
							},
						},
					};
				},
				addNodeView() {
					return ReactNodeViewRenderer(MentionNodeView);
				},
				addStorage() {
					return {
						mentionNodes: new Map(),
					};
				},
				onUpdate() {
					const currentMentions = new Map<
						string,
						{ contextKey: string; node: ProseMirrorNode }
					>();
					const { doc } = this.editor.state;

					doc.descendants((node) => {
						if (node.type.name === 'mention' && node.attrs.contextEntryId) {
							currentMentions.set(node.attrs.contextEntryId, {
								contextKey: node.attrs.contextKey,
								node,
							});
						}
					});

					const previousMentions = this.storage?.mentionNodes || new Map();
					previousMentions.forEach(
						(value: { contextKey: string }, contextEntryId: string) => {
							if (!currentMentions.has(contextEntryId)) {
								const state = useCedarStore.getState();
								state.removeContextEntry(value.contextKey, contextEntryId);
							}
						}
					);

					if (this.storage) {
						this.storage.mentionNodes = currentMentions;
					}
				},
			}).configure({
				suggestion: mentionSuggestion,
			}),
		],
		content: chatInputContent || '',
		editable: true,
		onFocus: () => {
			onFocus?.();
		},
		onBlur: () => {
			onBlur?.();
		},
		onUpdate: ({ editor }) => {
			const editorState = editor.getJSON();
			setChatInputContent(editorState);
			setIsEditorEmpty(editor.isEmpty);
		},
		editorProps: {
			handleKeyDown: (view, event) => {
				if (event.key === 'Enter' && event.shiftKey) {
					return false;
				}

				if (event.key === 'Enter' && !event.shiftKey) {
					const { state } = view;
					const hasActiveSuggestion = state.plugins.some((plugin) => {
						const pluginState = plugin.getState?.(state);
						return pluginState?.active || pluginState?.open;
					});

					if (!hasActiveSuggestion) {
						event.preventDefault();
						handleSubmit();
						return true;
					}
				}

				return false;
			},
		},
	});

	const getEditorTextWithChoices = () => {
		if (!editor) return '';

		const { state } = editor;
		const { doc } = state;

		let resultText = '';

		doc.descendants((node) => {
			if (node.isText) {
				resultText += node.text;
			}

			if (node.type.name === 'choice') {
				const attrs = node.attrs;
				const options = attrs.options || [];
				const selectedOption = attrs.selectedOption || '';
				const optionValue =
					selectedOption || (options.length > 0 ? options[0] : '');
				resultText += ` ${optionValue} `;
			}

			return true;
		});

		return resultText;
	};

	const handleSubmit = async () => {
		if (!editor || isEditorEmpty) return;

		const textContent = getEditorTextWithChoices();

		if (textContent.trim()) {
			if (onSubmit) {
				onSubmit(textContent);
			} else {
				sendMessage({ stream, ...sendMessageParams });
			}

			editor.commands.clearContent();
			setIsEditorEmpty(true);
			setOverrideInputContent('');

			setChatInputContent({
				type: 'doc',
				content: [{ type: 'paragraph', content: [] }],
			});

			editor.commands.focus();
			onFocus?.();
		}
	};

	// Handle override input content
	useEffect(() => {
		if (!editor || !overrideInputContent?.input) return;

		setIsEditorEmpty(false);

		const input = overrideInputContent.input;
		editor.commands.clearContent();

		if (typeof input === 'string') {
			editor.commands.setContent(input);
			return;
		}

		if (Array.isArray(input)) {
			input.forEach((item) => {
				if (typeof item === 'string') {
					editor.commands.insertContent(item);
				} else {
					editor.commands.insertContent(item.chosenValue || '');
				}
			});
		}
	}, [editor, overrideInputContent]);

	return {
		editor,
		isEditorEmpty,
		handleSubmit,
		getEditorText: getEditorTextWithChoices,
	};
};

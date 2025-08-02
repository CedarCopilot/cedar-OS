import { StateCreator } from 'zustand';
import { CedarStore } from '../types';
import type {
	Message,
	MessageInput,
	MessageRendererEntry,
	MessageRendererRegistry,
	BaseMessage,
	MessageHandler,
	MessageHandlerEntry,
} from './types';
import { defaultHandlers } from '@/store/messages/defaultHandlers';

// Define the messages slice
export interface MessagesSlice {
	// State
	messages: Message[];
	isProcessing: boolean;
	showChat: boolean;

	// Message renderer registry
	messageRenderers: MessageRendererRegistry;
	// Message handler registry
	messageHandlers: Record<string, MessageHandlerEntry>;

	// Actions
	setMessages: (messages: Message[]) => void;
	addMessage: (message: MessageInput) => Message;
	appendToLatestMessage: (content: string) => void;
	updateMessage: (id: string, updates: Partial<Message>) => void;
	deleteMessage: (id: string) => void;
	clearMessages: () => void;
	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;

	// Renderer management
	registerMessageRenderer: (type: string, entry: MessageRendererEntry) => void;
	unregisterMessageRenderer: (type: string) => void;
	getMessageRenderer: (type: string) => MessageRendererEntry | undefined;
	/** Register many renderer entries at once */
	registerMessageRenderers: (
		entries: MessageRendererEntry[] | Record<string, MessageRendererEntry>
	) => void;
	// Handler management
	registerMessageHandler: (
		type: string,
		entry: MessageHandler | MessageHandlerEntry
	) => void;
	registerMessageHandlers: (
		handlers: Record<string, MessageHandler | MessageHandlerEntry>
	) => void;
	getMessageHandler: (type: string) => MessageHandlerEntry | undefined;
	/**
	 * Handle a structured response object by validating it against a registered
	 * message renderer and adding it to chat if valid. Returns true if handled.
	 */
	processStructuredMessage: (structured: Record<string, unknown>) => boolean;

	// Utility methods
	getMessageById: (id: string) => Message | undefined;
	getMessagesByRole: (role: Message['role']) => Message[];
}

// Create the messages slice
export const createMessagesSlice: StateCreator<
	CedarStore,
	[],
	[],
	MessagesSlice
> = (set, get) => {
	return {
		// Default state
		messages: [],
		isProcessing: false,
		showChat: false,
		messageRenderers: {},
		messageHandlers: { ...defaultHandlers },

		// Actions
		setMessages: (messages: Message[]) => set({ messages }),

		setShowChat: (showChat: boolean) => set({ showChat }),

		addMessage: (messageData: MessageInput): Message => {
			const newMessage: Message = {
				...messageData,
				id: `message-${Date.now()}-${Math.random()
					.toString(36)
					.substring(2, 9)}`,
				createdAt: new Date().toISOString(),
			} as unknown as Message;

			set((state) => ({
				messages: [...state.messages, newMessage],
			}));

			return newMessage;
		},

		appendToLatestMessage: (content: string) => {
			const state = get();
			const messages = state.messages;
			const latestMessage = messages[messages.length - 1];

			// Check if latest message is assistant type
			if (
				latestMessage &&
				latestMessage.role === 'assistant' &&
				latestMessage.type === 'text'
			) {
				// Append to existing assistant message (content is already processed)
				state.updateMessage(latestMessage.id, {
					content: latestMessage.content + content,
				});
			} else {
				// Create new assistant message
				state.addMessage({
					role: 'assistant',
					type: 'text',
					content: content,
				});
			}
		},

		updateMessage: (id: string, updates: Partial<Message>) => {
			set((state) => ({
				messages: state.messages.map((msg) =>
					msg.id === id ? ({ ...msg, ...updates } as Message) : msg
				),
			}));
		},

		deleteMessage: (id: string) => {
			set((state) => ({
				messages: state.messages.filter((msg) => msg.id !== id),
			}));
		},

		clearMessages: () => set({ messages: [] }),

		setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),

		// Renderer management
		registerMessageRenderer: (type: string, entry: MessageRendererEntry) => {
			set((state) => ({
				messageRenderers: {
					...state.messageRenderers,
					[type]: entry,
				},
			}));
		},
		registerMessageRenderers: (entries) => {
			set((state) => {
				const newEntries = Array.isArray(entries)
					? Object.fromEntries(entries.map((e) => [e.type, e]))
					: entries;
				return {
					messageRenderers: {
						...state.messageRenderers,
						...newEntries,
					},
				};
			});
		},

		unregisterMessageRenderer: (type: string) => {
			set((state) => {
				const { [type]: removed, ...rest } = state.messageRenderers;
				// Use the variable to avoid linter warning
				void removed;
				return { messageRenderers: rest };
			});
		},

		getMessageRenderer: (type: string) => {
			return get().messageRenderers[type];
		},

		// Handler management
		registerMessageHandler: (type, entry) => {
			set((state) => ({
				messageHandlers: {
					...state.messageHandlers,
					[type]: entry as MessageHandlerEntry,
				},
			}));
		},
		registerMessageHandlers: (handlers) => {
			set((state) => ({
				messageHandlers: {
					...state.messageHandlers,
					...(handlers as Record<string, MessageHandlerEntry>),
				},
			}));
		},
		getMessageHandler: (type) => get().messageHandlers[type],

		// Handle structured message objects from LLM response
		processStructuredMessage: (structuredResponse: Record<string, unknown>) => {
			if (
				!('type' in structuredResponse) ||
				typeof structuredResponse.type !== 'string'
			) {
				return false;
			}

			// 1. Try handler first
			const handlerEntry = get().getMessageHandler(structuredResponse.type);
			if (handlerEntry) {
				const { handler, validateMessage } = handlerEntry;
				if (validateMessage && !validateMessage(structuredResponse)) {
					return false;
				}
				const handled = handler(structuredResponse, get());
				if (handled) return true;
			}

			// If there is no handler, check if we have a renderer for this type
			const entry = get().getMessageRenderer(structuredResponse.type);
			// If there is no renderer, add it as a text message
			if (!entry) {
				get().addMessage({
					role: 'assistant',
					type: 'text',
					content: JSON.stringify(structuredResponse, null, 2),
				});
				return true;
			}

			const { validateMessage } = entry;

			if (
				validateMessage &&
				!validateMessage(structuredResponse as unknown as BaseMessage)
			) {
				console.log(
					'Message type',
					structuredResponse.type,
					'identified but failed validation:',
					structuredResponse
				);

				// Add as a text message
				get().addMessage({
					role: 'assistant',
					type: 'text',
					content: JSON.stringify(structuredResponse, null, 2),
				});
				return true;
			}

			// Determine role, default assistant, map system -> assistant
			let role: string = 'assistant';
			if (
				'role' in structuredResponse &&
				typeof structuredResponse.role === 'string'
			) {
				role =
					structuredResponse.role === 'system'
						? 'assistant'
						: structuredResponse.role;
			}

			const content =
				'content' in structuredResponse &&
				typeof structuredResponse.content === 'string'
					? structuredResponse.content
					: '';

			const messageInput: MessageInput = {
				role: role as Message['role'],
				type: structuredResponse.type as Message['type'],
				content,
				...(structuredResponse as Record<string, unknown>),
			} as MessageInput;

			// Add message using existing method
			const state = get();
			state.addMessage(messageInput);

			return true;
		},

		// Utility methods
		getMessageById: (id: string) => {
			return get().messages.find((msg) => msg.id === id);
		},

		getMessagesByRole: (role: Message['role']) => {
			return get().messages.filter((msg) => msg.role === role);
		},
	};
};

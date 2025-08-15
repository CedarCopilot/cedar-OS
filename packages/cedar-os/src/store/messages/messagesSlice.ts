import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import type {
	Message,
	MessageInput,
	MessageRenderer,
	MessageRendererRegistry,
} from '@/store/messages/MessageTypes';
import {
	getMessageStorageState,
	MessageStorageState,
} from '@/store/messages/messageStorage';
import {
	defaultMessageRenderers,
	initializeMessageRendererRegistry,
} from '@/store/messages/renderers/initializeMessageRendererRegistry';

// Define the messages slice
export type MessagesSlice = MessageStorageState & {
	// State
	messages: Message[];
	isProcessing: boolean;
	showChat: boolean;

	// Message renderer registry
	messageRenderers: MessageRendererRegistry;

	// Actions
	setMessages: (messages: Message[]) => void;
	addMessage: (message: MessageInput, isComplete?: boolean) => Message;
	appendToLatestMessage: (content: string, isComplete?: boolean) => Message;
	updateMessage: (id: string, updates: Partial<Message>) => void;
	deleteMessage: (id: string) => void;
	clearMessages: () => void;
	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;

	// Renderer management - now single renderer per type
	registerMessageRenderer: <T extends Message>(
		config: MessageRenderer<T>
	) => void;
	unregisterMessageRenderer: (type: string, namespace?: string) => void;
	getMessageRenderers: (type: string) => MessageRenderer | undefined;

	// Utility methods
	getMessageById: (id: string) => Message | undefined;
	getMessagesByRole: (role: Message['role']) => Message[];
};

// Create the messages slice
export const createMessagesSlice: StateCreator<
	CedarStore,
	[],
	[],
	MessagesSlice
> = (set, get) => {
	return {
		...getMessageStorageState(set, get),
		// Default state
		messages: [],
		isProcessing: false,
		showChat: false,
		messageRenderers: initializeMessageRendererRegistry(
			defaultMessageRenderers
		),
		// Actions
		setMessages: (messages: Message[]) => set({ messages }),
		setShowChat: (showChat: boolean) => set({ showChat }),
		addMessage: (
			messageData: MessageInput,
			isComplete: boolean = true
		): Message => {
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

			if (isComplete) {
				try {
					get().persistMessageStorageMessage(newMessage);
				} catch (error) {
					console.error('Error persisting message:', error);
				}
			}
			return newMessage;
		},
		appendToLatestMessage: (
			content: string,
			isComplete: boolean = true
		): Message => {
			const state = get();
			const messages = state.messages;
			const latestMessage = messages[messages.length - 1];

			// Only append if the latest message is 'text' type and not a user message
			if (
				latestMessage &&
				latestMessage.role !== 'user' &&
				latestMessage.type === 'text'
			) {
				const updatedLatestMessage = {
					...latestMessage,
					content: latestMessage.content + content,
				};
				state.updateMessage(latestMessage.id, updatedLatestMessage);
				return updatedLatestMessage;
			} else {
				// Create a new text message if latest is not text type or not assistant role
				return state.addMessage(
					{
						role: 'assistant',
						type: 'text',
						content: content,
					},
					isComplete
				);
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
		registerMessageRenderer: <T extends Message>(
			config: MessageRenderer<T>
		) => {
			set((state) => {
				const { type } = config;

				// Store the config as-is (it already fits the MessageRenderer shape)
				return {
					messageRenderers: {
						...state.messageRenderers,
						[type]: config as unknown as MessageRenderer<Message>,
					},
				};
			});
		},
		unregisterMessageRenderer: (type: string, namespace?: string) => {
			set((state) => {
				const existing = state.messageRenderers[type];
				if (!existing) return {};

				if (!namespace || existing.namespace === namespace) {
					const { [type]: removed, ...rest } = state.messageRenderers;
					void removed;
					return { messageRenderers: rest };
				}
				// Namespace didn't match; keep as is
				return {};
			});
		},
		getMessageRenderers: (type: string) => {
			return get().messageRenderers[type];
		},
		getMessageById: (id: string) => {
			return get().messages.find((msg) => msg.id === id);
		},
		getMessagesByRole: (role: Message['role']) => {
			return get().messages.filter((msg) => msg.role === role);
		},
	};
};

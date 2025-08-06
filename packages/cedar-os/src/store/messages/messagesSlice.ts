import { StateCreator } from 'zustand';
import { CedarStore } from '../types';
import type {
	Message,
	MessageInput,
	MessageProcessor,
	MessageProcessorEntry,
	MessageProcessorRegistry,
} from './types';
import {
	defaultProcessors,
	initializeProcessorRegistry,
} from '@/store/messages/defaultMessageProcessors';

// Define the messages slice
export interface MessagesSlice {
	// State
	messages: Message[];
	isProcessing: boolean;
	showChat: boolean;

	// Message processor registry
	messageProcessors: MessageProcessorRegistry;

	// Actions
	setMessages: (messages: Message[]) => void;
	addMessage: (message: MessageInput) => Message;
	appendToLatestMessage: (content: string) => void;
	updateMessage: (id: string, updates: Partial<Message>) => void;
	deleteMessage: (id: string) => void;
	clearMessages: () => void;
	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;

	// Processor management
	registerMessageProcessor: <T extends Message = Message>(
		processor: MessageProcessor<T>
	) => void;
	registerMessageProcessors: <T extends Message = Message>(
		processors: MessageProcessor<T>[]
	) => void;
	unregisterMessageProcessor: (type: string, namespace?: string) => void;
	getMessageProcessors: <T extends Message = Message>(
		type: string
	) => MessageProcessorEntry<T>[];

	/**
	 * Handle a structured response object by validating it against a registered
	 * message renderer and adding it to chat if valid. Returns true if handled.
	 */
	processStructuredMessage: (
		structured: Record<string, unknown>
	) => Promise<boolean>;

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
		messageProcessors: initializeProcessorRegistry(defaultProcessors),

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

		// Processor management
		registerMessageProcessor: <T extends Message = Message>(
			processor: MessageProcessor<T>
		) => {
			set((state) => {
				const type = processor.type;
				const existingProcessors = (state.messageProcessors[type] ||
					[]) as MessageProcessorEntry<T>[];

				// Create processor entry with defaults
				const entry = {
					type: processor.type,
					namespace: processor.namespace,
					priority: processor.priority ?? 0,
					execute: processor.execute,
					render: processor.render,
					validate: processor.validate,
				} as MessageProcessorEntry<T>;

				// Add to array and sort by priority (highest first)
				const updatedProcessors = [...existingProcessors, entry].sort(
					(a, b) => b.priority - a.priority
				);

				return {
					messageProcessors: {
						...state.messageProcessors,
						[type]: updatedProcessors as MessageProcessorEntry<Message>[],
					},
				};
			});
		},

		registerMessageProcessors: <T extends Message = Message>(
			processors: MessageProcessor<T>[]
		) => {
			processors.forEach((processor) => {
				get().registerMessageProcessor(processor);
			});
		},

		unregisterMessageProcessor: (type: string, namespace?: string) => {
			set((state) => {
				const processors = state.messageProcessors[type];
				if (!processors) return state;

				const filtered = namespace
					? processors.filter((p) => p.namespace !== namespace)
					: []; // Remove all if no namespace specified

				return {
					messageProcessors: {
						...state.messageProcessors,
						[type]: filtered.length > 0 ? filtered : [],
					},
				};
			});
		},

		getMessageProcessors: <T extends Message = Message>(type: string) => {
			return (get().messageProcessors[type] ||
				[]) as MessageProcessorEntry<T>[];
		},

		// Handle structured message objects from LLM response
		processStructuredMessage: async (
			structuredResponse: Record<string, unknown>
		) => {
			if (
				!('type' in structuredResponse) ||
				typeof structuredResponse.type !== 'string'
			) {
				return false;
			}

			const type = structuredResponse.type;
			const state = get();

			// NEW: Try processors first (priority-based)
			const processors = state.getMessageProcessors(type);
			for (const processor of processors) {
				// Check validation if provided
				if (
					processor.validate &&
					!processor.validate(structuredResponse as Message)
				) {
					continue; // Try next processor
				}

				// Execute business logic if provided
				if (processor.execute) {
					await processor.execute(structuredResponse as Message, state);
					return true;
				}
			}

			// DEFAULT: Add as text message with JSON display
			state.addMessage(structuredResponse);

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

import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import type {
	Message,
	MessageInput,
	MessageRenderer,
	MessageRendererRegistry,
	MessageThread,
	MessageThreadMap,
} from '@/store/messages/MessageTypes';
import { DEFAULT_THREAD_ID } from '@/store/messages/MessageTypes';
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
	// === CORE STATE ===
	// Everything is thread-based now
	threadMap: MessageThreadMap; // Renamed from messageThreads to avoid conflict
	mainThreadId: string; // Always has a value, defaults to DEFAULT_THREAD_ID

	// Processing and UI state
	isProcessing: boolean;
	showChat: boolean;
	messageRenderers: MessageRendererRegistry;

	// === COMPUTED GETTERS ===
	// These provide backward compatibility by returning current thread data
	messages: Message[]; // Computed: returns threadMap[mainThreadId].messages

	// === ACTIONS ===
	// All actions work on current thread by default, but can specify threadId
	setMessages: (messages: Message[], threadId?: string) => void;
	addMessage: (
		message: MessageInput,
		isComplete?: boolean,
		threadId?: string
	) => Message;
	appendToLatestMessage: (
		content: string,
		isComplete?: boolean,
		threadId?: string
	) => Message;
	updateMessage: (
		id: string,
		updates: Partial<Message>,
		threadId?: string
	) => void;
	deleteMessage: (id: string, threadId?: string) => void;
	clearMessages: (threadId?: string) => void;

	// === THREAD MANAGEMENT ===
	setMainThreadId: (threadId: string) => void;
	createThread: (threadId?: string, name?: string) => string; // Returns created threadId
	deleteThread: (threadId: string) => void;
	switchThread: (threadId: string, name?: string) => void; // Creates if doesn't exist
	updateThreadName: (threadId: string, name: string) => void;

	// === THREAD GETTERS ===
	getThread: (threadId?: string) => MessageThread | undefined;
	getThreadMessages: (threadId?: string) => Message[];
	getAllThreadIds: () => string[];
	getCurrentThreadId: () => string;

	// === UTILITY METHODS ===
	getMessageById: (id: string, threadId?: string) => Message | undefined;
	getMessagesByRole: (role: Message['role'], threadId?: string) => Message[];

	// === RENDERER MANAGEMENT ===
	registerMessageRenderer: <T extends Message>(
		config: MessageRenderer<T>
	) => void;
	unregisterMessageRenderer: (type: string, namespace?: string) => void;
	getMessageRenderers: (type: string) => MessageRenderer | undefined;

	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;
};

// Create the messages slice
export const createMessagesSlice: StateCreator<
	CedarStore,
	[],
	[],
	MessagesSlice
> = (set, get) => {
	// Helper to ensure thread exists
	const ensureThread = (threadId: string, name?: string): void => {
		const state = get();
		if (!state.threadMap[threadId]) {
			set((state) => ({
				threadMap: {
					...state.threadMap,
					[threadId]: {
						id: threadId,
						name,
						lastLoaded: new Date().toISOString(),
						messages: [],
					},
				},
			}));
		}
	};

	return {
		...getMessageStorageState(set, get),

		// === CORE STATE ===
		threadMap: {
			[DEFAULT_THREAD_ID]: {
				id: DEFAULT_THREAD_ID,
				name: 'Main Chat',
				lastLoaded: new Date().toISOString(),
				messages: [],
			},
		},
		mainThreadId: DEFAULT_THREAD_ID,
		isProcessing: false,
		showChat: false,
		messageRenderers: initializeMessageRendererRegistry(
			defaultMessageRenderers
		),

		// === COMPUTED GETTER ===
		// This makes the slice backward compatible
		messages: [], // Initialize with empty array, will be synced with current thread

		// === ACTIONS (thread-aware) ===
		setMessages: (messages: Message[], threadId?: string) => {
			const tid = threadId || get().mainThreadId;
			ensureThread(tid);

			set((state) => ({
				threadMap: {
					...state.threadMap,
					[tid]: {
						...state.threadMap[tid],
						messages,
						lastLoaded: new Date().toISOString(),
					},
				},
				// Update main messages if it's the current thread
				messages: tid === state.mainThreadId ? messages : state.messages,
			}));
		},

		addMessage: (
			messageData: MessageInput,
			isComplete = true,
			threadId?: string
		): Message => {
			const tid = threadId || get().mainThreadId;

			const newMessage: Message = {
				...messageData,
				id:
					messageData.id ||
					`message-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
				createdAt: new Date().toISOString(),
			} as Message;

			set((state) => {
				// Get thread or create it if it doesn't exist
				const existingThread = state.threadMap[tid];
				const thread = existingThread || {
					id: tid,
					lastLoaded: new Date().toISOString(),
					messages: [],
				};
				const updatedMessages = [...thread.messages, newMessage];

				return {
					...state,
					threadMap: {
						...state.threadMap,
						[tid]: {
							...thread,
							messages: updatedMessages,
							lastLoaded: new Date().toISOString(),
						},
					},
					// Update main messages if it's the current thread
					messages:
						tid === state.mainThreadId ? updatedMessages : state.messages,
				};
			});

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
			isComplete = true,
			threadId?: string
		): Message => {
			const state = get();
			const tid = threadId || state.mainThreadId;
			ensureThread(tid);

			// Safety check: if thread doesn't exist in current state, get fresh state
			const thread = state.threadMap[tid] || get().threadMap[tid];
			if (!thread) {
				// This should never happen after ensureThread, but be defensive
				return get().addMessage(
					{
						role: 'assistant',
						type: 'text',
						content: content,
					},
					isComplete,
					tid
				);
			}

			const messages = thread.messages;
			const latestMessage = messages[messages.length - 1];

			if (
				latestMessage &&
				latestMessage.role !== 'user' &&
				latestMessage.type === 'text'
			) {
				const updatedLatestMessage = {
					...latestMessage,
					content: latestMessage.content + content,
				};
				get().updateMessage(latestMessage.id, updatedLatestMessage, tid);
				return updatedLatestMessage;
			} else {
				return get().addMessage(
					{
						role: 'assistant',
						type: 'text',
						content: content,
					},
					isComplete,
					tid
				);
			}
		},

		updateMessage: (
			id: string,
			updates: Partial<Message>,
			threadId?: string
		) => {
			const tid = threadId || get().mainThreadId;

			set((state) => {
				const thread = state.threadMap[tid];
				if (!thread) return state;

				const updatedMessages = thread.messages.map((msg) =>
					msg.id === id ? ({ ...msg, ...updates } as Message) : msg
				);

				return {
					threadMap: {
						...state.threadMap,
						[tid]: {
							...thread,
							messages: updatedMessages,
						},
					},
					// Update main messages if it's the current thread
					messages:
						tid === state.mainThreadId ? updatedMessages : state.messages,
				};
			});
		},

		deleteMessage: (id: string, threadId?: string) => {
			const tid = threadId || get().mainThreadId;

			set((state) => {
				const thread = state.threadMap[tid];
				if (!thread) return state;

				const updatedMessages = thread.messages.filter((msg) => msg.id !== id);

				return {
					threadMap: {
						...state.threadMap,
						[tid]: {
							...thread,
							messages: updatedMessages,
						},
					},
					// Update main messages if it's the current thread
					messages:
						tid === state.mainThreadId ? updatedMessages : state.messages,
				};
			});
		},

		clearMessages: (threadId?: string) => {
			const tid = threadId || get().mainThreadId;

			set((state) => ({
				threadMap: {
					...state.threadMap,
					[tid]: {
						...state.threadMap[tid],
						messages: [],
						lastLoaded: new Date().toISOString(),
					},
				},
				// Update main messages if it's the current thread
				messages: tid === state.mainThreadId ? [] : state.messages,
			}));
		},

		// === THREAD MANAGEMENT ===
		setMainThreadId: (threadId: string) => {
			ensureThread(threadId);
			const threadMessages = get().threadMap[threadId]?.messages || [];
			set({
				mainThreadId: threadId,
				messages: threadMessages, // Update messages to match new thread
			});
		},

		createThread: (threadId?: string, name?: string): string => {
			const tid =
				threadId ||
				`thread-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

			// Directly create the thread in state
			set((state) => ({
				...state,
				threadMap: {
					...state.threadMap,
					[tid]: {
						id: tid,
						name,
						lastLoaded: new Date().toISOString(),
						messages: [],
					},
				},
			}));

			return tid;
		},

		deleteThread: (threadId: string) => {
			// Don't delete the default thread or current thread
			if (threadId === DEFAULT_THREAD_ID || threadId === get().mainThreadId) {
				console.warn(
					`Cannot delete ${
						threadId === DEFAULT_THREAD_ID ? 'default' : 'current'
					} thread`
				);
				return;
			}

			set((state) => {
				const { [threadId]: deleted, ...rest } = state.threadMap;
				void deleted; // Satisfy linter
				return { threadMap: rest };
			});
		},

		updateThreadName: (threadId: string, name: string) => {
			set((state) => {
				const thread = state.threadMap[threadId];
				if (!thread) return state;

				return {
					...state,
					threadMap: {
						...state.threadMap,
						[threadId]: {
							...thread,
							name,
						},
					},
				};
			});
		},

		switchThread: (threadId: string, name?: string) => {
			// First ensure the thread exists
			set((state) => {
				const threadExists = state.threadMap[threadId];
				const threadToUse = threadExists || {
					id: threadId,
					name,
					lastLoaded: new Date().toISOString(),
					messages: [],
				};

				return {
					...state,
					threadMap: {
						...state.threadMap,
						[threadId]: threadToUse,
					},
					mainThreadId: threadId,
					messages: threadToUse.messages,
				};
			});
		},

		// === THREAD GETTERS ===
		getThread: (threadId?: string) => {
			const tid = threadId || get().mainThreadId;
			return get().threadMap[tid];
		},

		getThreadMessages: (threadId?: string) => {
			const tid = threadId || get().mainThreadId;
			return get().threadMap[tid]?.messages || [];
		},

		getAllThreadIds: () => {
			return Object.keys(get().threadMap);
		},

		getCurrentThreadId: () => {
			return get().mainThreadId;
		},

		// === UTILITY METHODS ===
		getMessageById: (id: string, threadId?: string) => {
			const tid = threadId || get().mainThreadId;
			return get().threadMap[tid]?.messages.find((msg) => msg.id === id);
		},

		getMessagesByRole: (role: Message['role'], threadId?: string) => {
			const tid = threadId || get().mainThreadId;
			return (
				get().threadMap[tid]?.messages.filter((msg) => msg.role === role) || []
			);
		},

		// === EXISTING METHODS (unchanged) ===
		setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),
		setShowChat: (showChat: boolean) => set({ showChat }),

		registerMessageRenderer: <T extends Message>(
			config: MessageRenderer<T>
		) => {
			set((state) => ({
				messageRenderers: {
					...state.messageRenderers,
					[config.type]: config as unknown as MessageRenderer<Message>,
				},
			}));
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
				return {};
			});
		},

		getMessageRenderers: (type: string) => {
			return get().messageRenderers[type];
		},
	};
};

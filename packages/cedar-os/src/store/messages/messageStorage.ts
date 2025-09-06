import { CedarStore } from '@/store/CedarOSTypes';
import type { Message } from '@/store/messages/MessageTypes';
import { DEFAULT_THREAD_ID } from '@/store/messages/MessageTypes';
import { getCedarState, useCedarStore } from '@/store/CedarStore';
import { v4 } from 'uuid';

// -------------------------------------------------
// Type definitions
// -------------------------------------------------
export interface MessageStorageBaseAdapter {
	loadMessages?(userId: string, threadId: string): Promise<Message[]>;
	// Returns the message that was persisted
	persistMessage?(
		userId: string,
		threadId: string,
		message: Message
	): Promise<Message>;
	// Optional thread operations
	listThreads?(userId: string): Promise<MessageThreadMeta[]>;
	createThread?(
		userId: string,
		threadId: string,
		meta: MessageThreadMeta
	): Promise<MessageThreadMeta>;
	updateThread?(
		userId: string,
		threadId: string,
		meta: MessageThreadMeta
	): Promise<MessageThreadMeta>;
	deleteThread?(
		userId: string,
		threadId: string
	): Promise<MessageThreadMeta | undefined>;
	// Optional message-level operations
	updateMessage?(
		userId: string,
		threadId: string,
		message: Message
	): Promise<Message>;
	deleteMessage?(
		userId: string,
		threadId: string,
		messageId: string
	): Promise<Message | undefined>;
}

export interface LocalAdapterOptions {
	key?: string;
}

export type MessageStorageLocalAdapter = MessageStorageBaseAdapter & {
	type: 'local';
};

export type MessageStorageNoopAdapter = MessageStorageBaseAdapter & {
	type: 'none';
};

export type MessageStorageCustomAdapter = MessageStorageBaseAdapter & {
	type: 'custom';
};

export type MessageStorageAdapter =
	| MessageStorageLocalAdapter
	| MessageStorageNoopAdapter
	| MessageStorageCustomAdapter;

// Config supplied by user when switching adapters
export type MessageStorageConfig =
	| {
			type: 'local';
			options?: LocalAdapterOptions;
	  }
	| { type: 'none' }
	| {
			type: 'custom';
			adapter: MessageStorageBaseAdapter;
	  };

// -------------------------------------------------
// Adapter factories
// -------------------------------------------------

const createMessageStorageLocalAdapter = (
	opts: LocalAdapterOptions = {}
): MessageStorageLocalAdapter => {
	const prefix = opts.key ?? 'cedar';
	const threadsKey = (userId: string) => `${prefix}-threads-${userId}`;
	const threadKey = (userId: string, threadId: string) =>
		`${prefix}-thread-${userId}-${threadId}`;

	const persistThreadMeta = (userId: string, list: MessageThreadMeta[]) => {
		localStorage.setItem(threadsKey(userId), JSON.stringify(list));
	};

	return {
		type: 'local',
		async listThreads(userId) {
			const raw = localStorage.getItem(threadsKey(userId));
			return raw ? (JSON.parse(raw) as MessageThreadMeta[]) : [];
		},
		async loadMessages(userId, threadId) {
			try {
				const raw = localStorage.getItem(threadKey(userId, threadId));
				return raw ? (JSON.parse(raw) as Message[]) : [];
			} catch {
				return [];
			}
		},
		async persistMessage(userId, threadId, message) {
			try {
				const existingMessages =
					(await this.loadMessages?.(userId, threadId)) ?? [];
				const updatedMessages = [...existingMessages, message];
				localStorage.setItem(
					threadKey(userId, threadId),
					JSON.stringify(updatedMessages)
				);
			} catch {
				/* ignore */
			}
			return message;
		},
		async createThread(userId, threadId, meta) {
			try {
				const metaList = await this.listThreads?.(userId);
				if (metaList && !metaList.some((m) => m.id === threadId)) {
					metaList.push(meta);
					persistThreadMeta(userId, metaList);
				}
			} catch {
				/* ignore */
			}
			return meta;
		},
		async updateThread(userId, threadId, meta) {
			try {
				const metaList = await this.listThreads?.(userId);
				if (metaList) {
					const idx = metaList.findIndex((m) => m.id === threadId);
					if (idx === -1) metaList.push(meta);
					else metaList[idx] = { ...metaList[idx], ...meta };
					persistThreadMeta(userId, metaList);
				}
			} catch {
				/* ignore */
			}
			return meta;
		},
		async deleteThread(userId, threadId) {
			let removed: MessageThreadMeta | undefined;
			try {
				const metaList = await this.listThreads?.(userId);
				if (metaList) {
					const idx = metaList.findIndex((m) => m.id === threadId);
					if (idx !== -1) removed = metaList[idx];
					const newList = metaList.filter((m) => m.id !== threadId);
					persistThreadMeta(userId, newList);
					localStorage.removeItem(threadKey(userId, threadId));
				}
			} catch {
				/* ignore */
			}
			return removed;
		},
		async updateMessage(userId, threadId, updatedMsg) {
			try {
				const msgs = (await this.loadMessages?.(userId, threadId)) ?? [];
				const newMsgs = msgs.map((m) =>
					m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m
				);
				localStorage.setItem(
					threadKey(userId, threadId),
					JSON.stringify(newMsgs)
				);
			} catch {
				/* ignore */
			}
			return updatedMsg;
		},
		async deleteMessage(userId, threadId, messageId) {
			let removed: Message | undefined;
			try {
				const msgs = (await this.loadMessages?.(userId, threadId)) ?? [];
				removed = msgs.find((m) => m.id === messageId);
				const newMsgs = msgs.filter((m) => m.id !== messageId);
				localStorage.setItem(
					threadKey(userId, threadId),
					JSON.stringify(newMsgs)
				);
			} catch {
				/* ignore */
			}
			return removed;
		},
	};
};

const createMessageStorageNoopAdapter = (): MessageStorageNoopAdapter => ({
	type: 'none',
	async listThreads() {
		return [];
	},
	async loadMessages() {
		return [] as Message[];
	},
	async persistMessage(_userId, _threadId, message) {
		// No persistence; just echo back
		return message;
	},
});

export const createMessageStorageAdapter = (
	cfg?: MessageStorageConfig
): MessageStorageAdapter => {
	if (!cfg || cfg.type === 'none') {
		return createMessageStorageNoopAdapter();
	}
	if (cfg.type === 'local')
		return createMessageStorageLocalAdapter(cfg?.options);
	if (cfg.type === 'custom')
		return { type: 'custom', ...cfg.adapter } as MessageStorageCustomAdapter;
	return createMessageStorageNoopAdapter();
};

// Add messageThreadMeta type
export interface MessageThreadMeta {
	id: string;
	title: string;
	updatedAt: string;
}

export interface MessageStorageState {
	messageStorageAdapter: MessageStorageAdapter | undefined;
	setMessageStorageAdapter: (cfg?: MessageStorageConfig) => void;
	persistMessageStorageMessage: (message: Message) => Promise<void>;
	initializeChat: (params?: {
		userId?: string | null;
		threadId?: string | null;
	}) => Promise<void>;
}

export function getMessageStorageState(
	set: {
		(
			partial:
				| CedarStore
				| Partial<CedarStore>
				| ((state: CedarStore) => CedarStore | Partial<CedarStore>),
			replace?: false
		): void;
		(
			state: CedarStore | ((state: CedarStore) => CedarStore),
			replace: true
		): void;
	},
	get: () => CedarStore & MessageStorageState
): MessageStorageState {
	let adapter: MessageStorageAdapter | undefined = undefined;

	// Function to sync threads from storage to threadMap and handle automatic thread selection
	const syncThreadsFromStorage = async (
		userId: string | null,
		autoCreateThread: boolean = true
	): Promise<string | null> => {
		if (!adapter || !adapter.listThreads || !userId) return null;

		try {
			let threads = await adapter.listThreads(userId);
			const state = get();

			// Auto-create a thread if none exist
			if (threads.length === 0 && autoCreateThread && adapter.createThread) {
				const newThreadId = `thread-${Date.now()}-${Math.random()
					.toString(36)
					.substring(2, 9)}`;
				const newMeta: MessageThreadMeta = {
					id: newThreadId,
					title: 'New Chat',
					updatedAt: new Date().toISOString(),
				};
				try {
					await adapter.createThread(userId, newThreadId, newMeta);
					// Reload threads after creation
					threads = await adapter.listThreads(userId);
				} catch (error) {
					console.warn('Failed to auto-create thread:', error);
				}
			}

			// Sync threads from storage to threadMap (don't create new storage entries)
			const currentThreadMap = state.threadMap;
			const updatedThreadMap = { ...currentThreadMap };

			threads.forEach((threadMeta) => {
				if (!updatedThreadMap[threadMeta.id]) {
					// Add thread to in-memory threadMap (it already exists in storage)
					updatedThreadMap[threadMeta.id] = {
						id: threadMeta.id,
						name: threadMeta.title,
						lastLoaded: new Date().toISOString(),
						messages: [], // Messages will be loaded separately
					};
				} else {
					// Update thread name if different from storage
					const existingThread = updatedThreadMap[threadMeta.id];
					if (existingThread.name !== threadMeta.title) {
						updatedThreadMap[threadMeta.id] = {
							...existingThread,
							name: threadMeta.title,
						};
					}
				}
			});

			// Update the threadMap in one operation
			if (
				Object.keys(updatedThreadMap).length !==
					Object.keys(currentThreadMap).length ||
				threads.some(
					(meta) =>
						!currentThreadMap[meta.id] ||
						currentThreadMap[meta.id].name !== meta.title
				)
			) {
				set({ threadMap: updatedThreadMap });
			}

			// Handle thread selection if no thread is currently selected
			const currentThreadId = get().mainThreadId; // Use from messagesSlice
			if (!currentThreadId && threads.length > 0) {
				const threadToSelect = threads[0].id;
				get().setMainThreadId(threadToSelect); // Use messagesSlice method
				return threadToSelect;
			}
		} catch (error) {
			console.warn('Failed to sync threads from storage:', error);
		}
		return null;
	};

	return {
		messageStorageAdapter: adapter,
		setMessageStorageAdapter: (cfg?: MessageStorageConfig) => {
			// Create adapter - fallback to local if cfg is undefined
			adapter = createMessageStorageAdapter(cfg);

			set({ messageStorageAdapter: adapter });
		},
		persistMessageStorageMessage: async (message: Message): Promise<void> => {
			if (!adapter?.persistMessage) return;

			const uid = getCedarState('userId') as string | null;
			const tid = get().mainThreadId || v4();

			// Only persist if we have user ID
			if (!uid) return;

			// Thread creation responsibility moved to loadAndSelectThreads

			// Persist the message itself
			if (adapter.persistMessage) {
				await adapter.persistMessage!(uid, tid, message);
			}

			// Update thread meta while preserving original title
			if (adapter.updateThread) {
				const existingThread = get().threadMap[tid];
				const meta: MessageThreadMeta = {
					id: tid,
					title:
						existingThread?.name || (message.content || 'Chat').slice(0, 40),
					updatedAt: new Date().toISOString(),
				};
				await adapter.updateThread(uid, tid, meta);
			}

			// Refresh thread list (no auto-creation here – already handled earlier)
			await syncThreadsFromStorage(uid, false);
		},
		initializeChat: async (params) => {
			// Use provided values or fall back to Cedar state
			const uid = params?.userId || (getCedarState('userId') as string | null);
			const tidFromParams = params?.threadId;

			let tid = tidFromParams;

			// If we have an adapter that can create threads, use it
			if (adapter?.createThread && uid) {
				// Sync threads from storage to threadMap first (with auto-creation)
				const threadId = await syncThreadsFromStorage(uid, true);
				tid = tidFromParams || threadId;
			} else {
				// No adapter or no createThread capability - create default thread
				const state = get();
				if (!state.threadMap[DEFAULT_THREAD_ID]) {
					// Add default thread to threadMap
					set((state) => ({
						threadMap: {
							...state.threadMap,
							[DEFAULT_THREAD_ID]: {
								id: DEFAULT_THREAD_ID,
								name: 'Main Chat',
								lastLoaded: new Date().toISOString(),
								messages: [],
							},
						},
					}));
				}
				tid = tidFromParams || DEFAULT_THREAD_ID;
			}

			// Set the main thread ID
			if (tid) {
				get().setMainThreadId(tid);
			}

			// Clear existing messages first
			useCedarStore.getState().setMessages([]);

			// Then load messages for the selected thread
			if (!adapter || !adapter.loadMessages || !uid || !tid) return;

			try {
				const msgs = await adapter.loadMessages(uid, tid);
				if (msgs.length) {
					useCedarStore.getState().setMessages(msgs);
				}
			} catch (error) {
				console.warn('Failed to load messages during initialization:', error);
			}
		},
	};
}

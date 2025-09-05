import { CedarStore } from '@/store/CedarOSTypes';
import type { Message } from '@/store/messages/MessageTypes';
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
	// Thread-related state and methods
	messageThreads: MessageThreadMeta[];
	setMessageThreads: (threads: MessageThreadMeta[]) => void;
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

	// Function to load threads and handle automatic thread selection
	const loadAndSelectThreads = async (
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

			state.setMessageThreads(threads);

			// Handle thread selection if no thread is currently selected
			const currentThreadId = get().mainThreadId; // Use from messagesSlice
			if (!currentThreadId && threads.length > 0) {
				const threadToSelect = threads[0].id;
				get().setMainThreadId(threadToSelect); // Use messagesSlice method
				return threadToSelect;
			}
		} catch (error) {
			console.warn('Failed to load threads:', error);
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
				const existingMeta = get().messageThreads?.find(
					(t: MessageThreadMeta) => t.id === tid
				);
				const meta: MessageThreadMeta = {
					id: tid,
					title:
						existingMeta?.title || (message.content || 'Chat').slice(0, 40),
					updatedAt: new Date().toISOString(),
				};
				await adapter.updateThread(uid, tid, meta);
			}

			// Refresh thread list (no auto-creation here – already handled earlier)
			await loadAndSelectThreads(uid, false);
		},
		initializeChat: async (params) => {
			// Use provided values or fall back to Cedar state
			const uid = params?.userId || (getCedarState('userId') as string | null);
			const tidFromParams = params?.threadId || get().mainThreadId; // Get from messagesSlice

			// Load threads first
			const threadId = await loadAndSelectThreads(uid, true);

			// Use the provided threadId or get the current one after thread selection
			const tid = tidFromParams || threadId;
			if (tid) {
				get().setMainThreadId(tid); // Use messagesSlice method
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
		// Thread-related state and methods
		messageThreads: [],
		setMessageThreads: (threads: MessageThreadMeta[]) => {
			set({ messageThreads: threads });
		},
	};
}

import { CedarStore } from '@/store/CedarOSTypes';
import type { Message } from './MessageTypes';
import { getCedarState, useCedarStore } from '@/store/CedarStore';

// -------------------------------------------------
// Type definitions
// -------------------------------------------------
export interface MessageStorageBaseAdapter {
	loadMessages(
		userId: string | null | undefined,
		threadId: string
	): Promise<Message[]>;
	// Returns the message that was persisted
	persistMessage(
		userId: string | null | undefined,
		threadId: string,
		message: Message
	): Promise<Message>;
	// Optional thread operations
	listThreads?(userId?: string | null): Promise<MessageThreadMeta[]>;
	createThread?(
		userId: string | null | undefined,
		threadId: string,
		meta: MessageThreadMeta
	): Promise<MessageThreadMeta>;
	updateThread?(
		userId: string | null | undefined,
		threadId: string,
		meta: MessageThreadMeta
	): Promise<MessageThreadMeta>;
	deleteThread?(
		userId: string | null | undefined,
		threadId: string
	): Promise<MessageThreadMeta | undefined>;
	// Optional message-level operations
	updateMessage?(
		userId: string | null | undefined,
		threadId: string,
		message: Message
	): Promise<Message>;
	deleteMessage?(
		userId: string | null | undefined,
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

const defaultUser = 'defaultUser';
const defaultThread = 'defaultThread';

const createMessageStorageLocalAdapter = (
	opts: LocalAdapterOptions = {}
): MessageStorageLocalAdapter => {
	const prefix = opts.key ?? 'cedar';
	const uidOrDefault = (uid?: string | null) => uid || defaultUser;
	const threadsKey = (userId?: string | null) =>
		`${prefix}-threads-${uidOrDefault(userId)}`;
	const threadKey = (userId: string | null | undefined, threadId: string) =>
		`${prefix}-thread-${uidOrDefault(userId)}-${threadId || defaultThread}`;

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
				const existingMessages = await this.loadMessages(userId, threadId);
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
					persistThreadMeta(userId ?? defaultUser, metaList);
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
					persistThreadMeta(userId ?? defaultUser, metaList);
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
					persistThreadMeta(userId ?? defaultUser, newList);
					localStorage.removeItem(threadKey(userId, threadId));
				}
			} catch {
				/* ignore */
			}
			return removed;
		},
		async updateMessage(userId, threadId, updatedMsg) {
			try {
				const msgs = await this.loadMessages(userId, threadId);
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
				const msgs = await this.loadMessages(userId, threadId);
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
	loadMessageStorageMessages: () => Promise<void>;
	persistMessageStorageMessage: (
		message: Message,
		autoCreateThread?: boolean
	) => Promise<void>;
	loadMessageStorageThreads: () => Promise<void>;
	// Thread-related state and methods
	messageCurrentThreadId: string | null;
	messageThreads: MessageThreadMeta[];
	setMessageCurrentThreadId: (id: string | null) => void;
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
	const loadAndSelectThreads = async (userId: string | null) => {
		if (!adapter || !adapter.listThreads) return;

		try {
			const threads = await adapter.listThreads(userId);
			const state = get();

			// Update threads list
			if (state.setMessageThreads) {
				state.setMessageThreads(threads);
			}

			// Handle thread selection if no thread is currently selected
			if (!state.messageCurrentThreadId) {
				let threadToSelect: string | null = null;

				if (threads.length > 0) {
					// Select first available thread
					threadToSelect = threads[0].id;
				} else if (threads.length === 0) {
					// Fallback to default thread
					threadToSelect = defaultThread;
				}

				if (threadToSelect && state.setMessageCurrentThreadId) {
					state.setMessageCurrentThreadId(threadToSelect);
				}
			}
		} catch (error) {
			// Gracefully handle errors - continue with current/default thread
			console.warn('Failed to load threads:', error);
		}
	};

	const attemptHydrate = () => {
		if (!adapter) return;
		try {
			const state = get();
			const uid = getCedarState('userId') as string | null;
			console.log('uid', uid);
			const tid = state.messageCurrentThreadId;

			const threadToLoad = tid || defaultThread;

			adapter
				.loadMessages(uid, threadToLoad)
				.then((msgs) => {
					if (msgs.length) {
						useCedarStore.getState().setMessages(msgs);
					}
				})
				.catch(() => {
					// Ignore errors during hydration
				});
		} catch {
			// Ignore errors during hydration (e.g., store not fully initialized)
		}
	};

	return {
		messageStorageAdapter: adapter,
		setMessageStorageAdapter: (cfg?: MessageStorageConfig) => {
			// Create adapter - fallback to local if cfg is undefined
			adapter = createMessageStorageAdapter(cfg);

			set({ messageStorageAdapter: adapter });

			const uid = getCedarState('userId') as string | null;

			// Load threads and messages with the new adapter
			loadAndSelectThreads(uid);
			attemptHydrate();
		},
		loadMessageStorageMessages: async (): Promise<void> => {
			if (!adapter) return;
			const uid = getCedarState('userId') as string | null;
			const tid = get().messageCurrentThreadId;
			const threadToLoad = tid || defaultThread;
			const msgs = await adapter.loadMessages(uid, threadToLoad);
			if (msgs.length) {
				useCedarStore.getState().setMessages(msgs);
			}
		},
		persistMessageStorageMessage: async (
			message: Message,
			autoCreateThread = true
		): Promise<void> => {
			if (!adapter) return;

			const state = get();
			const uid = getCedarState('userId') as string | null;
			const tid = state.messageCurrentThreadId || defaultThread;

			// Optionally create thread if it doesn't exist
			if (autoCreateThread && adapter.listThreads) {
				try {
					const threads = await adapter.listThreads(uid);
					const exists = threads.some((t: MessageThreadMeta) => t.id === tid);
					if (!exists && adapter.createThread) {
						const meta: MessageThreadMeta = {
							id: tid,
							title: (message.content ?? 'Chat').slice(0, 40),
							updatedAt: new Date().toISOString(),
						};
						await adapter.createThread(uid, tid, meta);
					}
				} catch {
					/* ignore */
				}
			}

			// Persist the message itself
			await adapter.persistMessage(uid, tid, message);

			// Update thread meta while preserving original title
			if (adapter.updateThread) {
				const existingMeta = get().messageThreads?.find(
					(t: MessageThreadMeta) => t.id === tid
				);
				const meta: MessageThreadMeta = {
					id: tid,
					title:
						existingMeta?.title ?? (message.content ?? 'Chat').slice(0, 40),
					updatedAt: new Date().toISOString(),
				};
				await adapter.updateThread(uid, tid, meta);
			}

			// Refresh thread list in the store
			await loadAndSelectThreads(uid);
		},
		loadMessageStorageThreads: async (): Promise<void> => {
			const uid = getCedarState('userId') as string | null;
			await loadAndSelectThreads(uid);
		},
		// Thread-related state and methods
		messageCurrentThreadId: null,
		messageThreads: [],
		setMessageCurrentThreadId: (id: string | null) => {
			set({ messageCurrentThreadId: id });
		},
		setMessageThreads: (threads: MessageThreadMeta[]) => {
			set({ messageThreads: threads });
		},
	};
}

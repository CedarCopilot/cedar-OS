import type { StateCreator } from 'zustand';
import type { Message } from './messages/types';
import type { CedarStore } from './types';
import { ThreadMeta } from '@/store/historySlice';

// -------------------------------------------------
// Type definitions
// -------------------------------------------------
export interface BaseStorageAdapter {
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
	listThreads?(userId?: string | null): Promise<ThreadMeta[]>;
	createThread?(
		userId: string | null | undefined,
		threadId: string,
		meta: ThreadMeta
	): Promise<ThreadMeta>;
	updateThread?(
		userId: string | null | undefined,
		threadId: string,
		meta: ThreadMeta
	): Promise<ThreadMeta>;
	deleteThread?(
		userId: string | null | undefined,
		threadId: string
	): Promise<ThreadMeta | undefined>;
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

export type LocalStorageAdapter = BaseStorageAdapter & {
	type: 'local';
};

export interface RemoteAdapterOptions {
	baseURL: string;
	headers?: Record<string, string>;
}

export type RemoteStorageAdapter = BaseStorageAdapter & {
	type: 'remote';
	baseURL: string;
	headers: Record<string, string>;
};

export type NoopStorageAdapter = BaseStorageAdapter & {
	type: 'none';
};

export type CustomStorageAdapter = BaseStorageAdapter & {
	type: 'custom';
};

export type StorageAdapter =
	| LocalStorageAdapter
	| RemoteStorageAdapter
	| NoopStorageAdapter
	| CustomStorageAdapter;

// Config supplied by user when switching adapters
export type StorageConfig =
	| {
			type: 'local';
			options?: LocalAdapterOptions;
	  }
	| {
			type: 'remote';
			options: RemoteAdapterOptions;
	  }
	| { type: 'none' }
	| {
			type: 'custom';
			adapter: BaseStorageAdapter;
	  };

// -------------------------------------------------
// Adapter factories
// -------------------------------------------------

const createLocalAdapter = (
	opts: LocalAdapterOptions = {}
): LocalStorageAdapter => {
	const prefix = opts.key ?? 'cedar';

	const uidOrDefault = (uid?: string | null) => uid ?? 'default';
	const threadsKey = (userId?: string | null) =>
		`${prefix}-threads-${uidOrDefault(userId)}`;
	const threadKey = (userId: string | null | undefined, threadId: string) =>
		`${prefix}-thread-${uidOrDefault(userId)}-${threadId}`;

	const persistThreadMeta = (userId: string, list: ThreadMeta[]) => {
		localStorage.setItem(threadsKey(userId), JSON.stringify(list));
	};

	return {
		type: 'local',
		async listThreads(userId) {
			const raw = localStorage.getItem(threadsKey(userId));
			return raw ? (JSON.parse(raw) as ThreadMeta[]) : [];
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
					persistThreadMeta(userId ?? 'default', metaList);
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
					persistThreadMeta(userId ?? 'default', metaList);
				}
			} catch {
				/* ignore */
			}
			return meta;
		},
		async deleteThread(userId, threadId) {
			let removed: ThreadMeta | undefined;
			try {
				const metaList = await this.listThreads?.(userId);
				if (metaList) {
					const idx = metaList.findIndex((m) => m.id === threadId);
					if (idx !== -1) removed = metaList[idx];
					const newList = metaList.filter((m) => m.id !== threadId);
					persistThreadMeta(userId ?? 'default', newList);
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

const createNoopAdapter = (): NoopStorageAdapter => ({
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

const createRemoteAdapter = (
	opts: RemoteAdapterOptions
): RemoteStorageAdapter => {
	const headers = opts.headers ?? {};
	return {
		type: 'remote',
		baseURL: opts.baseURL,
		headers,
		listThreads: async (userId) => {
			try {
				const url = userId
					? `${opts.baseURL}/threads?userId=${userId}`
					: `${opts.baseURL}/threads`;
				const res = await fetch(url, { headers });
				if (!res.ok) throw new Error('Fetch threads failed');
				return (await res.json()) as ThreadMeta[];
			} catch {
				return [];
			}
		},
		async loadMessages(userId, threadId) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}`;
				const res = await fetch(url, { headers });
				if (!res.ok) throw new Error('Fetch failed');
				return (await res.json()) as Message[];
			} catch {
				return [];
			}
		},
		async persistMessage(userId, threadId, message) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}/messages?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}/messages`;
				await fetch(url, {
					method: 'POST',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({ message }),
				});
			} catch {
				/* ignore */
			}
			return message;
		},
		async createThread(userId, threadId, meta) {
			try {
				const url = userId
					? `${opts.baseURL}/threads?userId=${userId}`
					: `${opts.baseURL}/threads`;
				await fetch(url, {
					method: 'POST',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({ threadId, meta }),
				});
			} catch {
				/* ignore */
			}
			return meta;
		},
		async updateThread(userId, threadId, meta) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}`;
				await fetch(url, {
					method: 'PUT',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({ meta }),
				});
			} catch {
				/* ignore */
			}
			return meta;
		},
		async deleteThread(userId, threadId) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}`;
				await fetch(url, {
					method: 'DELETE',
					headers,
				});
			} catch {
				/* ignore */
			}
			return undefined;
		},
		async updateMessage(userId, threadId, message) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}/messages/${message.id}?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}/messages/${message.id}`;
				await fetch(url, {
					method: 'PUT',
					headers: { ...headers, 'Content-Type': 'application/json' },
					body: JSON.stringify({ message }),
				});
			} catch {
				/* ignore */
			}
			return message;
		},
		async deleteMessage(userId, threadId, messageId) {
			try {
				const url = userId
					? `${opts.baseURL}/threads/${threadId}/messages/${messageId}?userId=${userId}`
					: `${opts.baseURL}/threads/${threadId}/messages/${messageId}`;
				await fetch(url, { method: 'DELETE', headers });
			} catch {
				/* ignore */
			}
			return undefined;
		},
	};
};

export const createAdapter = (cfg?: StorageConfig): StorageAdapter => {
	if (!cfg || cfg.type === 'local') {
		return createLocalAdapter(cfg?.options);
	}
	if (cfg.type === 'none') return createNoopAdapter();
	if (cfg.type === 'custom')
		return { type: 'custom', ...cfg.adapter } as CustomStorageAdapter;
	if (cfg.type === 'remote') return createRemoteAdapter(cfg.options);
	// fallback
	return createLocalAdapter();
};

// -------------------------------------------------
// Slice
// -------------------------------------------------

export interface StorageSlice {
	storageAdapter: StorageAdapter | undefined;
	setStorageAdapter: (cfg?: StorageConfig) => void;
	loadMessages: () => Promise<void>;
	persistMessage: (
		message: Message,
		autoCreateThread?: boolean
	) => Promise<void>;
	loadThreads: () => Promise<void>;
}

export const createStorageSlice: StateCreator<
	CedarStore,
	[],
	[],
	StorageSlice
> = (set, get) => {
	let adapter: StorageAdapter | undefined = undefined;

	// Function to load threads and handle automatic thread selection
	const loadAndSelectThreads = async (userId: string | null) => {
		if (!adapter || !adapter.listThreads) return;

		try {
			const threads = await adapter.listThreads(userId);
			const state = get();

			// Update threads list
			if (state.setThreads) {
				state.setThreads(threads);
			}

			// Handle thread selection if no thread is currently selected
			if (!state.currentThreadId) {
				let threadToSelect: string | null = null;

				if (threads.length > 0) {
					// Select first available thread
					threadToSelect = threads[0].id;
				} else if (threads.length === 0) {
					// Fallback to default thread
					threadToSelect = 'default';
				}

				if (threadToSelect && state.setCurrentThreadId) {
					state.setCurrentThreadId(threadToSelect);
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
			const uid = state.userId;
			const tid = state.currentThreadId;

			// For backwards compatibility, load from default thread if no thread is set
			// This matches the original localStorage behavior
			const threadToLoad = tid || 'default';

			adapter
				.loadMessages(uid, threadToLoad)
				.then((msgs) => {
					if (msgs.length && state.setMessages) {
						state.setMessages(msgs);
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
		storageAdapter: adapter,
		setStorageAdapter: (cfg) => {
			// Create adapter - fallback to local if cfg is undefined
			adapter = createAdapter(cfg);

			set({ storageAdapter: adapter });

			const uid = get().userId;

			// Load threads and messages with the new adapter
			loadAndSelectThreads(uid);
			attemptHydrate();
		},
		loadMessages: async () => {
			if (!adapter) return;
			const uid = get().userId;
			const tid = get().currentThreadId;
			const threadToLoad = tid || 'default';
			const msgs = await adapter.loadMessages(uid, threadToLoad);
			if (msgs.length && get().setMessages) {
				get().setMessages(msgs);
			}
		},
		persistMessage: async (message, autoCreateThread = true) => {
			if (!adapter) return;

			const state = get();
			const uid = state.userId;
			const tid = state.currentThreadId || 'default';

			// Optionally create thread if it doesn't exist
			if (autoCreateThread && adapter.listThreads) {
				try {
					const threads = await adapter.listThreads(uid);
					const exists = threads.some((t) => t.id === tid);
					if (!exists && adapter.createThread) {
						const meta: ThreadMeta = {
							id: tid,
							title: (message.content ?? 'Chat').slice(0, 40),
							updatedAt: new Date().toISOString(),
							lastMessage: message.content ?? '',
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
				const existingMeta = get().threads?.find((t) => t.id === tid);
				const meta: ThreadMeta = {
					id: tid,
					title:
						existingMeta?.title ?? (message.content ?? 'Chat').slice(0, 40),
					updatedAt: new Date().toISOString(),
					lastMessage: message.content ?? '',
				};
				await adapter.updateThread(uid, tid, meta);
			}

			// Refresh thread list in the store
			await loadAndSelectThreads(uid);
		},
		loadThreads: async () => {
			const uid = get().userId;
			await loadAndSelectThreads(uid);
		},
	};
};

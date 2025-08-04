import type { StateCreator } from 'zustand';
import type { Message } from './messages/types';
import type { CedarStore } from './types';
import { ThreadMeta } from '@/store/historySlice';

// -------------------------------------------------
// Type definitions
// -------------------------------------------------
export interface BaseStorageAdapter {
	listThreads(userId?: string | null): Promise<ThreadMeta[]>;
	loadMessages(
		userId: string | null | undefined,
		threadId: string
	): Promise<Message[]>;
	persistMessage(
		userId: string | null | undefined,
		threadId: string,
		message: Message
	): Promise<void>;
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

	const listThreads = async (userId?: string | null): Promise<ThreadMeta[]> => {
		try {
			const raw = localStorage.getItem(threadsKey(userId));
			return raw ? (JSON.parse(raw) as ThreadMeta[]) : [];
		} catch {
			return [];
		}
	};

	const persistThreadMeta = (userId: string, list: ThreadMeta[]) => {
		localStorage.setItem(threadsKey(userId), JSON.stringify(list));
	};

	return {
		type: 'local',
		listThreads,
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
				// Load existing messages and append the new one
				const existingMessages = await this.loadMessages(userId, threadId);
				const updatedMessages = [...existingMessages, message];

				// update meta list
				const metaList = await this.listThreads(userId);
				const idx = metaList.findIndex((m) => m.id === threadId);
				const now = new Date().toISOString();
				const first = updatedMessages[0]?.content ?? 'Chat';
				const meta: ThreadMeta = {
					id: threadId,
					title: first.slice(0, 40),
					updatedAt: now,
					lastMessage: message.content ?? '',
				};
				if (idx === -1) metaList.push(meta);
				else metaList[idx] = meta;
				persistThreadMeta(userId ?? 'default', metaList);
			} catch {
				/* ignore */
			}
		},
	};
};

const createNoopAdapter = (): NoopStorageAdapter => ({
	type: 'none',
	async listThreads() {
		return [];
	},
	async loadMessages() {
		return [];
	},
	async persistMessage() {},
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
					headers,
					body: JSON.stringify({ message }),
				});
			} catch {
				/* ignore */
			}
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
	persistMessage: (message: Message) => Promise<void>;
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
		if (!adapter) return;

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
		persistMessage: async (message) => {
			if (!adapter) return;
			const uid = get().userId;
			const tid = get().currentThreadId;
			const threadToPersist = tid || 'default';
			await adapter.persistMessage(uid, threadToPersist, message);
		},
		loadThreads: async () => {
			const uid = get().userId;
			await loadAndSelectThreads(uid);
		},
	};
};

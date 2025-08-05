import type { StateCreator } from 'zustand';
import type { CedarStore } from './types';

export interface ThreadMeta {
	id: string;
	title: string;
	updatedAt: string;
	lastMessage: string;
}

export interface HistorySlice {
	currentThreadId: string | null;
	threads: ThreadMeta[];
	setCurrentThreadId: (id: string | null) => void;
	setThreads: (threads: ThreadMeta[]) => void;
}

export const createHistorySlice: StateCreator<
	CedarStore,
	[],
	[],
	HistorySlice
> = (set) => ({
	currentThreadId: null,
	threads: [],
	setCurrentThreadId: (id) => {
		set({ currentThreadId: id });
	},
	setThreads: (threads) => {
		set({ threads });
	},
});

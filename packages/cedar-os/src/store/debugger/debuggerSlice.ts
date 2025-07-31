import type { StateCreator } from 'zustand';
import type { CedarStore } from '../types';
import type { LLMResponse, BaseParams } from '../agentConnection/types';

export interface DebugLogEntry {
	id: string;
	timestamp: Date;
	type:
		| 'request'
		| 'response'
		| 'error'
		| 'stream-start'
		| 'stream-chunk'
		| 'stream-object'
		| 'stream-end';
	provider?: string;
	data: {
		params?: BaseParams;
		response?: LLMResponse;
		error?: Error;
		chunk?: string;
		object?: object;
		completedItems?: (string | object)[];
	};
	duration?: number; // milliseconds for request-response pairs
}

export interface DebuggerSlice {
	// State
	agentConnectionLogs: DebugLogEntry[];
	maxLogs: number;
	isDebugEnabled: boolean;

	// Actions
	logAgentRequest: (params: BaseParams, provider: string) => string; // returns request ID
	logAgentResponse: (requestId: string, response: LLMResponse) => void;
	logAgentError: (requestId: string, error: Error) => void;
	logStreamStart: (params: BaseParams, provider: string) => string; // returns stream ID
	logStreamChunk: (streamId: string, chunk: string) => void;
	logStreamObject: (streamId: string, object: object) => void;
	logStreamEnd: (
		streamId: string,
		completedItems?: (string | object)[]
	) => void;
	clearDebugLogs: () => void;
	setDebugEnabled: (enabled: boolean) => void;
	setMaxLogs: (max: number) => void;
}

export const createDebuggerSlice: StateCreator<
	CedarStore,
	[],
	[],
	DebuggerSlice
> = (set, get) => ({
	// Default state
	agentConnectionLogs: [],
	maxLogs: 50,
	isDebugEnabled: true,

	// Actions
	logAgentRequest: (params, provider) => {
		const state = get();
		if (!state.isDebugEnabled) return '';

		const requestId = `req_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
		const entry: DebugLogEntry = {
			id: requestId,
			timestamp: new Date(),
			type: 'request',
			provider,
			data: { params },
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));

		return requestId;
	},

	logAgentResponse: (requestId, response) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		// Find the original request
		const requestLog = state.agentConnectionLogs.find(
			(log) => log.id === requestId && log.type === 'request'
		);

		const entry: DebugLogEntry = {
			id: `res_${requestId}`,
			timestamp: new Date(),
			type: 'response',
			provider: requestLog?.provider,
			data: { response },
			duration: requestLog
				? new Date().getTime() - requestLog.timestamp.getTime()
				: undefined,
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));
	},

	logAgentError: (requestId, error) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		// Find the original request
		const requestLog = state.agentConnectionLogs.find(
			(log) => log.id === requestId && log.type === 'request'
		);

		const entry: DebugLogEntry = {
			id: `err_${requestId}`,
			timestamp: new Date(),
			type: 'error',
			provider: requestLog?.provider,
			data: { error },
			duration: requestLog
				? new Date().getTime() - requestLog.timestamp.getTime()
				: undefined,
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));
	},

	logStreamStart: (params, provider) => {
		const state = get();
		if (!state.isDebugEnabled) return '';

		const streamId = `stream_${Date.now()}_${Math.random()
			.toString(36)
			.substr(2, 9)}`;
		const entry: DebugLogEntry = {
			id: streamId,
			timestamp: new Date(),
			type: 'stream-start',
			provider,
			data: { params },
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));

		return streamId;
	},

	logStreamChunk: (streamId, chunk) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		const entry: DebugLogEntry = {
			id: `chunk_${streamId}_${Date.now()}`,
			timestamp: new Date(),
			type: 'stream-chunk',
			data: { chunk },
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));
	},
	logStreamObject: (streamId, object) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		const entry: DebugLogEntry = {
			id: `object_${streamId}_${Date.now()}`,
			timestamp: new Date(),
			type: 'stream-object',
			data: { object },
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));
	},

	logStreamEnd: (streamId, completedItems) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		// Find the original stream start
		const streamStart = state.agentConnectionLogs.find(
			(log) => log.id === streamId && log.type === 'stream-start'
		);

		const entry: DebugLogEntry = {
			id: `end_${streamId}`,
			timestamp: new Date(),
			type: 'stream-end',
			provider: streamStart?.provider,
			data: { completedItems },
			duration: streamStart
				? new Date().getTime() - streamStart.timestamp.getTime()
				: undefined,
		};

		set((state) => ({
			agentConnectionLogs: [
				entry,
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
			],
		}));
	},

	clearDebugLogs: () => set({ agentConnectionLogs: [] }),

	setDebugEnabled: (enabled) => set({ isDebugEnabled: enabled }),

	setMaxLogs: (max) => set({ maxLogs: max }),
});

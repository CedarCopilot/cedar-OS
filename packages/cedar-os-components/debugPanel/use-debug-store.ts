'use client';

import { create } from 'zustand';

export interface NetworkRequest {
	id: string;
	method: string;
	url: string;
	status: number;
	duration: number;
	timestamp: Date;
	requestData?: any;
	responseData?: any;
	streaming?: boolean;
	streamChunks?: string[];
}

export interface StateChange {
	id: string;
	timestamp: Date;
	component: string;
	stateName: string;
	oldValue: any;
	newValue: any;
	stackTrace?: string;
}

export interface HandlerInvocation {
	id: string;
	timestamp: Date;
	handlerName: string;
	args: any[];
	result?: any;
	duration: number;
}

export interface ContextTrace {
	id: string;
	timestamp: Date;
	slice: string;
	agentInputContext: any;
	networkRequest?: string;
	stateChanges: string[];
}

interface DebugStore {
	isRecording: boolean;
	networkRequests: NetworkRequest[];
	stateChanges: StateChange[];
	handlerInvocations: HandlerInvocation[];
	contextTraces: ContextTrace[];

	startRecording: () => void;
	stopRecording: () => void;
	clearRecording: () => void;

	addNetworkRequest: (request: NetworkRequest) => void;
	updateNetworkRequest: (id: string, updates: Partial<NetworkRequest>) => void;
	addStateChange: (change: StateChange) => void;
	addHandlerInvocation: (invocation: HandlerInvocation) => void;
	addContextTrace: (trace: ContextTrace) => void;

	generateSummary: () => string;
}

export const useDebugStore = create<DebugStore>((set, get) => ({
	isRecording: false,
	networkRequests: [
		{
			id: '1',
			method: 'POST',
			url: '/api/ai/summarize',
			status: 200,
			duration: 1200,
			timestamp: new Date(Date.now() - 5000),
			streaming: true,
			streamChunks: ['Analyzing text...', 'Generating summary...', 'Complete!'],
		},
		{
			id: '2',
			method: 'GET',
			url: '/api/emails/inbox',
			status: 200,
			duration: 450,
			timestamp: new Date(Date.now() - 8000),
		},
		{
			id: '3',
			method: 'POST',
			url: '/api/ai/reply-suggestion',
			status: 429,
			duration: 2100,
			timestamp: new Date(Date.now() - 10000),
		},
	],
	stateChanges: [],
	handlerInvocations: [],
	contextTraces: [],

	startRecording: () => set({ isRecording: true }),
	stopRecording: () => set({ isRecording: false }),
	clearRecording: () =>
		set({
			networkRequests: [],
			stateChanges: [],
			handlerInvocations: [],
			contextTraces: [],
		}),

	addNetworkRequest: (request) =>
		set((state) => ({
			networkRequests: [request, ...state.networkRequests],
		})),

	updateNetworkRequest: (id, updates) =>
		set((state) => ({
			networkRequests: state.networkRequests.map((req) =>
				req.id === id ? { ...req, ...updates } : req
			),
		})),

	addStateChange: (change) =>
		set((state) => ({
			stateChanges: [change, ...state.stateChanges],
		})),

	addHandlerInvocation: (invocation) =>
		set((state) => ({
			handlerInvocations: [invocation, ...state.handlerInvocations],
		})),

	addContextTrace: (trace) =>
		set((state) => ({
			contextTraces: [trace, ...state.contextTraces],
		})),

	generateSummary: () => {
		const state = get();
		const summary = `
# Debug Session Summary

## Recording Status: ${state.isRecording ? 'Active' : 'Stopped'}
## Timestamp: ${new Date().toISOString()}

### Network Requests (${state.networkRequests.length})
${state.networkRequests
	.map(
		(req) => `
- ${req.method} ${req.url} - ${req.status} (${req.duration}ms)
  ${req.streaming ? '  [STREAMING]' : ''}
  ${req.streamChunks ? `  Chunks: ${req.streamChunks.length}` : ''}
`
	)
	.join('')}

### State Changes (${state.stateChanges.length})
${state.stateChanges
	.map(
		(change) => `
- ${change.component}.${change.stateName}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}
`
	)
	.join('')}

### Handler Invocations (${state.handlerInvocations.length})
${state.handlerInvocations
	.map(
		(inv) => `
- ${inv.handlerName}(${inv.args.map((arg) => JSON.stringify(arg)).join(', ')}) - ${inv.duration}ms
`
	)
	.join('')}

### Context Traces (${state.contextTraces.length})
${state.contextTraces
	.map(
		(trace) => `
- Slice: ${trace.slice} → Network: ${trace.networkRequest || 'None'}
  State Changes: ${trace.stateChanges.length}
`
	)
	.join('')}

---
Generated for AI debugging tools like Cursor
    `.trim();

		return summary;
	},
}));

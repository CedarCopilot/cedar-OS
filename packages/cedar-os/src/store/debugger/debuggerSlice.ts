import type { StateCreator } from 'zustand';
import type { CedarStore } from '@/store/CedarOSTypes';
import type {
	LLMResponse,
	BaseParams,
	ResponseProcessor,
	StructuredResponseType,
} from '@/store/agentConnection/AgentConnectionTypes';

export interface DebugLogEntry {
	id: string;
	timestamp: Date;
	type:
		| 'request'
		| 'response'
		| 'error'
		| 'stream-start'
		| 'stream-complete' // Changed from stream-end to be clearer
		| 'stream-error' // Added for stream errors
		| 'handler'; // Added for response processor executions
	provider?: string;
	apiRoute?: string; // API route/endpoint (e.g., Mastra route)
	processorName?: string; // Name of the response processor that handled this
	data: {
		params?: BaseParams;
		response?: LLMResponse;
		error?: Error;
		// For consolidated stream data
		streamContent?: string; // All text chunks concatenated
		streamObjects?: object[]; // All objects collected
		completedItems?: (string | object)[];
		// For handler logs
		handledObject?: StructuredResponseType;
		// For tracking handlers within a request/stream
		handlers?: Array<{
			processorName: string;
			handledObject: StructuredResponseType;
		}>;
	};
	duration?: number; // milliseconds for request-response pairs
}

// Internal tracking for active streams
interface StreamTracker {
	streamId: string;
	startTime: Date;
	provider?: string;
	params?: BaseParams;
	chunks: string[];
	objects: object[];
	handlers: Array<{
		processorName: string;
		handledObject: StructuredResponseType;
	}>;
}

// Internal tracking for active requests (non-streaming)
interface RequestTracker {
	requestId: string;
	startTime: Date;
	handlers: Array<{
		processorName: string;
		handledObject: StructuredResponseType;
	}>;
}

export interface DebuggerSlice {
	// State
	agentConnectionLogs: DebugLogEntry[];
	maxLogs: number;
	isDebugEnabled: boolean;
	// Internal state for tracking active streams (not exposed)
	activeStreams: Map<string, StreamTracker>;
	activeRequests: Map<string, RequestTracker>;
	// Collapsible sections state
	collapsedSections: {
		[stateKey: string]: {
			registeredState?: boolean;
			diffState?: boolean;
		};
	};

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
	logResponseProcessorExecution: (
		obj: StructuredResponseType,
		processor: ResponseProcessor,
		requestOrStreamId?: string
	) => void;
	clearDebugLogs: () => void;
	setDebugEnabled: (enabled: boolean) => void;
	setMaxLogs: (max: number) => void;
	toggleSectionCollapse: (
		stateKey: string,
		section: 'registeredState' | 'diffState'
	) => void;
	setSectionCollapse: (
		stateKey: string,
		section: 'registeredState' | 'diffState',
		collapsed: boolean
	) => void;
	initializeSectionCollapse: (stateKey: string, hasDiffStates: boolean) => void;
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
	activeStreams: new Map(),
	activeRequests: new Map(),
	collapsedSections: {},

	// Actions
	logAgentRequest: (params, provider) => {
		const state = get();
		if (!state.isDebugEnabled) return '';

		const requestId = `req_${Date.now()}_${Math.random()
			.toString(36)
			.slice(2, 11)}`;

		// Extract API route for supported providers
		let apiRoute: string | undefined;
		if (provider === 'mastra' && 'route' in params) {
			apiRoute = params.route as string;
		}

		// Initialize request tracker for non-streaming requests
		const requestTracker: RequestTracker = {
			requestId,
			startTime: new Date(),
			handlers: [],
		};
		const newActiveRequests = new Map(state.activeRequests);
		newActiveRequests.set(requestId, requestTracker);

		const entry: DebugLogEntry = {
			id: requestId,
			timestamp: new Date(),
			type: 'request',
			provider,
			apiRoute,
			data: { params },
		};

		set((state) => ({
			agentConnectionLogs: [
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
				entry,
			],
			activeRequests: newActiveRequests,
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

		// Get any handlers that were tracked for this request
		const requestTracker = state.activeRequests.get(requestId);
		const handlers = requestTracker?.handlers || [];

		const entry: DebugLogEntry = {
			id: `res_${requestId}`,
			timestamp: new Date(),
			type: 'response',
			provider: requestLog?.provider,
			apiRoute: requestLog?.apiRoute,
			data: {
				response,
				handlers: handlers.length > 0 ? handlers : undefined,
			},
			duration: requestLog
				? new Date().getTime() - requestLog.timestamp.getTime()
				: undefined,
		};

		// Clean up the request tracker
		const newActiveRequests = new Map(state.activeRequests);
		newActiveRequests.delete(requestId);

		set((state) => ({
			agentConnectionLogs: [
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
				entry,
			],
			activeRequests: newActiveRequests,
		}));
	},

	logAgentError: (requestId, error) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		// Check if this is a stream error
		const isStreamError = state.activeStreams.has(requestId);

		if (isStreamError) {
			// Handle stream error
			const tracker = state.activeStreams.get(requestId)!;

			// Extract API route from tracker params for stream errors
			let apiRoute: string | undefined;
			if (
				tracker.provider === 'mastra' &&
				tracker.params &&
				'route' in tracker.params
			) {
				apiRoute = tracker.params.route as string;
			}

			const entry: DebugLogEntry = {
				id: requestId,
				timestamp: tracker.startTime,
				type: 'stream-error',
				provider: tracker.provider,
				apiRoute,
				data: {
					params: tracker.params,
					error,
					streamContent: tracker.chunks.join(''),
					streamObjects: tracker.objects,
				},
				duration: new Date().getTime() - tracker.startTime.getTime(),
			};

			// Remove from active streams
			const newActiveStreams = new Map(state.activeStreams);
			newActiveStreams.delete(requestId);

			set((state) => ({
				agentConnectionLogs: [
					...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
					entry,
				],
				activeStreams: newActiveStreams,
			}));
		} else {
			// Handle regular request error
			const requestLog = state.agentConnectionLogs.find(
				(log) => log.id === requestId && log.type === 'request'
			);

			const entry: DebugLogEntry = {
				id: `err_${requestId}`,
				timestamp: new Date(),
				type: 'error',
				provider: requestLog?.provider,
				apiRoute: requestLog?.apiRoute,
				data: { error },
				duration: requestLog
					? new Date().getTime() - requestLog.timestamp.getTime()
					: undefined,
			};

			set((state) => ({
				agentConnectionLogs: [
					...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
					entry,
				],
			}));
		}
	},

	logStreamStart: (params, provider) => {
		const state = get();
		if (!state.isDebugEnabled) return '';

		const streamId = `stream_${Date.now()}_${Math.random()
			.toString(36)
			.slice(2, 11)}`;

		// Create tracker for this stream
		const tracker: StreamTracker = {
			streamId,
			startTime: new Date(),
			provider,
			params,
			chunks: [],
			objects: [],
			handlers: [],
		};

		// Add to active streams
		const newActiveStreams = new Map(state.activeStreams);
		newActiveStreams.set(streamId, tracker);

		set({ activeStreams: newActiveStreams });

		// Don't log stream-start events anymore, we'll log the complete stream at the end
		return streamId;
	},

	logStreamChunk: (streamId, chunk) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		const tracker = state.activeStreams.get(streamId);
		if (!tracker) return;

		// Just accumulate the chunk, don't create a log entry
		tracker.chunks.push(chunk);
	},

	logStreamObject: (streamId, object) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		const tracker = state.activeStreams.get(streamId);
		if (!tracker) return;

		// Just accumulate the object, don't create a log entry
		tracker.objects.push(object);
	},

	logStreamEnd: (streamId, completedItems) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		const tracker = state.activeStreams.get(streamId);
		if (!tracker) return;

		// Extract API route from tracker params
		let apiRoute: string | undefined;
		if (
			tracker.provider === 'mastra' &&
			tracker.params &&
			'route' in tracker.params
		) {
			apiRoute = tracker.params.route as string;
		}

		// Create a single consolidated log entry for the entire stream
		const entry: DebugLogEntry = {
			id: streamId,
			timestamp: tracker.startTime,
			type: 'stream-complete',
			provider: tracker.provider,
			apiRoute,
			data: {
				params: tracker.params,
				streamContent: tracker.chunks.join(''),
				streamObjects: tracker.objects,
				completedItems: completedItems || [
					...(tracker.chunks.length > 0 ? [tracker.chunks.join('')] : []),
					...tracker.objects,
				],
				handlers: tracker.handlers.length > 0 ? tracker.handlers : undefined,
			},
			duration: new Date().getTime() - tracker.startTime.getTime(),
		};

		// Remove from active streams
		const newActiveStreams = new Map(state.activeStreams);
		newActiveStreams.delete(streamId);

		set((state) => ({
			agentConnectionLogs: [
				...state.agentConnectionLogs.slice(0, state.maxLogs - 1),
				entry,
			],
			activeStreams: newActiveStreams,
		}));
	},

	logResponseProcessorExecution: (obj, processor, requestOrStreamId) => {
		const state = get();
		if (!state.isDebugEnabled) return;

		// Build a descriptive name for the processor
		const processorName = processor.namespace
			? `${processor.namespace}:${processor.type}`
			: processor.type;

		const handlerInfo = { processorName, handledObject: obj };

		// Check if this is part of an active stream
		const streamTracker = requestOrStreamId
			? state.activeStreams.get(requestOrStreamId)
			: null;

		if (streamTracker) {
			// Special handling for text handlers - merge consecutive ones
			if (processorName === 'builtin:text') {
				const lastHandler =
					streamTracker.handlers[streamTracker.handlers.length - 1];

				// If the last handler is also a text handler, merge them
				if (lastHandler && lastHandler.processorName === 'builtin:text') {
					// Combine the text content
					const existingContent =
						'content' in lastHandler.handledObject
							? String(lastHandler.handledObject.content)
							: '';
					const newContent = 'content' in obj ? String(obj.content) : '';
					lastHandler.handledObject = {
						type: 'text',
						content: existingContent + newContent,
					} as StructuredResponseType;
					return;
				}
			}

			// Add to stream's handler list (for non-text or first text handler)
			streamTracker.handlers.push(handlerInfo);
			return;
		}

		// Check if this is part of an active request
		const requestTracker = requestOrStreamId
			? state.activeRequests.get(requestOrStreamId)
			: null;

		if (requestTracker) {
			// Special handling for text handlers in non-streaming context (though less common)
			if (processorName === 'builtin:text') {
				const lastHandler =
					requestTracker.handlers[requestTracker.handlers.length - 1];

				// If the last handler is also a text handler, merge them
				if (lastHandler && lastHandler.processorName === 'builtin:text') {
					// Combine the text content
					const existingContent =
						'content' in lastHandler.handledObject
							? String(lastHandler.handledObject.content)
							: '';
					const newContent = 'content' in obj ? String(obj.content) : '';
					lastHandler.handledObject = {
						type: 'text',
						content: existingContent + newContent,
					} as StructuredResponseType;
					return;
				}
			}

			// Add to request's handler list
			requestTracker.handlers.push(handlerInfo);
			return;
		}

		// If no active request/stream, create a new request tracker
		// This happens for non-streaming requests
		if (requestOrStreamId) {
			const newTracker: RequestTracker = {
				requestId: requestOrStreamId,
				startTime: new Date(),
				handlers: [handlerInfo],
			};
			const newActiveRequests = new Map(state.activeRequests);
			newActiveRequests.set(requestOrStreamId, newTracker);
			set({ activeRequests: newActiveRequests });
		}
	},

	clearDebugLogs: () => set({ agentConnectionLogs: [] }),

	setDebugEnabled: (enabled) => set({ isDebugEnabled: enabled }),

	setMaxLogs: (max) => set({ maxLogs: max }),

	toggleSectionCollapse: (stateKey, section) => {
		const state = get();
		const currentCollapsed =
			state.collapsedSections[stateKey]?.[section] || false;

		set((state) => ({
			collapsedSections: {
				...state.collapsedSections,
				[stateKey]: {
					...state.collapsedSections[stateKey],
					[section]: !currentCollapsed,
				},
			},
		}));
	},

	setSectionCollapse: (stateKey, section, collapsed) => {
		set((state) => ({
			collapsedSections: {
				...state.collapsedSections,
				[stateKey]: {
					...state.collapsedSections[stateKey],
					[section]: collapsed,
				},
			},
		}));
	},

	initializeSectionCollapse: (stateKey, hasDiffStates) => {
		const state = get();

		// Only initialize if not already set for this state
		if (!state.collapsedSections[stateKey]) {
			set((state) => ({
				collapsedSections: {
					...state.collapsedSections,
					[stateKey]: {
						// Collapse registered state by default if diff states are present
						registeredState: hasDiffStates,
						// Keep diff state expanded by default when present
						diffState: false,
					},
				},
			}));
		}
	},
});

import type { StateCreator } from 'zustand';
import type { CedarStore } from '@/store/CedarOSTypes';
import { getProviderImplementation } from '@/store/agentConnection/providers/index';
import type {
	AISDKParams,
	AISDKStructuredParams,
	AnthropicParams,
	BaseParams,
	CustomParams,
	LLMResponse,
	MastraParams,
	OpenAIParams,
	ProviderConfig,
	StreamHandler,
	StreamResponse,
	StructuredParams,
	VoiceParams,
	VoiceLLMResponse,
	ResponseProcessor,
	ResponseProcessorRegistry,
	StructuredResponseType,
} from '@/store/agentConnection/AgentConnectionTypes';
import { useCedarStore } from '@/store/CedarStore';
import { getCedarState } from '@/store/CedarStore';
import { sanitizeJson } from '@/utils/sanitizeJson';
import {
	defaultResponseProcessors,
	initializeResponseProcessorRegistry,
} from './responseProcessors/initializeResponseProcessorRegistry';

// Parameters for sending a message
export interface SendMessageParams {
	model?: string;
	systemPrompt?: string;
	route?: string;
	temperature?: number;
	// Optional conversation/thread ID
	conversationId?: string;
	threadId?: string;
	userId?: string;
	// Enable streaming responses
	stream?: boolean;
	[key: string]: any;
}

// Helper type to get params based on provider config
type GetParamsForConfig<T> = T extends { provider: 'openai' }
	? OpenAIParams
	: T extends { provider: 'anthropic' }
	? AnthropicParams
	: T extends { provider: 'mastra' }
	? MastraParams
	: T extends { provider: 'ai-sdk' }
	? AISDKParams
	: T extends { provider: 'custom' }
	? CustomParams
	: BaseParams;

export interface AgentConnectionSlice {
	// State
	isConnected: boolean;
	isStreaming: boolean;
	providerConfig: ProviderConfig | null;
	currentAbortController: AbortController | null;
	responseProcessors: ResponseProcessorRegistry;

	// Core methods - properly typed based on current provider config
	callLLM: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T>
			: ProviderConfig extends infer U
			? GetParamsForConfig<U>
			: never
	) => Promise<LLMResponse>;

	callLLMStructured: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T> & StructuredParams
			: ProviderConfig extends infer U
			? GetParamsForConfig<U> & StructuredParams
			: never
	) => Promise<LLMResponse>;

	streamLLM: <T extends ProviderConfig = ProviderConfig>(
		params: T extends ProviderConfig
			? GetParamsForConfig<T>
			: ProviderConfig extends infer U
			? GetParamsForConfig<U>
			: never,
		handler: StreamHandler
	) => StreamResponse;

	// Voice LLM method
	voiceLLM: (params: VoiceParams) => Promise<VoiceLLMResponse>;

	// High-level methods that use callLLM/streamLLM
	sendMessage: (params?: SendMessageParams) => Promise<void>;
	handleLLMResponse: (
		items: (string | StructuredResponseType)[]
	) => Promise<void>;

	// Response processor methods
	registerResponseProcessor: <T extends StructuredResponseType>(
		processor: ResponseProcessor<T>
	) => void;
	getResponseProcessors: (type: string) => ResponseProcessor | undefined;
	processStructuredResponse: (obj: StructuredResponseType) => Promise<boolean>;

	// Configuration methods
	setProviderConfig: (config: ProviderConfig) => void;

	// Connection management
	connect: () => Promise<void>;
	disconnect: () => void;

	// Utility methods
	cancelStream: () => void;
}

// Create a typed version of the slice that knows about the provider
export type TypedAgentConnectionSlice<T extends ProviderConfig> = Omit<
	AgentConnectionSlice,
	'callLLM' | 'streamLLM' | 'callLLMStructured' | 'voiceLLM'
> & {
	callLLM: (params: GetParamsForConfig<T>) => Promise<LLMResponse>;
	callLLMStructured: (
		params: GetParamsForConfig<T> & StructuredParams
	) => Promise<LLMResponse>;
	streamLLM: (
		params: GetParamsForConfig<T>,
		handler: StreamHandler
	) => StreamResponse;
	voiceLLM: (params: VoiceParams) => Promise<VoiceLLMResponse>;
};

export const createAgentConnectionSlice: StateCreator<
	CedarStore,
	[],
	[],
	AgentConnectionSlice
> = (set, get) => ({
	// Default state
	isConnected: false,
	isStreaming: false,
	providerConfig: null,
	currentAbortController: null,
	responseProcessors: initializeResponseProcessorRegistry(
		defaultResponseProcessors as ResponseProcessor<StructuredResponseType>[]
	),

	// Core methods with runtime type checking
	callLLM: async (
		params:
			| OpenAIParams
			| AnthropicParams
			| MastraParams
			| AISDKParams
			| CustomParams
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				break;
		}

		// Log the request
		const requestId = get().logAgentRequest(params, config.provider);

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			// We need to use unknown here as an intermediate type for the complex union types
			const response = await provider.callLLM(
				params as unknown as never,
				config as never
			);

			// Log the successful response
			get().logAgentResponse(requestId, response);

			return response;
		} catch (error) {
			// Log the error
			get().logAgentError(requestId, error as Error);
			throw error;
		}
	},

	callLLMStructured: async (
		params:
			| (OpenAIParams & StructuredParams)
			| (AnthropicParams & StructuredParams)
			| (MastraParams & StructuredParams)
			| (AISDKParams & AISDKStructuredParams)
			| (CustomParams & StructuredParams)
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				// For AI SDK, validate that schema is a Zod schema at runtime
				if (
					params.schema &&
					typeof params.schema === 'object' &&
					!('_def' in params.schema)
				) {
					throw new Error(
						'AI SDK requires a Zod schema for structured output. Please provide a valid Zod schema.'
					);
				}
				break;
		}

		// Log the request
		const requestId = get().logAgentRequest(params, config.provider);

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			const response = await provider.callLLMStructured(
				params as unknown as never,
				config as never
			);

			// Log the successful response
			get().logAgentResponse(requestId, response);

			return response;
		} catch (error) {
			// Log the error
			get().logAgentError(requestId, error as Error);
			throw error;
		}
	},

	streamLLM: (
		params:
			| OpenAIParams
			| AnthropicParams
			| MastraParams
			| AISDKParams
			| CustomParams,
		handler: StreamHandler
	) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		// Runtime validation based on provider type
		switch (config.provider) {
			case 'openai':
			case 'anthropic':
				if (!('model' in params)) {
					throw new Error(
						`${config.provider} provider requires 'model' parameter`
					);
				}
				break;
			case 'mastra':
				if (!('route' in params)) {
					throw new Error("Mastra provider requires 'route' parameter");
				}
				break;
			case 'ai-sdk':
				if (!('model' in params)) {
					throw new Error("AI SDK provider requires 'model' parameter");
				}
				break;
		}

		// Log the stream start
		const streamId = get().logStreamStart(params, config.provider);

		const provider = getProviderImplementation(config);
		const abortController = new AbortController();

		set({ currentAbortController: abortController, isStreaming: true });

		// Wrap the handler to log stream events
		const wrappedHandler: StreamHandler = (event) => {
			if (event.type === 'chunk') {
				get().logStreamChunk(streamId, event.content);
			} else if (event.type === 'done') {
				get().logStreamEnd(streamId, event.completedItems);
			} else if (event.type === 'error') {
				get().logAgentError(streamId, event.error);
			} else if (event.type === 'object') {
				get().logStreamObject(streamId, event.object);
			}
			handler(event);
		};

		// Wrap the provider's streamLLM to handle state updates
		// Type assertion is safe after runtime validation
		// We need to use unknown here as an intermediate type for the complex union types
		const originalResponse = provider.streamLLM(
			params as unknown as never,
			config as never,
			wrappedHandler
		);

		// Wrap the completion to update state when done
		const wrappedCompletion = originalResponse.completion.finally(() => {
			set({ isStreaming: false, currentAbortController: null });
		});

		return {
			abort: () => {
				originalResponse.abort();
				abortController.abort();
			},
			completion: wrappedCompletion,
		};
	},

	// Voice LLM method
	voiceLLM: async (params: VoiceParams) => {
		const config = get().providerConfig;
		if (!config) {
			throw new Error('No LLM provider configured');
		}

		try {
			const provider = getProviderImplementation(config);
			// Type assertion is safe after runtime validation
			const response = await provider.voiceLLM(
				params as unknown as never,
				config as never
			);

			return response;
		} catch (error) {
			throw error;
		}
	},

	// Handle LLM response
	handleLLMResponse: async (itemsToProcess) => {
		const state = get();

		for (const item of itemsToProcess) {
			if (typeof item === 'string') {
				// Handle text content - append to latest message
				state.appendToLatestMessage(item, !state.isStreaming);
			} else if (item && typeof item === 'object') {
				const structuredResponse = item;

				// Try to process with registered response processors (including defaults)
				const processed = await state.processStructuredResponse(
					structuredResponse
				);

				if (!processed) {
					// No processor handled this response, log it and add it to the chat
					state.addMessage({
						role: 'bot',
						...structuredResponse,
					});
				}
			}
		}
	},

	// Response processor methods
	registerResponseProcessor: <T extends StructuredResponseType>(
		processor: ResponseProcessor<T>
	) => {
		set((state) => {
			const type = processor.type;

			const entry: ResponseProcessor<T> = {
				...processor,
			};

			const existing = state.responseProcessors[type] as
				| ResponseProcessor
				| undefined;

			// Replace if no existing
			if (!existing) {
				return {
					responseProcessors: {
						...state.responseProcessors,
						[type]: entry,
					} as ResponseProcessorRegistry,
				};
			}

			return {};
		});
	},

	getResponseProcessors: (type: string) => {
		return get().responseProcessors[type];
	},

	processStructuredResponse: async (obj) => {
		const state = get();

		if (!obj.type || typeof obj.type !== 'string') {
			return false;
		}

		const processor = state.getResponseProcessors(obj.type);

		if (!processor) {
			return false;
		}

		// Validate if needed
		if (processor.validate && !processor.validate(obj)) {
			return false;
		}

		try {
			await processor.execute(obj as StructuredResponseType, state);
			return true;
		} catch (error) {
			console.error(
				`Error executing response processor for type ${obj.type}:`,
				error
			);
			return false;
		}
	},

	sendMessage: async (params?: SendMessageParams) => {
		const { model, systemPrompt, route, temperature, stream } = params || {};
		const state = get();

		// Set processing state
		state.setIsProcessing(true);

		try {
			// Step 1: Get the stringified chatInput & additionalContext
			const editorContent = state.stringifyEditor();
			const fullContext = state.stringifyInputContext();

			// Step 2: Unify it into a single string to send to the LLM
			const unifiedMessage = fullContext;

			// Step 3: Add the stringified chatInputContent as a message from the user
			state.addMessage({
				role: 'user' as const,
				type: 'text' as const,
				content: editorContent,
			});

			// Clear the chat specific contextEntries (mentions)
			state.clearMentions();

			// Step 4: Build params based on provider type
			const config = state.providerConfig;
			if (!config) {
				throw new Error('No provider configured');
			}

			let llmParams: BaseParams = {
				prompt: unifiedMessage,
				systemPrompt,
				temperature,
			};

			const threadId = params?.threadId || get().messageCurrentThreadId;
			const userId = params?.userId || getCedarState('userId');

			// Add provider-specific params
			switch (config.provider) {
				case 'openai':
				case 'anthropic':
					llmParams = { ...llmParams, model: model || 'gpt-4o-mini' };
					break;
				case 'mastra':
					const chatPath = config.chatPath || '/chat';

					llmParams = {
						...llmParams,
						// we're overriding the prompt since we pass in additionalContext as a raw object.
						prompt: editorContent,
						additionalContext: sanitizeJson(state.additionalContext),
						route: route || `${chatPath}`,
						resourceId: userId,
						threadId,
					};
					break;
				case 'ai-sdk':
					llmParams = { ...llmParams, model: model || 'openai/gpt-4o-mini' };
					break;
				case 'custom':
					llmParams = {
						...llmParams,
						prompt: editorContent,
						additionalContext: sanitizeJson(state.additionalContext),
						userId,
						threadId,
					};
					break;
			}

			// Step 5: Make the LLM call (streaming and non-streaming branches)
			if (stream) {
				// Capture current message count so we know which ones are new during the stream
				const startIdx = get().messages.length;

				const streamResponse = state.streamLLM(llmParams, async (event) => {
					switch (event.type) {
						case 'chunk':
							// Process single text chunk as array of one
							await state.handleLLMResponse([event.content]);
							break;
						case 'object':
							// Process single object as array of one
							await state.handleLLMResponse([event.object]);
							break;
						case 'done':
							// Stream completed - no additional processing needed
							break;
						case 'error':
							console.error('Stream error:', event.error);
							break;
					}
				});

				// Wait for stream to complete
				await streamResponse.completion;

				// Persist any new messages added during the stream (from startIdx onwards)
				const newMessages = get().messages.slice(startIdx);
				for (const m of newMessages) {
					await state.persistMessageStorageMessage(m);
				}
			} else {
				// Non-streaming approach – call the LLM and process all items at once
				const response = await state.callLLM(llmParams);

				// Process response content as array of one
				if (response.content) {
					await state.handleLLMResponse([response.content]);
				}

				// Process structured output if present
				if (response.object) {
					await state.handleLLMResponse(
						Array.isArray(response.object) ? response.object : [response.object]
					);
				}
			}

			// Clear the chat input content after successful send
			state.setChatInputContent({
				type: 'doc',
				content: [{ type: 'paragraph', content: [] }],
			});
		} catch (error) {
			console.error('Error sending message:', error);
			state.addMessage({
				role: 'assistant' as const,
				type: 'text' as const,
				content: 'An error occurred while sending your message.',
			});
		} finally {
			state.setIsProcessing(false);
		}
	},

	// Configuration methods
	setProviderConfig: (config) => {
		set({ providerConfig: config });

		// If it's a Mastra provider with a voiceRoute, update the voice endpoint
		if (config.provider === 'mastra' && config.voiceRoute) {
			const voiceEndpoint = `${config.baseURL}${config.voiceRoute}`;
			get().updateVoiceSettings({ endpoint: voiceEndpoint });
		}
	},

	// Connection management
	connect: async () => {
		// Provider-specific connection logic can be added here
		set({ isConnected: true });
	},

	disconnect: () => {
		const state = get();
		state.cancelStream();
		set({ isConnected: false });
	},

	// Utility methods
	cancelStream: () => {
		const { currentAbortController } = get();
		if (currentAbortController) {
			currentAbortController.abort();
		}
	},
});

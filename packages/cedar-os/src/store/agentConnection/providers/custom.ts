import type {
	CustomParams,
	ProviderImplementation,
	InferProviderConfig,
} from '@/store/agentConnection/AgentConnectionTypes';

type CustomConfig = InferProviderConfig<'custom'>;

// Custom provider implementation that uses the functions provided in the config
export const customProvider: ProviderImplementation<
	CustomParams,
	CustomConfig
> = {
	callLLM: async (params, config) => {
		// Use the callLLM function from the config
		if (config.config.callLLM) {
			return await config.config.callLLM(params, config);
		}

		throw new Error('Custom provider requires a callLLM function in config');
	},

	callLLMStructured: async (params, config) => {
		// Use the callLLMStructured function from the config
		if (config.config.callLLMStructured) {
			return await config.config.callLLMStructured(params, config);
		}

		// Fallback to regular callLLM if structured version not provided
		if (config.config.callLLM) {
			return await config.config.callLLM(params, config);
		}

		throw new Error(
			'Custom provider requires a callLLMStructured function or callLLM function in config'
		);
	},

	streamLLM: (params, config, handler) => {
		// Use the streamLLM function from the config
		if (config.config.streamLLM) {
			return config.config.streamLLM(params, config, handler);
		}

		// Fallback to non-streaming callLLM
		if (config.config.callLLM) {
			const abortController = new AbortController();

			const completion = (async () => {
				try {
					const response = await config.config.callLLM!(params, config);
					handler({ type: 'chunk', content: response.content || '' });
					handler({ type: 'done', completedItems: [response.content || ''] });
				} catch (error) {
					handler({ type: 'error', error: error as Error });
				}
			})();

			return {
				abort: () => abortController.abort(),
				completion,
			};
		}

		throw new Error(
			'Custom provider requires a streamLLM function or callLLM function in config'
		);
	},

	voiceLLM: async (params, config) => {
		// Use the voiceLLM function from the config if available
		if (config.config.voiceLLM) {
			return await config.config.voiceLLM(params, config);
		}

		// Default implementation - return empty response
		return {
			content: '',
		};
	},

	handleResponse: async (response) => {
		// Default response handler - custom providers should handle responses in their own functions
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return {
			content: data.content || data.message || '',
			usage: data.usage,
			metadata: data.metadata || {},
		};
	},
};

import type {
	ResponseProcessor,
	ResponseProcessorRegistry,
} from '@/store/agentConnection/AgentConnectionTypes';
import { setStateResponseProcessor } from '@/store/agentConnection/responseProcessors/setStateResponseProcessor';
import { legacyActionResponseProcessor } from '@/store/agentConnection/responseProcessors/legacyActionResponseProcessor';
import { messageResponseProcessor } from '@/store/agentConnection/responseProcessors/messageResponseProcessor';
import { progressUpdateResponseProcessor } from '@/store/agentConnection/responseProcessors/progressUpdateResponseProcessor';
import { humanInTheLoopResponseProcessor } from '@/store/agentConnection/responseProcessors/humanInTheLoopResponseProcessor';

export const defaultResponseProcessors = [
	messageResponseProcessor,
	setStateResponseProcessor,
	legacyActionResponseProcessor, // Backwards compatibility for 'action' type
	progressUpdateResponseProcessor,
	humanInTheLoopResponseProcessor, // Human-in-the-loop workflow support
];

// Helper function to initialize processor registry with defaults
export const initializeResponseProcessorRegistry = (
	processors: ResponseProcessor[]
): ResponseProcessorRegistry => {
	const registry: ResponseProcessorRegistry = {};

	processors.forEach((processor) => {
		const existing = registry[processor.type];

		// If no existing, replace
		if (!existing) {
			registry[processor.type] = processor;
		}
	});

	return registry;
};

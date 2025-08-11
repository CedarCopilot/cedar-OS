import type {
	ResponseProcessor,
	ResponseProcessorRegistry,
} from '@/store/agentConnection/types';
import { actionResponseProcessor } from '@/store/agentConnection/responseProcessors/actionResponseProcessor';
import { messageResponseProcessor } from '@/store/agentConnection/responseProcessors/messageProcessor';

export const defaultResponseProcessors = [
	messageResponseProcessor,
	actionResponseProcessor,
];

// Helper function to initialize processor registry with defaults
export const initializeResponseProcessorRegistry = (
	processors: ResponseProcessor[]
): ResponseProcessorRegistry => {
	const registry: ResponseProcessorRegistry = {};

	processors.forEach((processor) => {
		const entry: ResponseProcessor = {
			...processor,
			priority: processor.priority ?? 0,
		};

		if (!registry[processor.type]) {
			registry[processor.type] = [];
		}
		registry[processor.type].push(entry);
	});

	// Sort each type's processors by priority (highest first)
	Object.keys(registry).forEach((type) => {
		registry[type].sort((a, b) => (b.priority || 0) - (a.priority || 0));
	});

	return registry;
};

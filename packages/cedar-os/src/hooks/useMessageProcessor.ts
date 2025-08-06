import { useCedarStore } from '@/store/CedarStore';
import type { Message, MessageProcessor } from '@/store/messages/types';
import { useEffect, useMemo } from 'react';

/**
 * Hook to register a message processor with the Cedar store
 * @param config - The message processor configuration
 */
export function useMessageProcessor<T extends Message>(
	config: MessageProcessor<T>
) {
	const registerMessageProcessor = useCedarStore(
		(s) => s.registerMessageProcessor
	);
	const unregisterMessageProcessor = useCedarStore(
		(s) => s.unregisterMessageProcessor
	);

	// Memoize the processor configuration to prevent unnecessary re-registrations
	const processor = useMemo<MessageProcessor<T>>(
		() => ({ ...config }),
		[config]
	);

	useEffect(() => {
		// Register the processor
		registerMessageProcessor(processor);

		// Cleanup on unmount
		return () => {
			unregisterMessageProcessor(processor.type, processor.namespace);
		};
	}, [processor, registerMessageProcessor, unregisterMessageProcessor]);
}

/**
 * Hook to register multiple message processors at once
 * @param configs - Array of message processor configurations
 */
export function useMessageProcessors<T extends Message>(
	configs: MessageProcessor<T>[]
) {
	const registerMessageProcessors = useCedarStore(
		(s) => s.registerMessageProcessors
	);
	const unregisterMessageProcessor = useCedarStore(
		(s) => s.unregisterMessageProcessor
	);

	// Memoize the processors to prevent unnecessary re-registrations
	const processors = useMemo<MessageProcessor<T>[]>(() => {
		return configs.map((config) => ({ ...config }));
	}, [configs]);

	useEffect(() => {
		// Register all processors
		registerMessageProcessors(processors);

		// Cleanup on unmount
		return () => {
			processors.forEach((processor) => {
				unregisterMessageProcessor(processor.type, processor.namespace);
			});
		};
	}, [processors, registerMessageProcessors, unregisterMessageProcessor]);
}

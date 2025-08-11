import { useCedarStore } from '@/store/CedarStore';
import type {
	ResponseProcessor,
	StructuredResponseType,
} from '@/store/agentConnection/types';
import { useEffect, useMemo } from 'react';

/**
 * Hook to register a response processor with the Cedar store
 * @param config - The response processor configuration
 */
export function useResponseProcessor<T extends StructuredResponseType>(
	config: ResponseProcessor<T>
) {
	const registerResponseProcessor = useCedarStore(
		(s) => s.registerResponseProcessor
	);

	// Memoize the processor configuration to prevent unnecessary re-registrations
	const processor = useMemo<ResponseProcessor<T>>(
		() => ({ ...config }),
		[config]
	);

	useEffect(() => {
		// Register the processor
		registerResponseProcessor(processor);
	}, [processor, registerResponseProcessor]);
}

/**
 * Hook to register multiple response processors at once
 * @param configs - Array of response processor configurations
 */
export function useResponseProcessors<T extends StructuredResponseType>(
	configs: ResponseProcessor<T>[]
) {
	const registerResponseProcessor = useCedarStore(
		(s) => s.registerResponseProcessor
	);

	// Memoize the processors to prevent unnecessary re-registrations
	const processors = useMemo<ResponseProcessor<T>[]>(() => {
		return configs.map((config) => ({ ...config }));
	}, [configs]);

	useEffect(() => {
		// Register all processors
		processors.forEach((processor) => {
			registerResponseProcessor(processor);
		});
	}, [processors, registerResponseProcessor]);
}

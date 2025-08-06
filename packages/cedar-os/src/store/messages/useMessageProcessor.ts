import { useCedarStore } from '@/store/CedarStore';
import type {
	Message,
	MessageProcessor,
	ActionMessage,
	MessageProcessorRender,
	MessageProcessorExecute,
} from '@/store/messages/types';
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

/**
 * Hook to create and register an ActionMessage processor in one step.
 * Accepts the same config object as createActionMessageProcessor (minus type).
 */
export function useActionMessageProcessor<T extends ActionMessage>(
	config: Parameters<typeof createActionMessageProcessor<T>>[0]
) {
	const processor = useMemo(
		() => createActionMessageProcessor<T>(config),
		[config]
	);

	useMessageProcessor<T>(processor);
}

/**
 * Convenience helper to create a MessageProcessor for ActionMessage sub-types.
 *
 * @example
 * const addNodeProcessor = createActionMessageProcessor<AddNodeMessage>({
 *   namespace: 'roadmap',
 *   priority: 10,
 *   execute: (msg, store) => {
 *     // business logic
 *   },
 *   render: ({ message }) => <AddNodeComponent msg={message} />,
 *   // Optional – automatically limits to setterKey === 'addNode'
 *   setterKey: 'addNode',
 * });
 */
export function createActionMessageProcessor<T extends ActionMessage>(config: {
	namespace?: string;
	priority?: number;
	/** Optional setterKey. If provided the processor only handles msgs with this key */
	setterKey?: string;
	execute?: MessageProcessorExecute<T>;
	render?: MessageProcessorRender<T>;
	validate?: (msg: Message) => msg is T; // custom validator override
}): MessageProcessor<T> {
	const {
		namespace,
		priority = 0,
		setterKey,
		execute,
		render,
		validate,
	} = config;

	const defaultValidate = (msg: Message): msg is T => {
		if (msg.type !== 'action') return false;
		if (setterKey && (msg as ActionMessage).setterKey !== setterKey)
			return false;
		return true;
	};

	return {
		type: 'action',
		namespace,
		priority,
		execute: execute as MessageProcessorExecute<T>,
		render: render as MessageProcessorRender<T>,
		validate: validate ?? defaultValidate,
	};
}

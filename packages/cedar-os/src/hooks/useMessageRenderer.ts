import { useCedarStore } from '@/store/CedarStore';
import type { Message, MessageRenderer } from '@/store/messages/types';
import { useEffect, useMemo } from 'react';

/**
 * Hook to register a message renderer with the Cedar store
 * @param config - The message renderer configuration
 */
export function useMessageRenderer<T extends Message>(
	config: MessageRenderer<T>
) {
	const registerMessageRenderer = useCedarStore(
		(s) => s.registerMessageRenderer
	);
	const unregisterMessageRenderer = useCedarStore(
		(s) => s.unregisterMessageRenderer
	);

	// Memoize the config to prevent unnecessary re-registrations
	const rendererConfig = useMemo<MessageRenderer<T>>(
		() => ({ ...config }),
		[config]
	);

	useEffect(() => {
		// Register the renderer with full config
		registerMessageRenderer(rendererConfig);

		// Cleanup on unmount
		return () => {
			unregisterMessageRenderer(rendererConfig.type, rendererConfig.namespace);
		};
	}, [rendererConfig, registerMessageRenderer, unregisterMessageRenderer]);
}

/**
 * Hook to register multiple message renderers at once
 * @param configs - Array of message renderer configurations
 */
export function useMessageRenderers<T extends Message = Message>(
	configs: MessageRenderer<T>[]
) {
	const registerMessageRenderer = useCedarStore(
		(s) => s.registerMessageRenderer
	);
	const unregisterMessageRenderer = useCedarStore(
		(s) => s.unregisterMessageRenderer
	);

	// Memoize the configs to prevent unnecessary re-registrations
	const rendererConfigs = useMemo(() => {
		return configs.map((config) => ({ ...config }));
	}, [configs]);

	useEffect(() => {
		// Register all renderers with full configs
		rendererConfigs.forEach((config) => {
			registerMessageRenderer(config);
		});

		// Cleanup on unmount
		return () => {
			rendererConfigs.forEach((config) => {
				unregisterMessageRenderer(config.type, config.namespace);
			});
		};
	}, [rendererConfigs, registerMessageRenderer, unregisterMessageRenderer]);
}

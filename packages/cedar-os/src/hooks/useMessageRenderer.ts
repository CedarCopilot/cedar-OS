import { useCedarStore } from '@/store/CedarStore';
import type {
	BaseMessage,
	MessageRendererConfig,
} from '@/store/messages/types';
import React, { useEffect, useMemo } from 'react';

/**
 * Hook to register a message renderer with the Cedar store
 * @param config - The message renderer configuration
 */
export function useMessageRenderer<T extends BaseMessage = BaseMessage>(
	config: MessageRendererConfig<T>
) {
	const registerMessageRenderer = useCedarStore(
		(s) => s.registerMessageRenderer
	);
	const unregisterMessageRenderer = useCedarStore(
		(s) => s.unregisterMessageRenderer
	);

	// Memoize the renderer function to prevent unnecessary re-creations
	const renderer = useMemo(() => {
		// Wrap the component to match the MessageRenderer signature
		return (message: any) => {
			const Component = config.renderer;
			return React.createElement(Component, { message });
		};
	}, [config.renderer]);

	// Extract stable values from config
	const type = config.type;
	const priority = config.priority;
	const validateMessage = config.validateMessage;

	useEffect(() => {
		// Register the renderer
		registerMessageRenderer(type, renderer);

		// Cleanup on unmount
		return () => {
			unregisterMessageRenderer(type);
		};
	}, [type, renderer, registerMessageRenderer, unregisterMessageRenderer]);
}

/**
 * Hook to register multiple message renderers at once
 * @param configs - Array of message renderer configurations
 */
export function useMessageRenderers(configs: MessageRendererConfig<any>[]) {
	const registerMessageRenderer = useCedarStore(
		(s) => s.registerMessageRenderer
	);
	const unregisterMessageRenderer = useCedarStore(
		(s) => s.unregisterMessageRenderer
	);

	// Memoize the renderers to prevent unnecessary re-creations
	const renderers = useMemo(() => {
		return configs.map((config) => ({
			type: config.type,
			renderer: (message: any) => {
				const Component = config.renderer;
				return React.createElement(Component, { message });
			},
		}));
	}, [configs]);

	useEffect(() => {
		// Register all renderers
		renderers.forEach(({ type, renderer }) => {
			registerMessageRenderer(type, renderer);
		});

		// Cleanup on unmount
		return () => {
			renderers.forEach(({ type }) => {
				unregisterMessageRenderer(type);
			});
		};
	}, [renderers, registerMessageRenderer, unregisterMessageRenderer]);
}

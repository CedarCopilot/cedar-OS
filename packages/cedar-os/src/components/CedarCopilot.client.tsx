'use client';

import { useCedarStore } from '@/store/CedarStore';
import type {
	ProviderConfig,
	ResponseProcessor,
} from '@/store/agentConnection/AgentConnectionTypes';
import type { MessageRenderer } from '@/store/messages/MessageTypes';
import { MessageStorageConfig } from '@/store/messages/messageStorage';
import { useCedarState } from '@/store/stateSlice/useCedarState';
import type { VoiceState } from '@/store/voice/voiceSlice';
import React, { useEffect } from 'react';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
	messageStorage?: MessageStorageConfig;
	voiceSettings?: Partial<VoiceState['voiceSettings']>;
	responseProcessors?: ResponseProcessor[];
	messageRenderers?: MessageRenderer[];
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
	messageStorage,
	voiceSettings,
	responseProcessors = [],
	messageRenderers = [],
}: CedarCopilotProps) {
	// Voice settings
	const updateVoiceSettings = useCedarStore(
		(state) => state.updateVoiceSettings
	);

	useEffect(() => {
		if (voiceSettings) {
			updateVoiceSettings(voiceSettings);
		}
	}, [voiceSettings, updateVoiceSettings]);

	// LLM provider
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);
	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	// User ID
	const [, setCedarUserId] = useCedarState<string>('userId', userId ?? '');
	useEffect(() => {
		if (userId !== null) {
			setCedarUserId(userId);
		}
	}, [userId, setCedarUserId]);

	// Message storage
	useEffect(() => {
		if (messageStorage) {
			useCedarStore.getState().setMessageStorageAdapter(messageStorage);
			useCedarStore.getState().loadMessageStorageThreads?.();
			useCedarStore.getState().loadMessageStorageMessages?.();
		}
	}, [messageStorage]);

	// Response processors
	useEffect(() => {
		const store = useCedarStore.getState();

		responseProcessors.forEach((processor) => {
			store.registerResponseProcessor(processor as ResponseProcessor);
		});
	}, [responseProcessors]);

	// Message renderers
	useEffect(() => {
		const store = useCedarStore.getState();

		messageRenderers.forEach((renderer) => {
			store.registerMessageRenderer(renderer as MessageRenderer);
		});

		// Cleanup on unmount
		return () => {
			messageRenderers.forEach((renderer) => {
				store.unregisterMessageRenderer(renderer.type, renderer.namespace);
			});
		};
	}, [messageRenderers]);

	console.log('CedarCopilot', {
		userId,
		llmProvider,
		voiceSettings,
		messageStorage,
		responseProcessors,
		messageRenderers,
	});

	return <>{children}</>;
}

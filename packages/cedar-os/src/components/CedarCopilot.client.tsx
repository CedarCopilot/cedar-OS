'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type {
	ProviderConfig,
	ResponseProcessor,
} from '@/store/agentConnection/AgentConnectionTypes';
import type { MessageRenderer } from '@/store/messages/MessageTypes';
import { MessageStorageConfig } from '@/store/messages/messageStorage';
import type { VoiceState } from '@/store/voice/voiceSlice';
import { useCedarState } from '@/store/stateSlice/useCedarState';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	threadId?: string | null;
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
	threadId = null,
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

	// ─── userId ────────────────────────────────────────────────
	const [cedarUserId, setCedarUserId] = useCedarState<string>({
		key: 'userId',
		initialValue: userId ?? '',
	});

	useEffect(() => {
		if (userId !== null) {
			setCedarUserId(userId);
		}
	}, [userId, setCedarUserId]);

	// ─── threadId ──────────────────────────────────────────────
	const [cedarThreadId, setCedarThreadId] = useCedarState<string>({
		key: 'threadId',
		initialValue: threadId ?? '',
	});

	useEffect(() => {
		if (threadId !== null) {
			setCedarThreadId(threadId);
		}
	}, [threadId, setCedarThreadId]);

	useEffect(() => {
		useCedarStore.getState().initializeChat?.({
			userId: cedarUserId,
			threadId: cedarThreadId,
		});
	}, [cedarUserId, cedarThreadId]);

	// Combined message storage initialization and updates
	useEffect(() => {
		if (!messageStorage) return;
		useCedarStore.getState().setMessageStorageAdapter(messageStorage);
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
		threadId,
		llmProvider,
		voiceSettings,
		messageStorage,
		responseProcessors,
		messageRenderers,
	});

	return <>{children}</>;
}

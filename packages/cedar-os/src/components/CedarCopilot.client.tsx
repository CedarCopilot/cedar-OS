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
	// Thread management through messagesSlice
	const switchThread = useCedarStore((state) => state.switchThread);

	// Initialize thread if provided
	useEffect(() => {
		if (threadId) {
			// This will create the thread if it doesn't exist
			switchThread(threadId);
		}
	}, [threadId, switchThread]);

	// Initialize chat - only run when userId or explicit threadId changes
	// Using refs to track initialization state and previous threadId
	const hasInitializedRef = React.useRef(false);
	const previousThreadIdRef = React.useRef<string | null>(threadId);

	useEffect(() => {
		const threadIdChanged = previousThreadIdRef.current !== threadId;

		// Only initialize if we have a userId and either:
		// 1. Haven't initialized yet, or
		// 2. The threadId has actually changed
		if (cedarUserId && (!hasInitializedRef.current || threadIdChanged)) {
			// Call initializeChat and only mark as initialized after success
			useCedarStore
				.getState()
				.initializeChat?.({
					userId: cedarUserId,
					threadId: threadId,
				})
				.then(() => {
					// Only mark as initialized after successful completion
					hasInitializedRef.current = true;
					previousThreadIdRef.current = threadId;
				})
				.catch((error) => {
					// Log error but don't mark as initialized so it can retry
					console.error('Failed to initialize chat:', error);
				});
		}
	}, [cedarUserId, threadId]);

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

	return <>{children}</>;
}

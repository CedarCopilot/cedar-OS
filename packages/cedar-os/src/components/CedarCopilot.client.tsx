'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type { ProviderConfig } from '@/store/agentConnection/types';
import { useCedarState } from '@/store/stateSlice/useCedarState';
import { MessageStorageConfig } from '@/store/messages/messageStorage';
import type { VoiceState } from '@/store/voice/voiceSlice';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
	messageStorage?: MessageStorageConfig;
	voiceSettings?: Partial<VoiceState['voiceSettings']>;
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
	messageStorage,
	voiceSettings,
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

	console.log('CedarCopilot', {
		userId,
		llmProvider,
		voiceSettings,
		messageStorage,
	});

	return <>{children}</>;
}

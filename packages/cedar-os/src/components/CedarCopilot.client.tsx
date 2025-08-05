'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type { ProviderConfig } from '@/store/agentConnection/types';
import type { VoiceState } from '@/store/voice/voiceSlice';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
	voiceSettings?: Partial<VoiceState['voiceSettings']>;
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
	voiceSettings,
}: CedarCopilotProps) {
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);
	const updateVoiceSettings = useCedarStore(
		(state) => state.updateVoiceSettings
	);

	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	useEffect(() => {
		if (voiceSettings) {
			updateVoiceSettings(voiceSettings);
		}
	}, [voiceSettings, updateVoiceSettings]);

	console.log('CedarCopilot', { userId, llmProvider, voiceSettings });

	return <>{children}</>;
}

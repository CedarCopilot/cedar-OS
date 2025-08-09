'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type { ProviderConfig } from '@/store/agentConnection/types';
import { useCedarState } from '@/store/stateSlice/useCedarState';
import { MessageStorageConfig } from '@/store/messages/messageStorage';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
	messageStorage?: MessageStorageConfig;
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
	messageStorage,
}: CedarCopilotProps) {
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);
	const [, setCedarUserId] = useCedarState<string>('userId', userId ?? '');
	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	const setMessageStorageAdapter = useCedarStore(
		(state) => state.setMessageStorageAdapter
	);

	useEffect(() => {
		setMessageStorageAdapter(messageStorage);
	}, [messageStorage, setMessageStorageAdapter]);

	useEffect(() => {
		if (userId !== null) {
			setCedarUserId(userId);
		}
	}, [userId, setCedarUserId]);

	console.log('CedarCopilot', { userId, llmProvider });

	return <>{children}</>;
}

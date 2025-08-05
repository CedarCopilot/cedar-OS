'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type { ProviderConfig } from '@/store/agentConnection/types';
import type { StorageConfig } from '@/store/storageSlice';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
	storage?: StorageConfig;
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
	storage,
}: CedarCopilotProps) {
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);

	const setUserId = useCedarStore((state) => state.setUserId);

	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	useEffect(() => {
		if (userId !== null) {
			setUserId(userId);
		}
	}, [userId, setUserId]);

	const setStorageAdapter = useCedarStore((state) => state.setStorageAdapter);

	useEffect(() => {
		setStorageAdapter(storage);
	}, [storage, setStorageAdapter]);

	console.log('CedarCopilot', { userId, llmProvider });

	return <>{children}</>;
}

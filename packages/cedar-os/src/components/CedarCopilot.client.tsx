'use client';

import React, { useEffect } from 'react';
import { useCedarStore } from '@/store/CedarStore';
import type { ProviderConfig } from '@/store/agentConnection/types';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
}

// Client-side component with useEffect
export function CedarCopilotClient({
	children,
	userId = null,
	llmProvider,
}: CedarCopilotProps) {
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);

	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	console.log('CedarCopilot', { userId, llmProvider });

	return <>{children}</>;
}

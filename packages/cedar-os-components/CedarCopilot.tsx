'use client';

import React, { useEffect } from 'react';
import { useCedarStore, ProviderConfig } from 'cedar-os';

export interface CedarCopilotProps {
	children: React.ReactNode;
	productId?: string | null;
	userId?: string | null;
	llmProvider?: ProviderConfig;
}

// The main CedarCopilot component with Zustand store
export const CedarCopilot: React.FC<CedarCopilotProps> = ({
	children,
	userId = null,
	llmProvider,
}) => {
	const setProviderConfig = useCedarStore((state) => state.setProviderConfig);

	useEffect(() => {
		if (llmProvider) {
			setProviderConfig(llmProvider);
		}
	}, [llmProvider, setProviderConfig]);

	console.log('CedarCopilot', { userId, llmProvider });

	return <>{children}</>;
};

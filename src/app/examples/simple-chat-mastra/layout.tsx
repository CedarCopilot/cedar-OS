'use client';

import React, { ReactNode } from 'react';
import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';

export default function SimpleChatMastraLayout({
	children,
}: {
	children: ReactNode;
}) {
	const llmProvider: ProviderConfig = {
		provider: 'mastra',
		apiKey: 'not-needed-for-local',
		baseURL: process.env.NEXT_PUBLIC_MASTRA_URL || 'http://localhost:4111',
	};

	return <CedarCopilot llmProvider={llmProvider}>{children}</CedarCopilot>;
}

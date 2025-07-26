'use client';

import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';
import { ReactNode } from 'react';

export default function CedarPlaygroundLayout({
	children,
}: {
	children: ReactNode;
}) {
	const llmProvider: ProviderConfig = {
		provider: 'ai-sdk',
		providers: {
			openai: {
				apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
			},
			anthropic: {
				apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
			},
		},
	};

	return <CedarCopilot llmProvider={llmProvider}>{children}</CedarCopilot>;
}

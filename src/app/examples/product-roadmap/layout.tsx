'use client';

import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';
import { ReactNode } from 'react';

export default function ProductRoadmapLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Configure Mastra provider to connect to the local Mastra dev server
	// When you run `npm run dev` in the product_roadmap-agent directory,
	// Mastra starts a server on port 4111 by default with API endpoints
	// const llmProvider: ProviderConfig = {
	// 	provider: 'mastra',
	// 	apiKey: 'not-needed-for-local', // API key is not needed for local Mastra agent
	// 	baseURL: 'http://localhost:4111',
	// 	chatPath: '/chat/execute-function',
	// 	voiceRoute: '/chat/voice-execute',
	// };

	// const llmProvider: ProviderConfig = {
	// 	provider: 'ai-sdk',
	// 	providers: {
	// 		openai: {
	// 			apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
	// 		},
	// 	},
	// };

	const llmProvider: ProviderConfig = {
		provider: 'openai',
		apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
	};

	const voiceSettings = {
		useBrowserTTS: true,
	};

	return (
		<CedarCopilot llmProvider={llmProvider} voiceSettings={voiceSettings}>
			{children}
		</CedarCopilot>
	);
}

'use client';

import {
	CedarCopilot,
	createActionMessageRenderer,
	createMessageRenderer,
	createResponseProcessor,
} from 'cedar-os';
import type {
	ActionMessageFor,
	CustomMessage,
	CustomStructuredResponseType,
	MessageStorageConfig,
	ProviderConfig,
} from 'cedar-os';
import { ReactNode } from 'react';

export default function ProductRoadmapLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Configure Mastra provider to connect to the local Mastra dev server
	// When you run `npm run dev` in the product_roadmap-agent directory,
	// Mastra starts a server on port 4111 by default with API endpoints
	const llmProvider: ProviderConfig = {
		provider: 'mastra',
		apiKey: 'not-needed-for-local', // API key is not needed for local Mastra agent
		baseURL: 'http://localhost:4111',
		// chatPath: '/chat/execute-function',
		// voiceRoute: '/chat/voice-execute',
	};

	// const llmProvider: ProviderConfig = {
	// 	provider: 'ai-sdk',
	// 	providers: {
	// 		openai: {
	// 			apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
	// 		},
	// 	},
	// };

	const voiceSettings = {
		useBrowserTTS: true,
	};

	const localStorageConfig: MessageStorageConfig = {
		type: 'local',
		options: { key: 'cedar-test' },
	};

	type UnregisteredResponseType = CustomStructuredResponseType<
		'unregistered_event',
		{
			level: string;
		}
	>;
	const responseProcessor = createResponseProcessor<UnregisteredResponseType>({
		type: 'unregistered_event',
		execute: (obj) => {
			console.log('🔥 Unregistered event', obj);
		},
	});

	type AlertMessage = CustomMessage<
		'alert',
		{
			level: string;
		}
	>;

	const AlertMessageRenderer = createMessageRenderer<AlertMessage>({
		type: 'alert',
		render: (message) => {
			return <div>Alert: {message.level}</div>;
		},
	});

	type AddNodeActionMessage = ActionMessageFor<
		'nodes',
		'addNode',
		[{ name: string; description: string }]
	>;

	const customActionMessageRenderer =
		createActionMessageRenderer<AddNodeActionMessage>({
			render: (message) => {
				return <div>Action: {message.setterKey}</div>;
			},
		});

	return (
		<CedarCopilot
			llmProvider={llmProvider}
			voiceSettings={voiceSettings}
			messageStorage={localStorageConfig}
			responseProcessors={[responseProcessor]}
			messageRenderers={[AlertMessageRenderer, customActionMessageRenderer]}>
			{children}
		</CedarCopilot>
	);
}

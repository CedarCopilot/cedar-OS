'use client';

import { FeatureNodeData } from '@/app/examples/product-roadmap/components/FeatureNode';
import {
	CedarCopilot,
	createSetStateMessageRenderer,
	createMessageRenderer,
	createResponseProcessor,
	useCedarStore,
} from 'cedar-os';
import type {
	SetStateMessageFor,
	CustomMessage,
	CustomStructuredResponseType,
	MessageStorageConfig,
	ProviderConfig,
} from 'cedar-os';
import { ReactNode } from 'react';
import TooltipMenuSpell from '../../../../packages/cedar-os-components/spells/TooltipMenuSpell';
import type { ExtendedTooltipMenuItem } from '../../../../packages/cedar-os-components/spells/TooltipMenuSpell';
import {
	Copy,
	Search,
	Sparkles,
	MessageSquare,
	MessageCirclePlus,
	Edit3,
} from 'lucide-react';

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
		chatPath: '/chat/execute-function',
		voiceRoute: '/chat/voice-execute',
		resumePath: '/chat/resume',
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

	type AddNodeSetStateMessage = SetStateMessageFor<
		'nodes',
		'addNode',
		[{ data: Partial<FeatureNodeData> }]
	>;

	const customSetStateMessageRenderer = createSetStateMessageRenderer({
		render: (message) => {
			switch (message.setterKey) {
				case 'addNode':
					const typedMessage = message as AddNodeSetStateMessage;

					return (
						<div>
							Add node action:{' '}
							{JSON.stringify(typedMessage.args[0].data.description)}
						</div>
					);
				default:
					return <div>Action: {message.setterKey}</div>;
			}
		},
	});

	// Define menu items for text selection
	const textSelectionMenuItems: ExtendedTooltipMenuItem[] = [
		{
			title: 'Quick Edit',
			icon: Edit3,
			spawnsInput: true, // This will spawn the floating input
			onInvoke: () => {
				// This won't be called since spawnsInput is true
				// The floating input will be shown instead
			},
		},
		{
			title: 'Add to Chat',
			icon: MessageCirclePlus,
			onInvoke: () => {
				// Get the selected text
				const selection = window.getSelection();
				if (selection) {
					const text = selection.toString();
					if (text) {
						// Get the Cedar store and set the override input content
						const store = useCedarStore.getState();

						// Get current editor content if any
						const currentContent = store.chatInputContent;

						// If there's existing content, append to it, otherwise just set the selected text
						if (
							currentContent &&
							currentContent.content &&
							currentContent.content.length > 0
						) {
							// Append the selected text with a space
							store.setOverrideInputContent(`${text} `);
						} else {
							// Set just the selected text
							store.setOverrideInputContent(text);
						}

						// Show the chat if it's hidden
						if (!store.showChat) {
							store.setShowChat(true);
						}

						console.log('Added text to chat input:', text);

						// Clear the selection after adding to chat
						selection.removeAllRanges();
					}
				}
			},
		},
		{
			title: 'Copy',
			icon: Copy,
			onInvoke: () => {
				// Get the selected text
				const selection = window.getSelection();
				if (selection) {
					const text = selection.toString();
					if (text) {
						navigator.clipboard.writeText(text);
						console.log('Copied text to clipboard:', text);
						// Clear selection after copying
						selection.removeAllRanges();
					}
				}
			},
		},
		{
			title: 'Search',
			icon: Search,
			onInvoke: () => {
				const selection = window.getSelection();
				if (selection) {
					const text = selection.toString();
					if (text) {
						// Open search in new tab
						const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
							text
						)}`;
						window.open(searchUrl, '_blank');
						// Clear selection after searching
						selection.removeAllRanges();
					}
				}
			},
		},
		{
			title: 'Improve',
			icon: Sparkles,
			onInvoke: () => {
				const selection = window.getSelection();
				if (selection) {
					const text = selection.toString();
					if (text) {
						// Add the text to chat with an improvement request
						const store = useCedarStore.getState();
						store.setOverrideInputContent(
							`Please improve this text: "${text}"`
						);

						// Show the chat if it's hidden
						if (!store.showChat) {
							store.setShowChat(true);
						}

						console.log('Requesting AI improvement for:', text);

						// Clear selection
						selection.removeAllRanges();
					}
				}
			},
		},
		{
			title: 'Comment',
			icon: MessageSquare,
			onInvoke: () => {
				const selection = window.getSelection();
				if (selection) {
					const text = selection.toString();
					if (text) {
						// Add a comment or annotation
						console.log('Add comment for text:', text);
						const comment = window.prompt(`Add a comment for:\n"${text}"`);
						if (comment) {
							console.log('Comment added:', comment);
							// In a real implementation, store this comment
							alert(`Comment saved: ${comment}`);
						}
						// Keep selection for comment
					}
				}
			},
		},
	];

	return (
		<CedarCopilot
			llmProvider={llmProvider}
			voiceSettings={voiceSettings}
			messageStorage={localStorageConfig}
			responseProcessors={[responseProcessor]}
			messageRenderers={[AlertMessageRenderer, customSetStateMessageRenderer]}>
			{children}
			{/* TooltipMenuSpell for any text selection */}
			<TooltipMenuSpell
				spellId='text-selection-menu'
				items={textSelectionMenuItems}
				stream={true}
			/>
		</CedarCopilot>
	);
}

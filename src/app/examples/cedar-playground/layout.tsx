'use client';

import { CedarCopilot, useStyling } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';
import { ReactNode, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SunlitBackground } from '@/components/SunlitBackground/SunlitBackground';

function LayoutContent({ children }: { children: ReactNode }) {
	const { styling, setStyling } = useStyling();

	// Update the document class when dark mode changes
	useEffect(() => {
		if (styling.darkMode) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [styling.darkMode]);

	const handleModeChange = (mode: 'light' | 'dark') => {
		setStyling({ darkMode: mode === 'dark' });
	};

	return (
		<>
			<SunlitBackground
				mode={styling.darkMode ? 'dark' : 'light'}
				onModeChange={handleModeChange}
			/>
			<Navbar />
			<div className='pt-16 relative z-10'>{children}</div>
		</>
	);
}

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

	const customProvider: ProviderConfig = {
		provider: 'custom',
		config: {
			callLLM: async (params, config) => {
				debugger;
				return {
					content: 'Hello, world!',
				};
			},
			callLLMStructured: async (params, config) => {
				debugger;
				return {
					content: 'Hello, world!',
				};
			},
			streamLLM: (params, config, handler) => {
				// Simulate streaming by calling handler immediately
				setTimeout(() => {
					handler({ type: 'chunk', content: 'Hello, ' });
					setTimeout(() => {
						handler({ type: 'chunk', content: 'world!' });
						setTimeout(() => {
							handler({ type: 'done', completedItems: ['Hello, world!'] });
						}, 100);
					}, 100);
				}, 100);

				return {
					abort: () => {
						console.log('Stream aborted');
					},
					completion: Promise.resolve(),
				};
			},
			handleResponse: async (response) => {
				return {
					content: 'Hello, world!',
				};
			},
		},
	};

	return (
		<CedarCopilot llmProvider={customProvider}>
			<LayoutContent>{children}</LayoutContent>
		</CedarCopilot>
	);
}

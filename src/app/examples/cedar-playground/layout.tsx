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

	return (
		<CedarCopilot llmProvider={llmProvider}>
			<LayoutContent>{children}</LayoutContent>
		</CedarCopilot>
	);
}

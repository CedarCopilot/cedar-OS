'use client';

import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import { useState } from 'react';
import {
	AgentBackendConnectionSection,
	ChatSection,
	DiffHistorySection,
	SpellsSection,
	StateAccessSection,
	VoiceSection,
} from './sections';

export default function CedarPlaygroundPage() {
	const [activeChatTab, setActiveChatTab] = useState('caption');

	const pageContent = (
		<div className='px-8 space-y-8'>
			{/* Header Section */}
			<div className='py-16 px-8'>
				<div className='text-center max-w-4xl mx-auto'>
					<h1 className='text-5xl font-bold mb-6 text-gray-900 dark:text-white'>
						Cedar-OS Playground
					</h1>
					<p className='text-xl mb-8 leading-relaxed text-gray-600 dark:text-gray-300'>
						Explore and test all the core features of Cedar-OS in one
						interactive playground. Each section demonstrates a key capability
						with simple configuration buttons.
					</p>
					<p className='text-xl mb-8 leading-relaxed text-gray-600 dark:text-gray-300'>
						This page is open source. You can find the code in the{' '}
						<a
							href='https://github.com/CedarCopilot/cedar'
							target='_blank'
							rel='noopener noreferrer'
							className='text-blue-500 hover:text-blue-700 items-center gap-1 inline-block'>
							Cedar-OS Github Repo
						</a>
					</p>
				</div>
			</div>

			{/* Sequential sections */}

			<AgentBackendConnectionSection />

			<ChatSection activeTab={activeChatTab} onTabChange={setActiveChatTab} />

			<StateAccessSection />

			<SpellsSection />

			<VoiceSection />

			<DiffHistorySection />

			{/* Footer Section */}
			<div className='py-16 px-8'>
				<div className='text-center max-w-4xl mx-auto'>
					<h2 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white'>
						That&apos;s Cedar-OS!
					</h2>
					<p className='text-lg mb-6 leading-relaxed text-gray-600 dark:text-gray-300'>
						This playground demonstrated the core features of Cedar-OS. Each
						section can be configured and extended based on your needs.
					</p>
					<p className='text-base text-gray-500 dark:text-gray-400'>
						Ready to build something amazing? 🚀
					</p>
				</div>
			</div>
		</div>
	);

	// Only wrap with SidePanelCedarChat when sidepanel tab is active
	if (activeChatTab === 'sidepanel') {
		return (
			<SidePanelCedarChat
				side='right'
				title='Cedar Assistant'
				collapsedLabel='Open Cedar Copilot'
				dimensions={{
					width: 400,
					minWidth: 300,
					maxWidth: 600,
				}}
				resizable={true}
				topOffset={64}>
				{pageContent}
			</SidePanelCedarChat>
		);
	}

	// Otherwise, just render the page content directly
	return pageContent;
}

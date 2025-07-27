'use client';

import {
	AgentBackendConnectionSection,
	ChatSection,
	DiffHistorySection,
	SpellsSection,
	StateAccessSection,
	VoiceSection,
} from './sections';

export default function CedarPlaygroundPage() {
	return (
		<div className='bg-gray-50 px-8 space-y-8'>
			{/* Header Section */}
			<div className='py-16 px-8'>
				<div className='text-center max-w-4xl mx-auto'>
					<h1 className='text-5xl font-bold text-gray-900 mb-6'>
						Cedar-OS Playground
					</h1>
					<p className='text-xl text-gray-600 mb-8 leading-relaxed'>
						Explore and test all the core features of Cedar-OS in one
						interactive playground. Each section demonstrates a key capability
						with simple configuration buttons.
					</p>
					<p className='text-xl text-gray-600 mb-8 leading-relaxed'>
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

			<ChatSection />

			<StateAccessSection />

			<SpellsSection />

			<VoiceSection />

			<DiffHistorySection />

			{/* Footer Section */}
			<div className='py-16 px-8 bg-gray-900 text-white'>
				<div className='text-center max-w-4xl mx-auto'>
					<h2 className='text-3xl font-bold mb-6'>That&apos;s Cedar-OS!</h2>
					<p className='text-lg text-gray-300 mb-6 leading-relaxed'>
						This playground demonstrated the core features of Cedar-OS. Each
						section can be configured and extended based on your needs.
					</p>
					<p className='text-base text-gray-400'>
						Ready to build something amazing? 🚀
					</p>
				</div>
			</div>
		</div>
	);
}

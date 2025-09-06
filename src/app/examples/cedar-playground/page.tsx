'use client';

import JsonPatchPlayground from '@/cedar-playground/JsonPatchPlayground';
import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import SliderSpell from '@/spells/SliderSpell';
import {
	type CedarStore,
	ActivationMode,
	useThreadController,
	useCedarStore,
} from 'cedar-os';
import { useState } from 'react';
import {
	AgentBackendConnectionSection,
	ChatSection,
	SubscribedStatesSection,
	TextLengthSection,
	FrontendToolsSection,
	ThreadTestingSection,
} from './sections';

export default function CedarPlaygroundPage() {
	const [activeChatTab, setActiveChatTab] = useState('caption');
	const [lastSliderValue, setLastSliderValue] = useState<number | null>(null);
	const [sliderTriggerCount, setSliderTriggerCount] = useState(0);

	// Thread controller hooks
	const {
		currentThreadId,
		threadIds,
		createThread,
		deleteThread,
		switchThread,
	} = useThreadController();

	// Get thread details for display
	const threadMap = useCedarStore((state) => state.threadMap);
	const updateThreadName = useCedarStore((state) => state.updateThreadName);

	const handleSliderComplete = (value: number, store: CedarStore) => {
		console.log('Slider completed with value:', value);
		console.log('Store state:', store);
		setLastSliderValue(value);
		setSliderTriggerCount((prev) => prev + 1);
	};

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
					<div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6'>
						<h3 className='font-semibold text-blue-900 dark:text-blue-100 mb-2'>
							🎛️ Slider Spell Active
						</h3>
						<div className='text-blue-700 dark:text-blue-300 text-sm mb-2 space-y-1'>
							<p>Hold these keys and move mouse horizontally:</p>
							<ul className='list-disc list-inside ml-2 space-y-1'>
								<li>
									<kbd className='px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs'>
										S
									</kbd>{' '}
									- Percentage slider (0-100%)
								</li>
								<li>
									<kbd className='px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs'>
										O
									</kbd>{' '}
									- Opacity slider (0-255)
								</li>
								<li>
									<kbd className='px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs'>
										A
									</kbd>{' '}
									- Temperature slider (-20 to 40°C)
								</li>
								<li>Or hold right-click for the default slider</li>
							</ul>
						</div>
						{lastSliderValue !== null && (
							<p className='text-blue-600 dark:text-blue-400 text-sm'>
								Last value: <strong>{lastSliderValue}%</strong> • Triggers:{' '}
								{sliderTriggerCount}
							</p>
						)}
					</div>
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

			{/* Thread Testing Section */}
			<ThreadTestingSection
				currentThreadId={currentThreadId}
				threadIds={threadIds}
				threadMap={threadMap}
				createThread={createThread}
				deleteThread={deleteThread}
				switchThread={switchThread}
				updateThreadName={updateThreadName}
			/>

			<TextLengthSection />

			<SubscribedStatesSection />

			<FrontendToolsSection />

			{/* 
			<StateAccessSection /> */}

			{/* JSON Patch Playground */}
			<JsonPatchPlayground />

			{/* <SpellsSection /> */}

			{/* <VoiceSection /> */}

			{/* <DiffHistorySection /> */}

			{/* Footer Section */}
			<div className='py-16 px-8 pt-[50vh]'>
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

			{/* SliderSpell Components - Hidden until activated */}
			<SliderSpell
				spellId='playground-slider-default'
				activationConditions={{
					events: ['s'],
					mode: ActivationMode.HOLD,
				}}
				sliderConfig={{
					// label: 'Percentage slider',
					unit: '% more concise',
				}}
				onComplete={handleSliderComplete}
			/>

			<SliderSpell
				spellId='playground-slider-opacity'
				sliderConfig={{
					min: 0,
					max: 255,
					step: 5,
					unit: '',
				}}
				activationConditions={{
					events: ['o'],
					mode: ActivationMode.HOLD,
				}}
				onComplete={(value, store) => {
					console.log('Opacity slider:', value);
					handleSliderComplete(value, store);
				}}
			/>

			<SliderSpell
				spellId='playground-slider-temperature'
				sliderConfig={{
					min: -20,
					max: 40,
					step: 0.5,
					unit: '°C',
				}}
				activationConditions={{
					events: ['a'],
					mode: ActivationMode.HOLD,
				}}
				onComplete={(value, store) => {
					console.log('Temperature slider:', value);
					handleSliderComplete(value, store);
				}}
			/>
		</div>
	);

	// Only wrap with SidePanelCedarChat when sidepanel tab is active
	if (activeChatTab === 'sidepanel') {
		return (
			<SidePanelCedarChat
				side='right'
				title='Cedar Copilot'
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

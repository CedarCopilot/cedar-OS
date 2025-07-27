import React, { useState } from 'react';
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { Button } from '@/components/ui/button';
import { Mic } from 'lucide-react';

export function VoiceSection() {
	const [voiceStatus, setVoiceStatus] = useState<
		'not-ready' | 'ready' | 'listening' | 'speaking'
	>('not-ready');

	const handleVoiceToggle = async () => {
		if (voiceStatus === 'not-ready') {
			// Simulate requesting permission
			setVoiceStatus('ready');
			alert(
				'Voice feature simulated - in a real app this would request microphone permission'
			);
		} else if (voiceStatus === 'ready') {
			setVoiceStatus('listening');
			// Simulate listening for 3 seconds
			setTimeout(() => {
				setVoiceStatus('speaking');
				setTimeout(() => {
					setVoiceStatus('ready');
				}, 2000);
			}, 3000);
		} else if (voiceStatus === 'listening') {
			setVoiceStatus('ready');
		}
	};

	const getVoiceStatusColor = () => {
		switch (voiceStatus) {
			case 'listening':
				return 'text-red-500';
			case 'speaking':
				return 'text-green-500';
			case 'ready':
				return 'text-blue-500';
			default:
				return 'text-gray-400 dark:text-gray-500';
		}
	};

	const getVoiceStatusText = () => {
		switch (voiceStatus) {
			case 'listening':
				return 'Listening...';
			case 'speaking':
				return 'Speaking...';
			case 'ready':
				return 'Ready';
			default:
				return 'Not Ready';
		}
	};

	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
				Voice
			</h3>
			<div className='space-y-3'>
				<div className='flex items-center gap-2 mb-3'>
					<Mic className={`w-5 h-5 ${getVoiceStatusColor()}`} />
					<span className='text-sm font-medium dark:text-gray-200'>
						{getVoiceStatusText()}
					</span>
				</div>
				<Button
					onClick={handleVoiceToggle}
					disabled={voiceStatus === 'speaking'}
					className='w-full'>
					{voiceStatus === 'listening' ? 'Stop Listening' : 'Start Voice'}
				</Button>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					Voice-powered AI interactions with real-time audio streaming
				</p>
			</div>
		</GlassyPaneContainer>
	);
}

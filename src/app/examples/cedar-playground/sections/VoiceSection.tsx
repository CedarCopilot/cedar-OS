import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
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
				return 'text-gray-400';
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
		<Card title='Voice'>
			<div className='flex items-center gap-2 mb-3'>
				<Mic className={`w-5 h-5 ${getVoiceStatusColor()}`} />
				<span className='text-sm font-medium'>{getVoiceStatusText()}</span>
			</div>
			<Button
				onClick={handleVoiceToggle}
				disabled={voiceStatus === 'speaking'}
				className='w-full'>
				{voiceStatus === 'listening' ? 'Stop Listening' : 'Start Voice'}
			</Button>
			<p className='text-xs text-gray-500'>
				Voice-powered AI interactions with real-time audio streaming
			</p>
		</Card>
	);
}

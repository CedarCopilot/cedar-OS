'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { X, Copy, Play, Square, RotateCcw } from 'lucide-react';
import { cn } from 'cedar-os';
import { NetworkTab } from './NetworkTab';
import { StatesTab } from './StatesTab';
import { MessagesTab } from './MessagesTab';
import { useDebugStore } from './use-debug-store';
export function DebugPanel() {
	const [isMinimized, setIsMinimized] = useState(false);
	const {
		isRecording,
		startRecording,
		stopRecording,
		clearRecording,
		generateSummary,
	} = useDebugStore();

	const handleCopySummary = async () => {
		const summary = generateSummary();
		await navigator.clipboard.writeText(summary);
		// You could add a toast notification here
	};

	return (
		<div
			className={cn(
				'w-full bg-card border rounded-lg shadow-lg transition-all duration-200'
			)}>
			{/* Header */}
			<div className='flex items-center justify-between p-3 border-b'>
				<div className='flex items-center gap-2'>
					<span className='font-medium text-sm'>Debug Panel</span>
					<Badge variant='secondary' className='text-xs'>
						Dev
					</Badge>
				</div>

				<div className='flex items-center gap-1'>
					{/* Recording Controls */}

					<Button
						size='sm'
						variant='ghost'
						onClick={() => setIsMinimized(!isMinimized)}
						className='h-6 w-6 p-0'>
						<span className='text-xs'>{isMinimized ? '□' : '−'}</span>
					</Button>

					<Button
						size='sm'
						variant='ghost'
						onClick={() => {
							/* Close panel */
						}}
						className='h-6 w-6 p-0'>
						<X className='h-3 w-3' />
					</Button>
				</div>
			</div>

			{/* Content */}
			{!isMinimized && (
				<div className='h-[calc(700px-57px)]'>
					<Tabs defaultValue='network' className='h-full'>
						<TabsList className='grid w-full grid-cols-3 rounded-none border-b bg-transparent h-10'>
							<TabsTrigger value='network' className='text-xs cursor-pointer'>
								Network
							</TabsTrigger>
							<TabsTrigger value='states' className='text-xs cursor-pointer'>
								States
							</TabsTrigger>
							<TabsTrigger value='messages' className='text-xs cursor-pointer'>
								Messages
							</TabsTrigger>
						</TabsList>

						<div className='h-[calc(100%-40px)]'>
							<TabsContent
								value='network'
								className='h-full m-0 overflow-y-auto p-4'>
								<NetworkTab />
							</TabsContent>
							<TabsContent
								value='states'
								className='h-full m-0 overflow-y-auto p-4'>
								<StatesTab />
							</TabsContent>
							<TabsContent
								value='messages'
								className='h-full m-0 overflow-y-auto p-4'>
								<MessagesTab />
							</TabsContent>
						</div>
					</Tabs>
				</div>
			)}
		</div>
	);
}

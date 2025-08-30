'use client';

import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useDebugStore } from './use-debug-store';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

export function StatesTab() {
	const { stateChanges } = useDebugStore();
	const [expandedStates, setExpandedStates] = useState<Set<string>>(
		new Set(['selectedEmail', 'aiInsights'])
	);

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	const sampleStates = [
		{
			name: 'selectedEmail',
			type: 'object',
			currentValue: { id: 1, subject: 'Q4 Performance Review Meet' },
			modificationCount: 2,
			lastModified: new Date('2024-01-01T14:23:43'),
		},
		{
			name: 'searchQuery',
			type: 'string',
			currentValue: '',
			modificationCount: 1,
			lastModified: new Date('2024-01-01T14:23:43'),
		},
		{
			name: 'aiInsights',
			type: 'object',
			currentValue: { priority: 'high', sentiment: 'positive' },
			modificationCount: 3,
			lastModified: new Date('2024-01-01T14:23:43'),
		},
	];

	const stateEntries = stateChanges.reduce(
		(acc, change) => {
			const existing = acc.find((entry) => entry.name === change.stateName);
			if (existing) {
				existing.modificationCount++;
				existing.lastModified = change.timestamp;
				existing.currentValue = change.newValue;
			} else {
				acc.push({
					name: change.stateName,
					type:
						typeof change.newValue === 'object'
							? 'object'
							: typeof change.newValue,
					currentValue: change.newValue,
					modificationCount: 1,
					lastModified: change.timestamp,
				});
			}
			return acc;
		},
		[] as Array<{
			name: string;
			type: string;
			currentValue: any;
			modificationCount: number;
			lastModified: Date;
		}>
	);

	const displayStates = stateEntries.length > 0 ? stateEntries : sampleStates;

	const toggleExpanded = (stateName: string) => {
		const newExpanded = new Set(expandedStates);
		if (newExpanded.has(stateName)) {
			newExpanded.delete(stateName);
		} else {
			newExpanded.add(stateName);
		}
		setExpandedStates(newExpanded);
	};

	return (
		<ScrollArea className='h-full'>
			<div className='p-3 space-y-2'>
				{displayStates.map((state) => {
					const isExpanded = expandedStates.has(state.name);
					return (
						<div
							key={state.name}
							className='border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800/50'>
							<div
								className='flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-colors'
								onClick={() => toggleExpanded(state.name)}>
								<div className='flex items-center gap-2'>
									{isExpanded ? (
										<ChevronDown className='w-4 h-4 text-gray-500' />
									) : (
										<ChevronRight className='w-4 h-4 text-gray-500' />
									)}
									<span className='font-medium text-gray-900 dark:text-gray-100'>
										{state.name}
									</span>
								</div>
								<div className='flex items-center gap-2'>
									<Badge
										variant='secondary'
										className='text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'>
										{state.type}
									</Badge>
									<div className='flex items-center gap-1'>
										<div className='w-2 h-2 bg-green-500 rounded-full'></div>
										<span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
											{state.modificationCount}
										</span>
									</div>
								</div>
							</div>

							{isExpanded && (
								<div className='px-3 pb-3 border-t border-gray-100 dark:border-gray-700'>
									<div className='mt-3 mb-3'>
										<pre className='text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded border border-gray-200 dark:border-gray-600 overflow-x-auto'>
											{typeof state.currentValue === 'object'
												? JSON.stringify(state.currentValue, null, 2)
												: `"${state.currentValue}"`}
										</pre>
									</div>
									<div className='text-xs text-gray-500 dark:text-gray-400'>
										Modified: {formatTime(state.lastModified)}
									</div>
								</div>
							)}
						</div>
					);
				})}

				{displayStates.length === 0 && (
					<div className='text-center text-gray-500 dark:text-gray-400 text-sm py-8'>
						No state changes recorded
					</div>
				)}
			</div>
		</ScrollArea>
	);
}

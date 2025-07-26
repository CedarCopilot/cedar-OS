import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
import { Clock } from 'lucide-react';

export function DiffHistorySection() {
	const handleViewHistory = () => {
		alert(
			'Diff & History Manager is in beta. This will track and manage state changes over time.'
		);
	};

	return (
		<Card title='Diff & History Manager'>
			<div className='flex items-center gap-2 mb-3'>
				<Clock className='w-5 h-5' />
				<span className='text-sm font-medium'>Change Tracking</span>
			</div>
			<Button onClick={handleViewHistory} variant='outline' className='w-full'>
				View History
			</Button>
			<p className='text-xs text-gray-500'>
				Track and manage state changes and diffs over time (Beta)
			</p>
		</Card>
	);
}

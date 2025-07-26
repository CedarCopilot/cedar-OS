import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
import { Database } from 'lucide-react';

export function StateAccessSection() {
	const [demoCounter, setDemoCounter] = useState(0);

	const handleStateIncrement = () => {
		setDemoCounter((prev) => prev + 1);
	};

	return (
		<Card title='State Access'>
			<div className='flex items-center gap-2 mb-3'>
				<Database className='w-5 h-5' />
				<span className='text-sm font-medium'>Counter: {demoCounter}</span>
			</div>
			<Button onClick={handleStateIncrement} className='w-full'>
				Increment State
			</Button>
			<p className='text-xs text-gray-500'>
				Demonstrates registered state that agents can read and modify
			</p>
		</Card>
	);
}

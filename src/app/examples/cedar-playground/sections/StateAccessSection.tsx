import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Database } from 'lucide-react';
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';

export function StateAccessSection() {
	const [demoCounter, setDemoCounter] = useState(0);

	const handleStateIncrement = () => {
		setDemoCounter((prev) => prev + 1);
	};

	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
				State Access
			</h3>
			<div className='space-y-3'>
				<div className='flex items-center gap-2 mb-3'>
					<Database className='w-5 h-5 dark:text-gray-300' />
					<span className='text-sm font-medium dark:text-gray-200'>
						Counter: {demoCounter}
					</span>
				</div>
				<Button onClick={handleStateIncrement} className='w-full'>
					Increment State
				</Button>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					Demonstrates registered state that agents can read and modify
				</p>
			</div>
		</GlassyPaneContainer>
	);
}

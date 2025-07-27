import React, { useState } from 'react';
import { GlassyPaneContainer } from 'cedar-os';
import { Button } from '@/components/ui/button';
import { GitBranch } from 'lucide-react';

export function DiffHistorySection() {
	const [diffCount, setDiffCount] = useState(0);

	const handleCreateDiff = () => {
		setDiffCount((prev) => prev + 1);
	};

	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
				Diff History
			</h3>
			<div className='space-y-3'>
				<div className='flex items-center gap-2 mb-3'>
					<GitBranch className='w-5 h-5 dark:text-gray-300' />
					<span className='text-sm font-medium dark:text-gray-200'>
						Diffs Created: {diffCount}
					</span>
				</div>
				<Button onClick={handleCreateDiff} className='w-full'>
					Create New Diff
				</Button>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					Track and visualize code changes over time
				</p>
			</div>
		</GlassyPaneContainer>
	);
}

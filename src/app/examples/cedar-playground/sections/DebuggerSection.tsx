import React from 'react';
import { DebuggerPanel } from 'cedar-os-components';
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { Bug, Info } from 'lucide-react';

export function DebuggerSection() {
	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white flex items-center gap-2'>
				<Bug className='w-5 h-5 text-purple-600 dark:text-purple-400' />
				Cedar Debugger Panel
			</h3>

			<div className='space-y-4'>
				<div className='bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
					<div className='flex items-start gap-2'>
						<Info className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
						<div className='space-y-2 text-sm'>
							<p className='text-gray-700 dark:text-gray-300'>
								The DebuggerPanel is a powerful development tool that provides
								real-time insights into your Cedar OS application.
							</p>
							<p className='text-gray-700 dark:text-gray-300'>
								Look for the{' '}
								<span className='font-semibold text-purple-600 dark:text-purple-400'>
									purple bug icon
								</span>{' '}
								in the bottom-right corner of your screen.
							</p>
						</div>
					</div>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
					<div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
						<h4 className='font-semibold text-sm mb-2 flex items-center gap-2'>
							<span className='text-purple-600 dark:text-purple-400'>📡</span>
							Network Tab
						</h4>
						<p className='text-xs text-gray-600 dark:text-gray-400'>
							Monitor all LLM API calls, including requests, responses, and
							streaming events.
						</p>
					</div>

					<div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
						<h4 className='font-semibold text-sm mb-2 flex items-center gap-2'>
							<span className='text-blue-600 dark:text-blue-400'>💬</span>
							Messages Tab
						</h4>
						<p className='text-xs text-gray-600 dark:text-gray-400'>
							View all conversation messages with thread support and full JSON
							inspection.
						</p>
					</div>

					<div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
						<h4 className='font-semibold text-sm mb-2 flex items-center gap-2'>
							<span className='text-green-600 dark:text-green-400'>🗄️</span>
							States Tab
						</h4>
						<p className='text-xs text-gray-600 dark:text-gray-400'>
							Inspect all Cedar states in real-time as they update.
						</p>
					</div>
				</div>

				<div className='bg-gray-50 dark:bg-gray-950/50 rounded-lg p-4'>
					<h4 className='font-semibold text-sm mb-2'>Features:</h4>
					<ul className='space-y-1 text-xs text-gray-600 dark:text-gray-400'>
						<li className='flex items-center gap-2'>
							<span className='text-green-500'>✓</span>
							<span>
								Drag anywhere to reposition - click and drag the button or the
								panel header
							</span>
						</li>
						<li className='flex items-center gap-2'>
							<span className='text-green-500'>✓</span>
							<span>
								Collapsed state shows notification badge with log count
							</span>
						</li>
						<li className='flex items-center gap-2'>
							<span className='text-green-500'>✓</span>
							<span>Expandable cards with copy-to-clipboard functionality</span>
						</li>
						<li className='flex items-center gap-2'>
							<span className='text-green-500'>✓</span>
							<span>Real-time updates as new data arrives</span>
						</li>
						<li className='flex items-center gap-2'>
							<span className='text-green-500'>✓</span>
							<span>Dark mode support with smooth animations</span>
						</li>
					</ul>
				</div>

				<div className='text-xs text-gray-500 dark:text-gray-400 italic'>
					Try making some API calls or sending messages to see the debugger in
					action!
				</div>
			</div>

			{/* The actual DebuggerPanel is rendered globally */}
			<DebuggerPanel />
		</GlassyPaneContainer>
	);
}

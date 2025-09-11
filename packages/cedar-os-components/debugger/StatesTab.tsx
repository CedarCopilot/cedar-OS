import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hash, Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { registeredState } from 'cedar-os';
import type { StatesTabProps } from './types';

export const StatesTab: React.FC<StatesTabProps> = ({
	states,
	onCopy,
	copiedId,
}) => {
	const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

	const toggleExpanded = (stateKey: string) => {
		setExpandedStates((prev) => {
			const next = new Set(prev);
			if (next.has(stateKey)) {
				next.delete(stateKey);
			} else {
				next.add(stateKey);
			}
			return next;
		});
	};

	const getStatePreview = (registeredState: registeredState): string => {
		const value = registeredState?.value;
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'string')
			return `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`;
		if (typeof value === 'number' || typeof value === 'boolean')
			return String(value);
		if (Array.isArray(value)) return `Array(${value.length})`;
		if (typeof value === 'object')
			return `Object(${Object.keys(value).length} keys)`;
		return String(value);
	};

	return (
		<div className='h-full overflow-y-auto p-2 space-y-1'>
			{Object.keys(states).length === 0 ? (
				<div className='text-center text-gray-500 dark:text-gray-400 py-4 text-xs'>
					No states registered yet
				</div>
			) : (
				Object.entries(states).map(([key, registeredState]) => {
					const isExpanded = expandedStates.has(key);

					return (
						<div
							key={key}
							className='border rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'>
							<div
								className={`flex items-center justify-between p-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80 ${
									isExpanded ? 'rounded-t-lg' : 'rounded-lg'
								}`}
								onClick={() => toggleExpanded(key)}>
								<div className='flex items-center gap-1.5 flex-1'>
									<Hash className='w-3 h-3 text-gray-500' />
									<span className='font-medium text-xs font-mono'>{key}</span>
									{!isExpanded && (
										<span className='text-xs text-gray-500 dark:text-gray-500 ml-1'>
											{getStatePreview(registeredState)}
										</span>
									)}
								</div>
								<div className='flex items-center gap-1'>
									<button
										onClick={(e) => {
											e.stopPropagation();
											onCopy(JSON.stringify(registeredState, null, 2), key);
										}}
										className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
										{copiedId === key ? (
											<Check className='w-3 h-3 text-green-600' />
										) : (
											<Copy className='w-3 h-3' />
										)}
									</button>
									{isExpanded ? (
										<ChevronDown className='w-3 h-3' />
									) : (
										<ChevronRight className='w-3 h-3' />
									)}
								</div>
							</div>

							<AnimatePresence>
								{isExpanded && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2 }}
										className='overflow-hidden'>
										<div className='p-3 pt-0 rounded-b-lg'>
											<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto'>
												{JSON.stringify(registeredState, null, 2)}
											</pre>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					);
				})
			)}
		</div>
	);
};

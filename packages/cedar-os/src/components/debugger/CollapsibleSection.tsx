import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/styles/stylingUtils';
import type { CollapsibleSectionProps, Badge } from './types';

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
	title,
	isExpanded,
	onToggle,
	badges,
	children,
}) => {
	const getBadgeColor = (color: Badge['color']) => {
		const colors = {
			gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
			blue: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
			green:
				'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
			purple:
				'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
			amber:
				'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300',
			red: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
			yellow:
				'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
		};
		return colors[color];
	};

	return (
		<div className='border border-gray-200 dark:border-gray-700 rounded-lg'>
			<div
				className={cn(
					'flex items-center justify-between p-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
					isExpanded ? 'rounded-t-lg' : 'rounded-lg'
				)}
				onClick={onToggle}>
				<div className='flex items-center gap-2 flex-1'>
					{isExpanded ? (
						<ChevronDown className='w-4 h-4' />
					) : (
						<ChevronRight className='w-4 h-4' />
					)}
					<span className='font-medium text-sm'>{title}</span>
					<div className='flex items-center gap-1 ml-2'>
						{badges.map((badge) => (
							<span
								key={badge.label}
								className={cn(
									'px-2 py-0.5 rounded text-xs',
									getBadgeColor(badge.color)
								)}>
								{badge.label}
							</span>
						))}
					</div>
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
						<div className='p-3 pt-0 rounded-b-lg'>{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

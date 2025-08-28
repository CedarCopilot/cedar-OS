import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, Play, X, Clock } from 'lucide-react';

interface HumanInTheLoopIndicatorProps {
	state: 'suspended' | 'resumed' | 'cancelled' | 'timeout';
}

export const HumanInTheLoopIndicator: React.FC<
	HumanInTheLoopIndicatorProps
> = ({ state }) => {
	// Don't show indicator if no state
	if (!state) {
		return null;
	}

	const getStateConfig = () => {
		switch (state) {
			case 'suspended':
				return {
					icon: Pause,
					color: 'text-orange-500',
					label: 'Workflow suspended...',
				};
			case 'resumed':
				return {
					icon: Play,
					color: 'text-green-500',
					label: 'Workflow resumed',
				};
			case 'cancelled':
				return {
					icon: X,
					color: 'text-red-500',
					label: 'Workflow cancelled',
				};
			case 'timeout':
				return {
					icon: Clock,
					color: 'text-gray-500',
					label: 'Workflow timed out',
				};
			default:
				return {
					icon: Pause,
					color: 'text-gray-500',
					label: 'Unknown state',
				};
		}
	};

	const { icon: Icon, color, label } = getStateConfig();

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 10 }}>
				<div className='flex items-center gap-2 justify-center'>
					<Icon className={`w-4 h-4 ${color}`} />
					<span className='text-sm font-medium'>{label}</span>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

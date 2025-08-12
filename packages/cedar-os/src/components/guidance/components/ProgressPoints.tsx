import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStyling } from '@/store/CedarStore';

export interface ProgressPointsProps {
	/**
	 * Total number of steps in the sequence
	 */
	totalSteps: number;

	/**
	 * Current active step (1-based)
	 */
	currentStep: number;

	/**
	 * Whether to show the component
	 */
	visible?: boolean;

	/**
	 * Optional custom label for each step
	 */
	labels?: string[];

	/**
	 * Optional callback when a step is clicked
	 */
	onStepClick?: (step: number) => void;
}

const ProgressPoints: React.FC<ProgressPointsProps> = ({
	totalSteps,
	currentStep,
	visible = true,
	labels = [],
	onStepClick,
}) => {
	const { styling } = useStyling();
	const primaryColor = styling?.color || '#319B72';

	// Create array of steps
	const steps = Array.from({ length: totalSteps }, (_, i) => ({
		number: i + 1,
		label: labels[i] || `Step ${i + 1}`,
		status:
			i + 1 < currentStep
				? 'completed'
				: i + 1 === currentStep
					? 'active'
					: 'pending',
	}));

	// Handle navigation
	const handlePrevious = () => {
		if (currentStep > 1 && onStepClick) {
			onStepClick(currentStep - 1);
		}
	};

	const handleNext = () => {
		if (currentStep < totalSteps && onStepClick) {
			onStepClick(currentStep + 1);
		}
	};

	// Determine if navigation arrows should be enabled
	const canGoPrevious = currentStep > 1;
	const canGoNext = currentStep < totalSteps;

	// Simplified animation variants
	const containerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.3,
				ease: 'easeOut',
			},
		},
		exit: {
			opacity: 0,
			y: 20,
			transition: {
				duration: 0.2,
				ease: 'easeIn',
			},
		},
	};

	return (
		<AnimatePresence>
			{visible && (
				<div
					className='fixed inset-0 pointer-events-none flex items-end justify-center'
					style={{
						zIndex: '9999999 !important',
						marginBottom: '32px',
					}}>
					<motion.div
						className='bg-white/90 backdrop-blur-sm px-4 py-3 rounded-full shadow-lg border border-gray-200 pointer-events-auto'
						variants={containerVariants}
						initial='hidden'
						animate='visible'
						exit='exit'>
						<div className='flex items-center justify-center space-x-2 relative'>
							{/* Previous arrow */}
							<motion.button
								className={`flex items-center justify-center w-7 h-7 rounded-full ${
									canGoPrevious
										? 'text-gray-700 hover:bg-gray-100'
										: 'text-gray-300 cursor-not-allowed'
								}`}
								whileHover={canGoPrevious ? { scale: 1.2, rotate: -10 } : {}}
								whileTap={canGoPrevious ? { scale: 0.95 } : {}}
								onClick={handlePrevious}
								disabled={!canGoPrevious}
								aria-label='Previous step'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									width='16'
									height='16'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'>
									<polyline points='15 18 9 12 15 6'></polyline>
								</svg>
							</motion.button>

							{/* Steps */}
							<div className='flex items-center space-x-2'>
								{steps.map((step) => (
									<motion.button
										key={step.number}
										className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors relative ${
											step.status === 'active'
												? 'bg-opacity-20 text-white'
												: step.status === 'completed'
													? 'bg-opacity-10 text-gray-700'
													: 'bg-gray-100 text-gray-500'
										}`}
										style={{
											backgroundColor:
												step.status !== 'pending'
													? step.status === 'active'
														? primaryColor
														: `${primaryColor}30`
													: '',
										}}
										whileHover={{ scale: 1.05, y: -2 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => onStepClick?.(step.number)}>
										{/* Glow effect for active step */}
										{step.status === 'active' && (
											<motion.div
												className='absolute inset-0 rounded-full'
												style={{
													boxShadow: `0 0 0 2px ${primaryColor}`,
												}}
												animate={{
													boxShadow: [
														`0 0 0 2px ${primaryColor}40`,
														`0 0 8px 3px ${primaryColor}90`,
														`0 0 0 2px ${primaryColor}40`,
													],
												}}
												transition={{
													repeat: Infinity,
													duration: 3,
													ease: 'easeInOut',
												}}
											/>
										)}

										{/* Number indicator for completed steps */}
										{step.status === 'completed' && (
											<motion.div
												className='absolute left-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs'
												style={{ backgroundColor: primaryColor }}
												initial={{ scale: 0 }}
												animate={{ scale: 1 }}
												transition={{ type: 'spring', bounce: 0.5 }}>
												✓
											</motion.div>
										)}

										<span
											className={`z-10 ${step.status === 'completed' ? 'ml-4' : ''}`}>
											{step.label}
										</span>
									</motion.button>
								))}
							</div>

							{/* Next arrow */}
							<motion.button
								className={`flex items-center justify-center w-7 h-7 rounded-full ${
									canGoNext
										? 'text-gray-700 hover:bg-gray-100'
										: 'text-gray-300 cursor-not-allowed'
								}`}
								whileHover={canGoNext ? { scale: 1.2, rotate: 10 } : {}}
								whileTap={canGoNext ? { scale: 0.95 } : {}}
								onClick={handleNext}
								disabled={!canGoNext}
								aria-label='Next step'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									width='16'
									height='16'
									viewBox='0 0 24 24'
									fill='none'
									stroke='currentColor'
									strokeWidth='2'
									strokeLinecap='round'
									strokeLinejoin='round'>
									<polyline points='9 18 15 12 9 6'></polyline>
								</svg>
							</motion.button>
						</div>
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default ProgressPoints;

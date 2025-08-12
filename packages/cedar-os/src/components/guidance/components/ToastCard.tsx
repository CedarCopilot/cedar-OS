'use client';

import { cn } from '@/styles/stylingUtils';
import { Button } from '@/components/guidance/components/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlertCircle,
	ArrowRight,
	Check,
	CheckCircle2,
	ExternalLink,
	Info,
	X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// Define position variants using cva
const positionVariants = cva('fixed z-[100]', {
	variants: {
		position: {
			'bottom-right': 'bottom-4 right-4',
			'bottom-left': 'bottom-4 left-4',
			bottom: 'bottom-4 left-1/2 -translate-x-1/2',
			top: 'top-4 left-1/2 -translate-x-1/2',
		},
	},
	defaultVariants: {
		position: 'bottom-right',
	},
});

// Define animation variants for each position
const animationVariants = {
	'bottom-right': {
		initial: { opacity: 0, x: 20, y: 0, scale: 0.95 },
		animate: { opacity: 1, x: 0, y: 0, scale: 1 },
		exit: { opacity: 0, x: 20, y: 0, scale: 0.95 },
	},
	'bottom-left': {
		initial: { opacity: 0, x: -20, y: 0, scale: 0.95 },
		animate: { opacity: 1, x: 0, y: 0, scale: 1 },
		exit: { opacity: 0, x: -20, y: 0, scale: 0.95 },
	},
	bottom: {
		initial: { opacity: 0, y: 20, scale: 0.95 },
		animate: { opacity: 1, y: 0, scale: 1 },
		exit: { opacity: 0, y: 20, scale: 0.95 },
	},
	top: {
		initial: { opacity: 0, y: -20, scale: 0.95 },
		animate: { opacity: 1, y: 0, scale: 1 },
		exit: { opacity: 0, y: -20, scale: 0.95 },
	},
};

// Define CSS keyframes for the progress bar animation
const progressKeyframes = `
@keyframes progress-animation {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

@keyframes glow-pulse {
  0% {
    filter: brightness(1.05);
    box-shadow: 0 0 6px 1px var(--glow-color), 0 0 2px 0px var(--glow-color);
  }
  50% {
    filter: brightness(1.1);
    box-shadow: 0 0 8px 2px var(--glow-color), 0 0 4px 0px var(--glow-color);
  }
  100% {
    filter: brightness(1.05);
    box-shadow: 0 0 6px 1px var(--glow-color), 0 0 2px 0px var(--glow-color);
  }
}`;

export interface ToastCardProps extends VariantProps<typeof positionVariants> {
	title?: string;
	description?: string;
	variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
	className?: string;
	onClose?: () => void;
	duration?: number;
	toastMode?: boolean;
	action?: {
		icon?: 'link' | 'action' | 'check'; // Custom icon to display in the action button
		label: string;
		onClick?: () => void;
	};
}

const ToastCard = React.forwardRef<HTMLDivElement, ToastCardProps>(
	(
		{
			title,
			description,
			position = 'bottom-right',
			variant = 'default',
			className,
			onClose,
			duration = 5000,
			toastMode = false,
			action,
		},
		ref
	) => {
		const [isVisible, setIsVisible] = useState(true);
		const timeoutRef = useRef<NodeJS.Timeout | null>(null);

		// Get the animation variant based on position
		const animation = animationVariants[position ?? 'bottom-right'];

		// Handle close with animation
		const handleClose = () => {
			setIsVisible(false);
			// Wait for animation to complete before calling onClose
			setTimeout(() => {
				onClose?.();
			}, 300); // Match the duration of the exit animation
		};

		// Auto-dismiss after duration if specified
		useEffect(() => {
			if (duration) {
				const fadeOutDuration = 300; // Animation duration for fade out

				// Set timeout to hide toast after duration
				timeoutRef.current = setTimeout(() => {
					setIsVisible(false);
					// After fadeout completes, call onClose
					setTimeout(() => {
						onClose?.();
					}, fadeOutDuration);
				}, duration - fadeOutDuration);

				return () => {
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
					}
				};
			}
		}, [duration, onClose]);

		// Get icon based on variant
		const getIcon = () => {
			switch (variant) {
				case 'success':
					return (
						<CheckCircle2
							className='h-5 w-5 text-emerald-500'
							aria-hidden='true'
						/>
					);
				case 'warning':
					return (
						<AlertCircle
							className='h-5 w-5 text-amber-500'
							aria-hidden='true'
						/>
					);
				case 'destructive':
					return (
						<AlertCircle className='h-5 w-5 text-red-500' aria-hidden='true' />
					);
				case 'info':
					return <Info className='h-5 w-5 text-blue-500' aria-hidden='true' />;
				default:
					return null;
			}
		};

		// Get background gradient based on variant
		const getGradient = () => {
			switch (variant) {
				case 'success':
					return 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 50%, rgba(255, 255, 255, 0) 100%)';
				case 'warning':
					return 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 50%, rgba(255, 255, 255, 0) 100%)';
				case 'destructive':
					return 'linear-gradient(90deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 50%, rgba(255, 255, 255, 0) 100%)';
				case 'info':
					return 'linear-gradient(90deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(255, 255, 255, 0) 100%)';
				default:
					return 'linear-gradient(90deg, rgba(100, 116, 139, 0.15) 0%, rgba(100, 116, 139, 0.05) 50%, rgba(255, 255, 255, 0) 100%)';
			}
		};

		// Get progress bar color based on variant
		const getProgressColor = () => {
			switch (variant) {
				case 'success':
					return 'bg-emerald-400';
				case 'warning':
					return 'bg-amber-400';
				case 'destructive':
					return 'bg-red-400';
				case 'info':
					return 'bg-blue-400';
				default:
					return 'bg-slate-400';
			}
		};

		// Get progress bar shadow color based on variant
		const getProgressShadowColor = () => {
			switch (variant) {
				case 'success':
					return 'rgba(16, 185, 129, 0.8)';
				case 'warning':
					return 'rgba(245, 158, 11, 0.8)';
				case 'destructive':
					return 'rgba(239, 68, 68, 0.8)';
				case 'info':
					return 'rgba(59, 130, 246, 0.8)';
				default:
					return 'rgba(100, 116, 139, 0.8)';
			}
		};

		// Get action icon based on specified icon type
		const getActionIcon = () => {
			if (!action?.icon) return null;

			switch (action.icon) {
				case 'link':
					return <ExternalLink className='h-2 w-2 mr-1.5' aria-hidden='true' />;
				case 'action':
					return <ArrowRight className='h-2 w-2 mr-1.5' aria-hidden='true' />;
				case 'check':
					return <Check className='h-2 w-2 mr-1.5' aria-hidden='true' />;
				default:
					return null;
			}
		};

		return (
			<>
				{/* Inject keyframes animation */}
				<style dangerouslySetInnerHTML={{ __html: progressKeyframes }} />
				<div className={cn(positionVariants({ position }))}>
					<AnimatePresence>
						{isVisible && (
							<motion.div
								ref={ref}
								key='toast-card'
								initial={animation.initial}
								animate={animation.animate}
								exit={animation.exit}
								transition={{ duration: 0.3, ease: 'easeOut' }}
								className={cn('max-w-md', className)}>
								{toastMode ? (
									<div className='relative'>
										{/* Toast shape with irregular edges */}
										<div
											className={cn(
												'relative overflow-hidden bg-amber-50 border-4 border-amber-400 shadow-lg',
												'rounded-2xl', // More consistent rounding
												variant === 'destructive' &&
													'border-destructive bg-red-200'
											)}
											style={{
												boxShadow: '0 0 15px 2px rgba(255, 196, 0, 0.3)', // Warm glow
											}}>
											{/* Butter pat with improved styling */}
											<div className='absolute top-[17%] left-[14%] w-14 h-12 bg-yellow-300 rounded-[40%_60%_60%_40%_/_40%_30%_70%_60%] rotate-12 border-2 border-black z-10 overflow-hidden'>
												{/* Add butter drip effect */}
												<div className='absolute bottom-0 left-0 right-0 h-1/3 bg-yellow-200'></div>
												{/* Add butter texture */}
												<div
													className='absolute inset-0'
													style={{
														backgroundImage:
															'radial-gradient(circle, rgba(251, 191, 36, 0.7) 1px, transparent 1px)',
														backgroundSize: '4px 4px',
													}}></div>
											</div>

											{/* Left jutting part of toast */}
											<div className='absolute left-[-7px] top-[32%] h-[30%] w-[14px] bg-amber-50 border-l-4 border-t-4 border-b-4 border-amber-400 rounded-l-xl z-5'></div>

											{/* Right jutting part of toast */}
											<div className='absolute right-[-7px] top-[55%] h-[30%] w-[14px] bg-amber-50 border-r-4 border-t-4 border-b-4 border-amber-400 rounded-r-xl z-5'></div>

											{/* Dotted texture pattern for bottom edge */}
											<div
												className='absolute bottom-0 left-0 right-0 h-[30%] bg-amber-300/80 z-0'
												style={{
													backgroundImage:
														'radial-gradient(circle, #00000025 1.5px, transparent 1.5px)',
													backgroundSize: '6px 6px',
												}}></div>

											{/* Additional dotted texture for right side */}
											<div
												className='absolute top-0 right-0 w-[30%] h-[40%] bg-amber-300/80 z-0'
												style={{
													backgroundImage:
														'radial-gradient(circle, #00000025 1.5px, transparent 1.5px)',
													backgroundSize: '6px 6px',
												}}></div>

											{/* Content */}
											<div className='relative p-5 pb-6 z-20'>
												{onClose && (
													<button
														onClick={handleClose}
														className={cn(
															'absolute right-2 top-2 rounded-full p-1 bg-black text-white opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-1 z-30',
															variant === 'destructive' &&
																'bg-destructive-foreground'
														)}>
														<X className='h-3 w-3' />
													</button>
												)}

												{title && (
													<div className='font-semibold text-black mb-1 '>
														{title}
													</div>
												)}
												{description && (
													<div className='text-sm text-black/80'>
														{description}
													</div>
												)}

												{action && (
													<div className='mt-3'>
														<button
															onClick={action.onClick}
															className='inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2'>
															{getActionIcon()}
															{action.label}
														</button>
													</div>
												)}
											</div>
										</div>
									</div>
								) : (
									<div className='relative overflow-hidden w-full rounded-lg bg-white shadow-md border border-b-0 border-gray-100'>
										{/* Top content */}
										<div
											className='relative p-3'
											style={{
												background: getGradient(),
											}}>
											<div className='flex'>
												{/* Status icon column - vertically centered with title and description only */}
												{getIcon() && (
													<div className='flex-shrink-0 mr-3 self-center h-full'>
														{getIcon()}
														{action && (
															<div className='mt-2 opacity-0'>
																<Button
																	disabled
																	className={cn(
																		'h-8 inline-flex items-center justify-center text-xs font-medium rounded-md shadow-sm transition-colors'
																	)}></Button>
															</div>
														)}
													</div>
												)}

												{/* Content column */}
												<div className='flex-1 pr-4'>
													{/* Text content container */}
													<div className='flex flex-col'>
														{/* Title and description group - icon will align with this section */}
														<div>
															{title && (
																<div className='font-semibold text-gray-900 leading-tight'>
																	{title}
																</div>
															)}
															{description && (
																<div className='text-sm text-gray-700 mt-0.5 leading-snug'>
																	{description}
																</div>
															)}
														</div>

														{/* Action button - kept separate from the text alignment */}
														{action && (
															<div className='mt-2'>
																<Button
																	onClick={action.onClick}
																	variant='outline'
																	className={cn(
																		'py-2 px-2 h-7 inline-flex items-center justify-center text-xs font-medium rounded-md shadow-sm transition-colors',
																		{
																			'bg-emerald-400 hover:bg-emerald-500':
																				variant === 'success',
																			'bg-amber-400 hover:bg-amber-500':
																				variant === 'warning',
																			'bg-red-400 hover:bg-red-500':
																				variant === 'destructive',
																			'bg-blue-400 hover:bg-blue-500':
																				variant === 'info',
																			'bg-slate-400 hover:bg-slate-500':
																				variant === 'default',
																		}
																	)}>
																	{getActionIcon()}
																	{action.label}
																</Button>
															</div>
														)}
													</div>
												</div>
											</div>

											{/* Close button */}
											{onClose && (
												<button
													onClick={handleClose}
													className='absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400'>
													<X className='h-4 w-4' />
												</button>
											)}
										</div>

										{/* CSS Animation-based Progress bar */}
										{duration > 0 && (
											<div className='h-1.5 w-full bg-gray-100 relative overflow-hidden'>
												<div
													className={cn(
														'absolute top-0 left-0 h-full',
														getProgressColor()
													)}
													style={
														{
															// Set the CSS variable for the glow color
															'--glow-color': getProgressShadowColor(),
															// Pulse glow animation combined with progress animation
															animation: `
															progress-animation ${duration - 300}ms linear forwards,
															glow-pulse 1.5s ease-in-out infinite
														`,
															transformOrigin: 'left',
														} as React.CSSProperties
													}
												/>
											</div>
										)}
									</div>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</>
		);
	}
);

ToastCard.displayName = 'ToastCard';

export default ToastCard;

import React, { useRef } from 'react';
import { animate, motion, useIsPresent, useMotionValue } from 'motion/react';
import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

interface DiffContainerProps {
	color?: string;
	enableIntroAnimation?: boolean;
	children?: React.ReactNode;
	showDiffActions?: boolean;
	onAccept?: () => void;
	onReject?: () => void;
	diffType?: 'neutral' | 'added' | 'removed' | 'changed';
}

const DiffContainer: React.FC<DiffContainerProps> = ({
	color,
	enableIntroAnimation = true,
	children,
	showDiffActions = false,
	onAccept,
	onReject,
	diffType = 'neutral',
}) => {
	const breathe = useMotionValue(0);
	const isPresent = useIsPresent();
	const containerRef = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 400, height: 300 });
	const mainColor = color || 'rgb(77, 140, 255)';

	// Calculate container size based on child element
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				setSize({
					width: rect.width,
					height: rect.height,
				});
			}
		};

		updateSize();
		// Use ResizeObserver to track size changes
		const resizeObserver = new ResizeObserver(updateSize);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	// Enhanced breathing animation - only if not neutral
	useEffect(() => {
		if (!isPresent || diffType === 'neutral') {
			animate(breathe, 0, { duration: 0.5, ease: 'easeInOut' });
			return;
		}

		async function playBreathingAnimation() {
			if (enableIntroAnimation) {
				await animate(breathe, 1, {
					duration: 0.5,
					delay: 0.35,
					ease: [0, 0.55, 0.45, 1],
				});
			} else {
				breathe.set(1);
			}

			// Enhanced breathing animation with stronger effect
			animate(breathe, [null, 0.4, 1.2, 0.6, 1], {
				duration: 8,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});
		}

		playBreathingAnimation();
	}, [isPresent, breathe, enableIntroAnimation, diffType]);

	// Keyboard shortcut handler
	useEffect(() => {
		if (!showDiffActions || diffType === 'neutral') return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Check for Cmd+Y (Mac) or Ctrl+Y (Windows/Linux)
			if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
				e.preventDefault();
				onAccept?.();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [showDiffActions, onAccept, diffType]);

	const enterDuration = enableIntroAnimation ? 1.1 : 0;
	const exitDuration = 0.5;

	// Scale gradients based on container size
	const expandingCircleRadius = Math.max(size.width, size.height) * 0.6;
	const cornerSize = Math.min(size.width, size.height) * 0.8;

	// Diff type colors
	const diffColors = {
		neutral: mainColor,
		added: 'rgb(34, 197, 94)', // green-500
		removed: 'rgb(239, 68, 68)', // red-500
		changed: 'rgb(251, 191, 36)', // amber-400
	};

	const diffColor = diffColors[diffType] || mainColor;

	// If neutral, just render children without any effects
	if (diffType === 'neutral') {
		return <>{children}</>;
	}

	return (
		<>
			{/* Diff action buttons - positioned outside/above the node */}
			{showDiffActions && (
				<div
					className='absolute flex gap-1 text-sm'
					style={{
						top: '-40px',
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 10,
					}}>
					<button
						onClick={onAccept}
						className='h-8 px-3 flex items-center gap-1 bg-green-300 hover:bg-green-100 shadow-sm border rounded text-sm font-medium'
						aria-label='Accept change'>
						<Check className='h-4 w-4 mr-1' />
						Accept
					</button>
					<button
						onClick={onReject}
						className='h-8 px-3 flex items-center gap-1 bg-red-300 hover:bg-red-100 shadow-sm border rounded text-sm font-medium'
						aria-label='Reject change'>
						<X className='h-4 w-4 mr-1' />
						Reject
					</button>
				</div>
			)}

			{/* Container with gradient overlay effect */}
			<div className='relative' ref={containerRef}>
				{/* Children content */}
				{children}

				{/* Gradient overlay - positioned on top of content */}
				<div className='absolute inset-0 overflow-hidden rounded-lg pointer-events-none'>
					{/* Subtle background tint */}
					<div
						className='absolute inset-0'
						style={{
							backgroundColor:
								diffType === 'added'
									? 'rgba(34, 197, 94, 0.2)'
									: diffType === 'removed'
									? 'rgba(239, 68, 68, 0.2)'
									: 'rgba(251, 191, 36, 0.2)',
							backdropFilter: 'blur(3px)',
						}}
					/>

					{/* Expanding circle */}
					{enableIntroAnimation && (
						<motion.div
							className='absolute rounded-full'
							initial={{
								scale: 0,
								opacity: 1,
								backgroundColor: diffColor,
							}}
							animate={{
								scale: 10,
								opacity: 0.2,
								backgroundColor: diffColor,
								transition: {
									duration: enterDuration,
									opacity: { duration: enterDuration, ease: 'easeInOut' },
								},
							}}
							exit={{
								scale: 0,
								opacity: 1,
								backgroundColor: diffColor,
								transition: { duration: exitDuration },
							}}
							style={{
								left: '50%',
								top: '50%',
								width: expandingCircleRadius,
								height: expandingCircleRadius,
								transform: 'translate(-50%, -50%)',
								filter: 'blur(15px)',
							}}
						/>
					)}

					{/* Top Left corner gradient with enhanced breathing */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation
								? { opacity: 0, scale: 0 }
								: { opacity: 0.9, scale: 1 }
						}
						animate={{
							opacity: 0.9,
							transition: enableIntroAnimation
								? {
										duration: enterDuration,
								  }
								: {},
						}}
						exit={{
							opacity: 0,
							scale: 0,
							transition: { duration: exitDuration },
						}}
						style={{
							top: -cornerSize * 0.5,
							left: -cornerSize * 0.5,
							width: cornerSize * 2,
							height: cornerSize * 2,
							background: diffColor,
							filter: 'blur(100px)',
							scale: breathe,
						}}
					/>

					{/* Bottom Right corner gradient with enhanced breathing */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation
								? { opacity: 0, scale: 0 }
								: { opacity: 0.9, scale: 1 }
						}
						animate={{
							opacity: 0.9,
							transition: enableIntroAnimation
								? {
										duration: enterDuration,
								  }
								: {},
						}}
						exit={{
							opacity: 0,
							scale: 0,
							transition: { duration: exitDuration },
						}}
						style={{
							bottom: -cornerSize * 0.5,
							right: -cornerSize * 0.5,
							width: cornerSize * 2,
							height: cornerSize * 2,
							background: diffColor,
							filter: 'blur(100px)',
							scale: breathe,
						}}
					/>
				</div>
			</div>
		</>
	);
};

export default DiffContainer;

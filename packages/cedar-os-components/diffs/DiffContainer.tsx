import React, { useRef } from 'react';
import {
	animate,
	motion,
	useIsPresent,
	useMotionValue,
	useTransform,
} from 'motion/react';
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
	opacity?: number;
}

const DiffContainer: React.FC<DiffContainerProps> = ({
	color,
	enableIntroAnimation = true,
	children,
	showDiffActions = false,
	onAccept,
	onReject,
	diffType = 'neutral',
	opacity = 1,
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

	// Create multiple motion values for complex wave effects
	const wave1 = useMotionValue(0);
	const wave2 = useMotionValue(0);
	const rotate = useMotionValue(0);

	// Create independent breathing motion values for each element
	const breathe1 = useMotionValue(0); // Top left corner
	const breathe2 = useMotionValue(0); // Bottom right corner
	const breathe3 = useMotionValue(0); // Center element

	// Create transformed values for inverse movements
	const wave1Inverted = useTransform(wave1, (v) => -v);
	const wave2Inverted = useTransform(wave2, (v) => -v * 0.8);
	const rotateSlower = useTransform(rotate, (v) => -v * 0.5);
	const rotateFaster = useTransform(rotate, (v) => v * 2);
	const wave2Amplified = useTransform(wave2, (v) => v * 1.6);
	const wave1Dampened = useTransform(wave1, (v) => v * 1.5);
	const breatheScaled = useTransform(breathe1, (v) => v * 1.2);

	// Enhanced breathing animation - only if not neutral
	useEffect(() => {
		if (!isPresent || diffType === 'neutral') {
			animate(breathe, 0, { duration: 0.5, ease: 'easeInOut' });
			animate(breathe1, 0, { duration: 0.5, ease: 'easeInOut' });
			animate(breathe2, 0, { duration: 0.5, ease: 'easeInOut' });
			animate(breathe3, 0, { duration: 0.5, ease: 'easeInOut' });
			return;
		}

		async function playBreathingAnimation() {
			if (enableIntroAnimation) {
				// Set initial values to 0 for bloom effect
				breathe1.set(0);
				breathe2.set(0);
				breathe3.set(0);

				// Await all initial animations together
				await Promise.all([
					animate(breathe, 1, {
						duration: 0.5,
						delay: 0.35,
						ease: [0, 0.55, 0.45, 1],
					}),
					animate(breathe1, 1, {
						duration: 0.5,
						delay: 0.35,
						ease: [0, 0.55, 0.45, 1],
					}),
					animate(breathe2, 1, {
						duration: 0.5,
						delay: 0.55, // Slightly delayed
						ease: [0, 0.55, 0.45, 1],
					}),
					animate(breathe3, 1, {
						duration: 0.5,
						delay: 0.55, // More delayed
						ease: [0, 0.55, 0.45, 1],
					}),
				]);
			} else {
				breathe.set(1);
				breathe1.set(1);
				breathe2.set(1);
				breathe3.set(1);
			}

			// Independent breathing animations with different patterns and timing
			// Top left corner - standard breathing
			animate(breathe1, [1, 0.8, 1.3, 0.8, 1], {
				duration: 5,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});

			// Bottom right corner - different rhythm and amplitude
			animate(breathe2, [1, 1.2, 0.7, 1.4, 0.9, 1], {
				duration: 6.5,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});

			// Center element - unique pattern with different timing
			animate(breathe3, [1, 0.9, 1.1, 1.3, 0.8, 1.2, 1], {
				duration: 7.8,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});

			// Wave motion 1 - horizontal drift (reduced movement)
			animate(wave1, [-10, 10, -10], {
				duration: 9,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});

			// Wave motion 2 - vertical drift (reduced movement)
			animate(wave2, [-8, 8, -8], {
				duration: 7,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'easeInOut',
			});

			// Slow rotation for organic movement
			animate(rotate, [0, 360], {
				duration: 13,
				repeat: Infinity,
				repeatType: 'loop',
				ease: 'linear',
			});
		}

		playBreathingAnimation();
	}, [
		isPresent,
		breathe,
		breathe1,
		breathe2,
		breathe3,
		wave1,
		wave2,
		rotate,
		enableIntroAnimation,
		diffType,
	]);

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
		removed: 'rgba(239, 68, 68, 0.85)', // red-500, less opaque
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
					className='absolute flex gap-1 text-xs '
					style={{
						top: '-40px',
						left: '50%',
						transform: 'translateX(-50%)',
						zIndex: 10,
					}}>
					<button
						onClick={onAccept}
						className='h-8 px-3 flex items-center gap-1 bg-green-500/90 hover:bg-green-400/90 shadow-sm border rounded text-sm font-medium'
						aria-label='Accept change'>
						<Check className='h-4 w-4' />
						Accept
						<span className='ml-1 flex items-center gap-0.5'>
							<span>⌘</span>
							<span>Y</span>
						</span>
					</button>
					<button
						onClick={onReject}
						className='h-8 px-3 flex items-center gap-1 bg-red-500/90 hover:bg-red-400/90 shadow-sm border rounded text-sm font-medium'
						aria-label='Reject change'>
						<X className='h-4 w-4' />
						Reject
						<span className='ml-1 flex items-center gap-0.5'>
							<span>⌘</span>
							<span>N</span>
						</span>
					</button>
				</div>
			)}

			{/* Container with gradient overlay effect */}
			<div className='relative' ref={containerRef}>
				{/* Children content */}
				{children}

				{/* Gradient overlay - positioned on top of content */}
				<div
					className='absolute inset-0 overflow-hidden rounded-lg pointer-events-none'
					style={{ zIndex: 1 }}>
					{/* Expanding circle */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation
								? {
										scale: 0,
										opacity: 1,
										backgroundColor: diffColor,
								  }
								: {
										scale: 4,
										opacity: 0.2,
										backgroundColor: diffColor,
								  }
						}
						animate={{
							scale: 5,
							opacity: 0.2 * opacity,
							backgroundColor: diffColor,
							transition: enableIntroAnimation
								? {
										duration: enterDuration,
										opacity: { duration: enterDuration, ease: 'easeInOut' },
								  }
								: { duration: 0 },
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

					{/* Top Left corner gradient with wave motion */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation ? { opacity: 0 } : { opacity: 0.9 * opacity }
						}
						animate={{
							opacity: 0.8 * opacity,
							transition: enableIntroAnimation
								? {
										duration: enterDuration,
								  }
								: {},
						}}
						exit={{
							opacity: 0,
							transition: { duration: exitDuration },
						}}
						style={{
							top: -cornerSize * 0.5,
							left: -cornerSize * 0.5,
							width: cornerSize * 1.6,
							height: cornerSize * 1.6,
							background: diffColor,
							filter: 'blur(45px)',
							scale: breatheScaled,
							x: wave1,
							y: wave2,
							rotate: rotate,
						}}
					/>

					{/* Bottom Right corner gradient with inverse wave motion */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation ? { opacity: 0 } : { opacity: 0.9 * opacity }
						}
						animate={{
							opacity: 0.9 * opacity,
							transition: enableIntroAnimation
								? {
										duration: enterDuration,
								  }
								: {},
						}}
						exit={{
							opacity: 0,
							transition: { duration: exitDuration },
						}}
						style={{
							bottom: -cornerSize * 0.5,
							right: -cornerSize * 0.5,
							width: cornerSize * 1.5,
							height: cornerSize * 1.5,
							background: diffColor,
							filter: 'blur(40px)',
							scale: breathe2,
							x: wave1Inverted, // Inverse horizontal movement
							y: wave2Inverted, // Slightly different vertical movement
							rotate: rotateSlower, // Slower counter-rotation
						}}
					/>

					{/* Additional center gradient for more complexity */}
					<motion.div
						className='absolute rounded-full'
						initial={
							enableIntroAnimation ? { opacity: 0 } : { opacity: 0.6 * opacity }
						}
						animate={{
							opacity: 0.6 * opacity,
							transition: enableIntroAnimation
								? {
										duration: enterDuration * 1.2,
								  }
								: {},
						}}
						exit={{
							opacity: 0,
							transition: { duration: exitDuration },
						}}
						style={{
							top: '0%',
							left: '40%',
							width: cornerSize * 1.5,
							height: cornerSize * 1.5,
							background: diffColor,
							filter: 'blur(50px)',
							scale: breathe3,
							x: wave2Amplified,
							y: wave1Dampened,
							rotate: rotateFaster,
						}}
					/>
				</div>
			</div>
		</>
	);
};

export default DiffContainer;

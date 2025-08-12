import React, { useEffect, useState, useRef } from 'react';
import {
	motion,
	AnimatePresence,
	MotionStyle,
	TargetAndTransition,
} from 'framer-motion';
import { cn } from '@/styles/stylingUtils';
import { useStyling } from '@/store/CedarStore';
import { SPRING_CONFIGS } from '@/components/guidance/utils/constants';

interface TooltipTextProps {
	content: string;
	backgroundColor?: string;
	className?: string;
	textColor?: string;
	position?:
		| 'left'
		| 'right'
		| 'top'
		| 'bottom'
		| 'top-left'
		| 'top-free'
		| 'custom';
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor tooltip to rect or cursor position
	fadeOut?: boolean;
	endRect?: DOMRect | null;
	onEnd?: () => void;
}

interface PositionStyle {
	position: 'fixed' | 'absolute';
	top?: number;
	left?: number;
	right?: number;
	marginTop?: number;
	marginLeft?: number;
	transform?: string;
}

const TooltipText: React.FC<TooltipTextProps> = ({
	content,
	backgroundColor,
	className,
	position = 'bottom',
	textColor: overrideTextColor,
	tooltipAnchor = 'rect',
	onEnd,
	fadeOut = false,
	endRect = null,
}: TooltipTextProps) => {
	const { styling } = useStyling();
	// Get color from context
	const bgColor = backgroundColor || styling?.color || '#319B72';
	const textColor = overrideTextColor || styling?.textColor || '#FFFFFF';
	const tooltipStyle = styling?.tooltipStyle || 'solid';
	// Get fontSize from styling config
	const tooltipFontSize = styling?.tooltipSize || 'sm';

	const contentRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const [dimensions, setDimensions] = useState({ width: 60, height: 0 });
	const [adjustedPosition, setAdjustedPosition] = useState(position);

	const [showText, setShowText] = useState(false);
	// Precompute dimensions when content changes or show changes
	useEffect(() => {
		if (content && measureRef.current) {
			// This element has full width so we can measure the natural height
			measureRef.current.style.width = '320px'; // Max width for measurement
			measureRef.current.style.visibility = 'hidden';
			measureRef.current.style.position = 'absolute';
			measureRef.current.style.whiteSpace = 'normal';
			measureRef.current.innerText = content;

			// Get dimensions after a short delay to ensure proper rendering
			const timer = setTimeout(() => {
				if (measureRef.current) {
					const contentWidth = measureRef.current.scrollWidth;
					// Set a minimum width of 60px and maximum of 320px
					const maxWidth = Math.min(320, Math.max(60, contentWidth));
					// Get computed height at maxWidth
					const computedHeight = measureRef.current.offsetHeight;

					setDimensions({
						width: maxWidth, // Start narrow if not showing
						height: computedHeight, // But with correct height from the start
					});
				}
			}, 10);

			return () => clearTimeout(timer);
		}
	}, [content]);

	// Check if tooltip would be cut off by screen edges and adjust position if needed
	useEffect(() => {
		if (contentRef.current && dimensions.width > 32) {
			// Default to the provided position
			let newPosition = position;

			// Get viewport dimensions
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			// Get tooltip dimensions
			const tooltipWidth = dimensions.width;
			const tooltipHeight = contentRef.current.offsetHeight;

			// If we have an endRect, position relative to it
			if (endRect) {
				// Check if tooltip would go off the right edge
				if (
					position === 'right' &&
					endRect.right + tooltipWidth + 24 > viewportWidth
				) {
					newPosition = 'left';
				}

				// Check if tooltip would go off the left edge
				else if (position === 'left' && endRect.left - tooltipWidth - 8 < 0) {
					newPosition = 'right';
				}

				// Check if tooltip would go off the top edge
				else if (position === 'top' && endRect.top - tooltipHeight - 8 < 0) {
					newPosition = 'bottom';
				}

				// Check if tooltip would go off the bottom edge
				else if (
					position === 'bottom' &&
					endRect.bottom + tooltipHeight + 24 > viewportHeight
				) {
					newPosition = 'top';
				}
			}

			setAdjustedPosition(newPosition);
		}
	}, [position, dimensions.width, endRect]);

	// Define custom width animation spring config
	const widthAnimationConfig = {
		type: 'spring' as 'spring' | 'tween',
		stiffness: 40,
		damping: 15,
		mass: 3,
		duration: 0.5,
	};

	// Determine positioning styles based on the position prop and endRect
	const getPositionStyles = (): PositionStyle => {
		// If position is 'custom', don't apply any positioning
		if (adjustedPosition === 'custom') {
			return { position: 'absolute' };
		}

		// If we have an endRect and tooltipAnchor is set to 'rect', position relative to the rect
		if (endRect && tooltipAnchor === 'rect') {
			const centerX = endRect.left + endRect.width / 2;
			const centerY = endRect.top + endRect.height / 2;

			switch (adjustedPosition) {
				case 'left':
					return {
						position: 'fixed',
						top: centerY,
						left: endRect.left - 8,
						transform: 'translateY(-50%) translateX(-100%)',
					};
				case 'right':
					return {
						position: 'fixed',
						top: centerY,
						left: endRect.right + 8,
						transform: 'translateY(-50%)',
					};
				case 'top':
					return {
						position: 'fixed',
						top: endRect.top - 10,
						left: centerX,
						transform: 'translateX(-50%) translateY(-100%)',
					};
				case 'top-left':
					return {
						position: 'fixed',
						top: endRect.top - 10,
						right: window.innerWidth - endRect.right,
						transform: 'translateY(-100%)',
					};
				case 'top-free':
					return {
						position: 'fixed',
						top: endRect.top - 10,
						transform: 'translateY(-100%)',
					};
				case 'bottom':
				default:
					return {
						position: 'fixed',
						top: endRect.bottom + 10,
						left: centerX,
						transform: 'translateX(-50%)',
					};
			}
		}

		// Otherwise use the default relative positioning to the cursor
		switch (adjustedPosition) {
			case 'left':
				return {
					position: 'absolute',
					marginLeft: -8,
					marginTop: 0,
					transform: 'translateX(-100%)',
				};
			case 'right':
				return {
					position: 'absolute',
					marginLeft: 24,
					marginTop: 0,
				};
			case 'top':
				return {
					position: 'absolute',
					marginTop: -8,
					marginLeft: 0,
					transform: 'translateX(-50%) translateY(-160%)',
				};
			case 'bottom':
				return {
					position: 'absolute',
					marginTop: 10,
					marginLeft: 0,
					transform: 'translateX(-50%)',
				};
			case 'top-free':
				return {
					position: 'fixed',
					marginTop: -8,
					transform: 'translateY(-100%)',
				};
			case 'top-left':
				return {
					position: 'absolute',
					marginTop: -8,
					marginLeft: 0,
					transform: 'translateX(-100%) translateY(-100%)',
				};
			default:
				return { position: 'absolute' };
		}
	};

	// Determine style based on the tooltipStyle config
	const getTooltipStyling = () => {
		if (tooltipStyle === 'lined') {
			return {
				backgroundColor: 'white',
				color: textColor || '#000000',
				borderColor: bgColor,
				boxShadow: `0 0 8px 2px ${bgColor}80, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
			};
		}
		return {
			backgroundColor: bgColor,
			color: textColor,
			borderColor: 'white',
		};
	};

	// Get animation props with updated animation spring
	const getAnimationProps = (): TargetAndTransition => {
		const positionStyles = getPositionStyles();
		const animationProps: TargetAndTransition = {
			opacity: fadeOut ? 0 : 1,
			width: dimensions.width,
			height: dimensions.height > 0 ? dimensions.height : 'auto', // Use fixed height if precomputed
		};

		// Add breathing animation if tooltip is visible and not fading out
		if (!fadeOut) {
			// Add enhanced shadow pulsing based on the tooltip style
			if (tooltipStyle === 'lined') {
				animationProps.boxShadow = [
					`0 0 8px 2px ${bgColor}80, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
					`0 0 14px 6px ${bgColor}90, 0 6px 10px -1px rgba(0, 0, 0, 0.12)`,
					`0 0 8px 2px ${bgColor}80, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
				];
				// Add a subtle border color animation for lined style
				animationProps.borderColor = [
					bgColor,
					`${bgColor}FF`, // Fully opaque for middle state
					bgColor,
				];
			} else {
				// For solid style, add a more pronounced glow effect
				animationProps.boxShadow = [
					`0 0 2px 1px ${bgColor}30, 0 2px 4px -1px rgba(0, 0, 0, 0.1)`,
					`0 0 12px 4px ${bgColor}50, 0 4px 8px -1px rgba(0, 0, 0, 0.15)`,
					`0 0 2px 1px ${bgColor}30, 0 2px 4px -1px rgba(0, 0, 0, 0.1)`,
				];
				// Add a subtle brightness animation for solid style
				animationProps.filter = [
					'brightness(1)',
					'brightness(1.05)',
					'brightness(1)',
				];
			}
		}

		// Add numerical position values to animation
		if (positionStyles.top !== undefined) {
			animationProps.top = positionStyles.top;
		}
		if (positionStyles.left !== undefined) {
			animationProps.left = positionStyles.left;
		}
		if (positionStyles.right !== undefined) {
			animationProps.right = positionStyles.right;
		}
		if (positionStyles.marginTop !== undefined) {
			animationProps.marginTop = positionStyles.marginTop;
		}
		if (positionStyles.marginLeft !== undefined) {
			animationProps.marginLeft = positionStyles.marginLeft;
		}

		return animationProps;
	};

	// Get static styles that won't be animated
	const getStaticStyles = (): MotionStyle => {
		const positionStyles = getPositionStyles();
		const tooltipStyling = getTooltipStyling();

		return {
			// position: positionStyles.position,
			transform: positionStyles.transform,
			...tooltipStyling,
		};
	};

	useEffect(() => {
		if (showText) {
			// Calculate total animation time based on content length
			// Base delay (0.5s) + (character count * 0.03s delay per char) + extra time for safety
			const totalAnimationTime = 1 + content.length * 0.03 + 0.4;

			const timeout = setTimeout(() => {
				if (onEnd) onEnd();
			}, totalAnimationTime * 1000);

			return () => clearTimeout(timeout);
		}
	}, [showText, content, onEnd]);

	return (
		<>
			{/* Hidden element for measurement */}
			<div
				ref={measureRef}
				className={cn(
					'fixed',
					'opacity-0',
					'pointer-events-none',
					{
						'text-xs': tooltipFontSize === 'xs',
						'text-sm': tooltipFontSize === 'sm',
						'text-base': tooltipFontSize === 'base',
						'text-lg': tooltipFontSize === 'lg',
						'text-xl': tooltipFontSize === 'xl',
						'text-2xl': tooltipFontSize === '2xl',
					},
					'p-2 px-3'
				)}
				aria-hidden='true'
			/>

			<motion.div
				id='cedar-tooltip'
				className={cn(
					endRect ? 'fixed' : 'absolute',
					'border-2',
					'rounded-lg shadow-lg',
					{
						'text-xs': tooltipFontSize === 'xs',
						'text-sm': tooltipFontSize === 'sm',
						'text-base': tooltipFontSize === 'base',
						'text-lg': tooltipFontSize === 'lg',
						'text-xl': tooltipFontSize === 'xl',
						'text-2xl': tooltipFontSize === '2xl',
					},
					'whitespace-normal p-2 px-3',
					className
				)}
				initial={{
					opacity: 0,
					width: 60,
					height: dimensions.height || 'auto',
					...getPositionValues(),
				}}
				animate={getAnimationProps()}
				transition={{
					...SPRING_CONFIGS.EDGE_POINTER,
					opacity: { duration: 0.3 },
					height: { duration: 0 },
					width: widthAnimationConfig,
					boxShadow: {
						repeat: Infinity,
						duration: 2.5,
						ease: 'easeInOut',
						times: [0, 0.5, 1],
					},
					borderColor: {
						repeat: Infinity,
						duration: 2.5,
						ease: 'easeInOut',
						times: [0, 0.5, 1],
					},
					filter: {
						repeat: Infinity,
						duration: 2.5,
						ease: 'easeInOut',
						times: [0, 0.5, 1],
					},
				}}
				onAnimationComplete={() => setShowText(true)}
				style={getStaticStyles()}>
				<div ref={contentRef} className='relative'>
					<AnimatePresence mode='wait'>
						<motion.p
							className='text-center'
							initial={{ opacity: 1 }}
							animate={{
								opacity: fadeOut ? 0 : 1,
								transition: {
									duration: 0.2,
								},
							}}>
							{content.split('').map((char, index) => (
								<motion.span
									key={index}
									initial={{ opacity: 0 }}
									animate={{ opacity: fadeOut ? 0 : 1 }}
									transition={{
										duration: 0.1,
										delay: index * 0.03 + 0.6,
									}}>
									{char}
								</motion.span>
							))}
						</motion.p>
					</AnimatePresence>
				</div>
			</motion.div>
		</>
	);

	// Helper function to extract only positioning values from getAnimationProps
	// This is needed to avoid setting width/height/opacity twice
	function getPositionValues() {
		const positionStyles = getPositionStyles();
		const positionProps: {
			top?: number;
			left?: number;
			right?: number;
			marginTop?: number;
			marginLeft?: number;
		} = {};

		// Add numerical position values to animation
		if (positionStyles.top !== undefined) {
			positionProps.top = positionStyles.top;
		}
		if (positionStyles.left !== undefined) {
			positionProps.left = positionStyles.left;
		}
		if (positionStyles.right !== undefined) {
			positionProps.right = positionStyles.right;
		}
		if (positionStyles.marginTop !== undefined) {
			positionProps.marginTop = positionStyles.marginTop;
		}
		if (positionStyles.marginLeft !== undefined) {
			positionProps.marginLeft = positionStyles.marginLeft;
		}

		return positionProps;
	}
};

export default TooltipText;

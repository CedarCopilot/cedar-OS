import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import TooltipText from '@/components/guidance/components/TooltipText';
import { useStyling } from '@/store/CedarStore';
import { Position } from '@/components/guidance/utils/positionUtils';

// Define Timeout type
export type Timeout = ReturnType<typeof setTimeout>;

// Calculate best tooltip position based on viewport visibility using screen quadrants
export const calculateBestTooltipPosition = (
	position: Position,
	tooltipContent: string | undefined,
	positionOverride?: 'left' | 'right' | 'top' | 'bottom'
): 'left' | 'right' | 'top' | 'bottom' => {
	// If preferred position is provided, use it
	if (positionOverride) {
		return positionOverride;
	}

	// If no content, default to right
	if (!tooltipContent) {
		return 'right';
	}

	// Get viewport dimensions
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	// Determine screen center points
	const centerX = viewportWidth / 2;
	const centerY = viewportHeight / 2;

	// Determine which quadrant the cursor is in
	const isRight = position.x >= centerX;
	const isBottom = position.y >= centerY;

	// Choose position based on quadrant to keep tooltip on screen
	if (isRight) {
		// Right side of screen - prefer left tooltip
		if (isBottom) {
			// Bottom-right quadrant - use left or top
			// For elements near bottom, prioritize top
			if (position.y > viewportHeight - 150) {
				return 'top';
			}
			return 'left';
		} else {
			// Top-right quadrant - use left or bottom
			return 'left';
		}
	} else {
		// Left side of screen - prefer right tooltip
		if (isBottom) {
			// Bottom-left quadrant - use right or top
			// For elements near bottom, prioritize top
			if (position.y > viewportHeight - 150) {
				return 'top';
			}
			return 'right';
		} else {
			// Top-left quadrant - use right or bottom
			return 'right';
		}
	}
};

interface BaseCursorProps {
	startPosition: Position;
	endPosition: Position;
	fadeOut: boolean;
	onAnimationComplete: () => void;
	children?: ReactNode;
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor tooltip to rect or cursor
	showTooltip?: boolean;
	onTooltipComplete: () => void;
	cursorKey?: string;
	endRect?: DOMRect | null;
	dragCursor?: boolean; // Whether to use the drag cursor animation
}

const BaseCursor: React.FC<BaseCursorProps> = ({
	startPosition,
	endPosition,
	fadeOut,
	onAnimationComplete,
	children,
	tooltipText,
	tooltipPosition = 'bottom',
	tooltipAnchor = 'rect',
	showTooltip = false,
	onTooltipComplete,
	cursorKey = 'base-cursor',
	endRect = null,
	dragCursor = false,
}) => {
	const { styling } = useStyling();
	const [dragState, setDragState] = React.useState(
		dragCursor ? 'closed' : 'normal'
	);
	const animationCompleteCallback = React.useRef(onAnimationComplete);

	React.useEffect(() => {
		animationCompleteCallback.current = onAnimationComplete;
	}, [onAnimationComplete]);

	// Determine animation config based on dragCursor
	const animationConfig = React.useMemo(() => {
		if (dragCursor) {
			// Slower, ease-in-out animation for drag operations
			return {
				type: 'tween' as const,
				duration: 1, // Duration for the movement
				ease: 'easeInOut', // Smooth ease-in-out curve
				delay: 0.3, // Delay before starting movement
			};
		}
		// Default spring animation for standard cursor movements
		return {
			type: 'spring' as const,
			stiffness: 50,
			damping: 17,
			mass: 1.8,
		};
	}, [dragCursor]);

	// Handle animation states for drag cursor
	React.useEffect(() => {
		if (dragCursor) {
			// Start with open hand
			setDragState('open');

			// After 0.3s delay, close the hand to start the drag
			const closeHandTimeout = setTimeout(() => {
				setDragState('closed');
			}, 300);

			return () => clearTimeout(closeHandTimeout);
		}
	}, [dragCursor]);

	// Handle the completion of the movement animation
	const handleMovementComplete = () => {
		if (dragCursor) {
			// Open hand immediately after movement completes
			setDragState('open');

			// After 0.3s delay, call the onAnimationComplete callback
			const completeTimeout = setTimeout(() => {
				animationCompleteCallback.current();
			}, 300);

			return () => clearTimeout(completeTimeout);
		} else {
			// For non-drag animations, call the callback immediately
			onAnimationComplete();
		}
	};

	// Render different cursor SVGs based on dragState
	const renderCursor = () => {
		if (!dragCursor || dragState === 'normal') {
			// Default pointer cursor
			return (
				<svg
					width='28'
					height='28'
					viewBox='0 0 28 28'
					className='drop-shadow-lg'
					fill='none'
					xmlns='http://www.w3.org/2000/svg'>
					<path
						d='M5 5l7.5 19c.15.4.7.4.85 0l2.5-7.5c.05-.2.25-.35.45-.4l7.5-2.5c.4-.15.4-.7 0-.85L5 5z'
						fill={styling.color}
						stroke='white'
						strokeWidth='2'
						strokeLinejoin='round'
						strokeLinecap='round'
						filter='drop-shadow(2px 2px 2px rgba(0,0,0,0.2))'
					/>
				</svg>
			);
		} else if (dragState === 'closed') {
			return (
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='24'
					height='24'
					viewBox='0 0 24 24'
					shape-rendering='geometricPrecision'
					text-rendering='geometricPrecision'
					stroke='white'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
					fill={styling.color}
					style={{ transform: 'rotate(-10deg)', transformOrigin: 'center' }}>
					<path
						d='M5.645657,12.921431C5.645657,10.921431,7,9,7,9s-.000003-2.25391.999997-2.25391s3.000003-1.048115,3.000003-1.048115C12,5.697975,13,8,14,8s2,0,2,0c.339182-.363903.442588,1.703713,1,4s-1,3-1,3-1,1-2,1-2-1-3-1-1-1.118108-3,1s5.014276-1.438534-2.354343,0-2.436681-8.7646,0-3.078569Z'
						transform='matrix(1.069886 0 0 0.563349 0.033526 5.923944)'
					/>
					<path
						d='M18,11.5L18,9c0-1.1-.9-2-2-2s-2,.9-2,2v1.4m0-.4v-2c0-1.1-.9-2-2-2s-2,.9-2,2v2m0-.1v-.9c0-1.1-.9-2-2-2s-2,.9-2,2v5m0,0c0-1.1-.9-2-2-2s-2,.9-2,2m16-3c0-1.1.9-2,2-2s2,.9,2,2v3c0,4.4-3.6,8-8,8h-4c-4.4,0-8-3.6-8-8c0-1.1.9-2,2-2s2,.9,2,2'
						transform='translate(.073735-.000001)'
					/>
				</svg>
			);
		} else if (dragState === 'open') {
			return (
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='24'
					height='24'
					viewBox='0 0 24 24'
					shape-rendering='geometricPrecision'
					text-rendering='geometricPrecision'
					stroke='white'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
					fill={styling.color}
					style={{ transform: 'rotate(-10deg)', transformOrigin: 'center' }}>
					<path d='M6,12c0-2,1-3,1-3s0-3,1-3s3,0,3,0c1,0,3.044645,0,4.044645,0s4.274213,3,4.274213,3s.146377,2.23.146377,4.23C19.465235,15.23,16,15,16,15s-1,1-2,1-2-1-3-1-2,1-3,1-5.106985-1.457274-4.109295-2s2.828922-1.670171,2.109295-2Z' />
					<path
						d='M18,11v-5c0-1.1-.9-2-2-2s-2,.9-2,2m0,4v-6c0-1.1-.9-2-2-2s-2,.9-2,2v2m0,4.5L10,6c0-1.1-.9-2-2-2s-2,.9-2,2v8M18,8c0-1.1.9-2,2-2s2,.9,2,2v6c0,4.4-3.6,8-8,8h-2c-2.8,0-4.5-.86-5.99-2.34l-3.6-3.6c-.78-.78-.78-2.05,0-2.83s2.05-.78,2.83,0L7,15'
						transform='translate(-.251873 0)'
					/>
				</svg>
			);
		}
	};

	return (
		<motion.div
			key={cursorKey}
			initial={{
				opacity: 1,
				top: startPosition.y,
				left: startPosition.x,
			}}
			animate={{
				opacity: 1,
				top: endPosition.y,
				left: endPosition.x,
			}}
			onAnimationComplete={handleMovementComplete}
			transition={animationConfig}
			style={{
				position: 'fixed',
				zIndex: 9999,
			}}
			className='pointer-events-none'>
			{renderCursor()}

			{tooltipText && showTooltip ? (
				<TooltipText
					content={tooltipText}
					position={tooltipPosition}
					tooltipAnchor={tooltipAnchor}
					onEnd={() => {
						onTooltipComplete();
					}}
					fadeOut={fadeOut}
					endRect={endRect}
				/>
			) : (
				children
			)}
		</motion.div>
	);
};

export default BaseCursor;

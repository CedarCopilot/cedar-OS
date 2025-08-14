import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Position } from '@/components/guidance/utils/positionUtils';
import { useStyling } from '@/store/CedarStore';
import TooltipText from '@/components/guidance/components/TooltipText';
import { SPRING_CONFIGS } from '@/components/guidance/utils/constants';

interface EdgePointerProps {
	startPosition: Position; // Starting position, same as BaseCursor
	endRect: DOMRect; // The endRect from VirtualCursor to determine edge position
	fadeOut?: boolean;
	tooltipText?: string;
	onAnimationComplete?: () => void;
	onTooltipComplete?: () => void;
	shouldAnimateStartMotion: boolean;
}

/**
 * Calculate the position and rotation of the edge pointer
 * @param targetRect The target DOM rect
 * @returns Position, angle, and edge information
 */
const calculateEdgePointerPosition = (
	targetRect: DOMRect
): {
	position: Position;
	angle: number;
	edge: 'top' | 'right' | 'bottom' | 'left';
} => {
	// Get viewport dimensions
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	// Calculate center of viewport and target
	const centerX = viewportWidth / 2;
	const centerY = viewportHeight / 2;
	const targetX = targetRect.left + targetRect.width / 2;
	const targetY = targetRect.top + targetRect.height / 2;

	// Edge padding for better visibility
	const edgePadding = 40;
	const rightEdgePadding = 60; // Extra padding for right edge to account for scrollbars

	// Calculate angle from center to target
	const angleRad = Math.atan2(targetY - centerY, targetX - centerX);
	const angleDeg = (angleRad * 180) / Math.PI + 135;

	// Determine which edge the pointer should be placed on
	let edge: 'top' | 'right' | 'bottom' | 'left';
	let edgeX: number;
	let edgeY: number;

	// Check if target is off the right side
	if (targetRect.left > viewportWidth) {
		edge = 'right';
		edgeX = viewportWidth - rightEdgePadding;
		edgeY = Math.max(
			edgePadding,
			Math.min(viewportHeight - edgePadding, targetY)
		);
	}
	// Check if target is off the left side
	else if (targetRect.right < 0) {
		edge = 'left';
		edgeX = edgePadding;
		edgeY = Math.max(
			edgePadding,
			Math.min(viewportHeight - edgePadding, targetY)
		);
	}
	// Check if target is off the bottom
	else if (targetRect.top > viewportHeight) {
		edge = 'bottom';
		edgeY = viewportHeight - edgePadding;
		edgeX = Math.max(
			edgePadding,
			Math.min(viewportWidth - rightEdgePadding, targetX)
		);
	}
	// Check if target is off the top
	else if (targetRect.bottom < 0) {
		edge = 'top';
		edgeY = edgePadding;
		edgeX = Math.max(
			edgePadding,
			Math.min(viewportWidth - rightEdgePadding, targetX)
		);
	}
	// Fallback - choose the closest edge
	else {
		const distToRight = viewportWidth - targetX;
		const distToLeft = targetX;
		const distToBottom = viewportHeight - targetY;
		const distToTop = targetY;

		const minDist = Math.min(distToRight, distToLeft, distToBottom, distToTop);

		if (minDist === distToRight) {
			edge = 'right';
			edgeX = viewportWidth - rightEdgePadding;
			edgeY = targetY;
		} else if (minDist === distToLeft) {
			edge = 'left';
			edgeX = edgePadding;
			edgeY = targetY;
		} else if (minDist === distToBottom) {
			edge = 'bottom';
			edgeY = viewportHeight - edgePadding;
			edgeX = targetX;
		} else {
			edge = 'top';
			edgeY = edgePadding;
			edgeX = targetX;
		}
	}

	// Ensure we stay within viewport bounds
	edgeX = Math.max(
		edgePadding,
		Math.min(viewportWidth - rightEdgePadding, edgeX)
	);
	edgeY = Math.max(edgePadding, Math.min(viewportHeight - edgePadding, edgeY));

	return {
		position: { x: edgeX, y: edgeY },
		angle: angleDeg,
		edge,
	};
};

const EdgePointer: React.FC<EdgePointerProps> = ({
	startPosition,
	endRect,
	fadeOut = false,
	tooltipText = 'The element is off screen here!',
	onAnimationComplete,
	onTooltipComplete,
	shouldAnimateStartMotion,
}) => {
	const { styling } = useStyling();
	const [showTooltip, setShowTooltip] = useState(false);
	// Calculate edge pointer position from the endRect
	const pointerData = calculateEdgePointerPosition(endRect);

	// Get the appropriate spring configuration
	const actualSpringConfig = fadeOut
		? SPRING_CONFIGS.FADEOUT
		: SPRING_CONFIGS.EDGE_POINTER;

	// Handler for cursor animation completion
	const handleAnimationComplete = () => {
		if (onAnimationComplete) {
			onAnimationComplete();
		}

		// Show tooltip after animation completes
		if (tooltipText) {
			setShowTooltip(true);
		}
	};

	// Handler for tooltip completion
	const handleTooltipComplete = () => {
		if (onTooltipComplete) {
			onTooltipComplete();
		}
	};

	// Convert edge to tooltip position
	const getTooltipPosition = (): 'left' | 'right' | 'top' | 'bottom' => {
		// Return the opposite direction of the edge
		switch (pointerData.edge) {
			case 'top':
				return 'bottom'; // If pointer is at top edge, tooltip below it
			case 'right':
				return 'left'; // If pointer is at right edge, tooltip left of it
			case 'bottom':
				return 'top'; // If pointer is at bottom edge, tooltip above it
			case 'left':
				return 'right'; // If pointer is at left edge, tooltip right of it
			default:
				return 'top';
		}
	};

	// Create a fake DOMRect to position the tooltip correctly
	const createPointerRect = (): DOMRect => {
		return {
			x: pointerData.position.x,
			y: pointerData.position.y,
			width: 28,
			height: 28,
			top: pointerData.position.y - 16,
			right: pointerData.position.x + 20,
			bottom: pointerData.position.y + 20,
			left: pointerData.position.x - 16,
			toJSON: () => {},
		};
	};

	return (
		<motion.div
			key='edge-pointer'
			initial={{
				opacity: 1,
				top: shouldAnimateStartMotion
					? startPosition.y
					: pointerData.position.y,
				left: shouldAnimateStartMotion
					? startPosition.x
					: pointerData.position.x,
			}}
			animate={{
				opacity: fadeOut ? 0 : 1,
				top: pointerData.position.y,
				left: pointerData.position.x,
			}}
			onAnimationComplete={handleAnimationComplete}
			transition={actualSpringConfig}
			style={{
				position: 'fixed',
				zIndex: 9999,
				pointerEvents: 'none',
			}}>
			{/* Cursor SVG */}
			<svg
				width='28'
				height='28'
				viewBox='0 0 28 28'
				className='drop-shadow-lg'
				style={{ transform: `rotate(${pointerData.angle}deg)` }}
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

			{/* Tooltip */}
			{tooltipText && showTooltip && (
				<TooltipText
					content={tooltipText}
					position={getTooltipPosition()}
					tooltipAnchor='rect'
					onEnd={handleTooltipComplete}
					fadeOut={fadeOut}
					endRect={createPointerRect()}
				/>
			)}
		</motion.div>
	);
};

export default EdgePointer;

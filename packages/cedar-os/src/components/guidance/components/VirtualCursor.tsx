import BaseCursor, {
	Timeout,
} from '@/components/guidance/components/BaseCursor';
import ClickableArea from '@/components/guidance/components/ClickableArea';
import EdgePointer from '@/components/guidance/components/EdgePointer';
import TooltipText from '@/components/guidance/components/TooltipText';
import {
	getPositionFromElementWithViewport,
	getRectFromPositionOrElement,
	PositionOrElement,
	Position,
} from '@/components/guidance/utils/positionUtils';
import { getScreenCenterPosition } from '@/components/guidance/utils/elementUtils';
import { SPRING_CONFIGS } from '@/components/guidance/utils/constants';
import { motion } from 'framer-motion';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Helper function to check if a rect is within the viewport
const isRectInViewport = (
	rect: DOMRect | null,
	padding: number = 0
): boolean => {
	if (!rect || typeof window === 'undefined') {
		return true; // Default to true if no rect or on server-side
	}

	return (
		rect.left >= padding &&
		rect.top >= padding &&
		rect.right <= window.innerWidth - padding &&
		rect.bottom <= window.innerHeight - padding
	);
};

interface VirtualCursorProps {
	endPosition: PositionOrElement; // End position - either a Position or HTMLElement
	startPosition?: PositionOrElement; // Start position - either a Position or HTMLElement
	onAnimationComplete?: (clicked: boolean) => void;
	children?: ReactNode;
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor tooltip to rect or cursor
	startTooltip?: {
		tooltipText: string;
		tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
		tooltipAnchor?: 'rect' | 'cursor';
	};
	advanceMode?: 'auto' | 'external' | 'default' | number | (() => boolean); // Controls cursor advancement behavior
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements outside viewport
	dragCursor?: boolean; // When true, uses the drag cursor animation (closed fist -> open)
	disableClickableArea?: boolean; // When true, disables click interaction on the clickable area
	// Animation frame ID for requestAnimationFrame
}

const VirtualCursor = ({
	endPosition, // This is the target end position
	startPosition,
	onAnimationComplete,
	children,
	tooltipText,
	tooltipPosition,
	tooltipAnchor = 'rect',
	startTooltip,
	advanceMode = 'default',
	blocking = false,
	shouldScroll = false,
	dragCursor = false,
	disableClickableArea = false,
}: VirtualCursorProps) => {
	const [showTooltip, setShowTooltip] = useState(false);
	const [fadeOut, setFadeOut] = useState(false);
	const [showStartHighlight, setShowStartHighlight] = useState(true);
	const timeoutRef = useRef<Timeout | null>(null);
	const rafRef = useRef<number | null>(null);
	// Track whether we're using EdgePointer
	const [isTargetOffscreen, setIsTargetOffscreen] = useState(false);

	// Store endRect in state so we can update it dynamically
	const [endRect, setEndRect] = useState<DOMRect | null>(
		getRectFromPositionOrElement(endPosition, 10, shouldScroll)
	);

	// Store startRect in state for tooltip positioning
	const [startRect, setStartRect] = useState<DOMRect | null>(
		startPosition ? getRectFromPositionOrElement(startPosition, 10) : null
	);

	// Store the original endPosition ref for tracking
	const endPositionRef = useRef(endPosition);
	// Store the original startPosition ref for tracking
	const startPositionRef = useRef(startPosition);
	// Add a ref to track the current endRect to avoid dependency cycle
	const endRectRef = useRef(endRect);
	// Add a ref to track the current startRect to avoid dependency cycle
	const startRectRef = useRef(startRect);

	// Add a ref to track the previous actualEndPosition to detect jumps to screen center
	const previousActualEndPositionRef = useRef<Position | null>(null);

	// Update endRectRef when endRect changes
	useEffect(() => {
		endRectRef.current = endRect;

		// Check if target is offscreen whenever endRect changes
		if (endRect) {
			const offscreen = !isRectInViewport(endRect);
			setIsTargetOffscreen(offscreen);
			if (offscreen && showTooltip) {
				setShowTooltip(false);
			}
		} else {
			setIsTargetOffscreen(false);
		}
	}, [endRect]);

	// Update startRectRef when startRect changes
	useEffect(() => {
		startRectRef.current = startRect;
	}, [startRect]);

	// Function to update the endRect based on current position
	// Remove endRect from dependencies to break the circular dependency
	const updateEndRect = useCallback(() => {
		// Only update if we're not already fading out
		const currentRect = getRectFromPositionOrElement(
			endPositionRef.current,
			10,
			shouldScroll
		);

		// Use endRectRef.current instead of endRect in the dependency array
		// This breaks the circular dependency
		if (
			currentRect &&
			(!endRectRef.current ||
				currentRect.x !== endRectRef.current.x ||
				currentRect.y !== endRectRef.current.y ||
				currentRect.width !== endRectRef.current.width ||
				currentRect.height !== endRectRef.current.height)
		) {
			setEndRect(currentRect);
		}

		// Also update startRect if we have a startPosition
		if (startPosition && startPositionRef.current) {
			const currentStartRect = getRectFromPositionOrElement(
				startPositionRef.current,
				10
			);

			if (
				currentStartRect &&
				(!startRectRef.current ||
					currentStartRect.x !== startRectRef.current.x ||
					currentStartRect.y !== startRectRef.current.y ||
					currentStartRect.width !== startRectRef.current.width ||
					currentStartRect.height !== startRectRef.current.height)
			) {
				setStartRect(currentStartRect);
			}
		}
	}, []); // endRect and startRect removed from dependencies

	// Function to update endRect dynamically with requestAnimationFrame
	// Last timestamp for throttling updates
	const lastUpdateTimeRef = useRef<number>(0);
	// Update interval in ms (similar to the original 100ms interval)
	const updateInterval = 100;

	// The animation frame loop function with throttling
	const animationFrameLoop = useCallback(
		(timestamp: number) => {
			// Only update if enough time has passed since last update
			if (timestamp - lastUpdateTimeRef.current >= updateInterval) {
				updateEndRect();
				lastUpdateTimeRef.current = timestamp;
			}

			// Continue the loop by requesting the next frame if not fading out
			if (!fadeOut) {
				rafRef.current = requestAnimationFrame(animationFrameLoop);
			}
		},
		[fadeOut, updateEndRect]
	);

	// Update endPositionRef when prop changes
	useEffect(() => {
		endPositionRef.current = endPosition;
	}, [endPosition]);

	// Update startPositionRef when prop changes
	useEffect(() => {
		startPositionRef.current = startPosition;
	}, [startPosition]);

	// Set up position tracking using requestAnimationFrame
	useEffect(() => {
		// Only set up tracking if not fading out
		if (!fadeOut) {
			// Initial update right away
			updateEndRect();

			// Start the animation frame loop
			rafRef.current = requestAnimationFrame(animationFrameLoop);

			// Clean up animation frame on unmount or fadeOut change
			return () => {
				if (rafRef.current !== null) {
					cancelAnimationFrame(rafRef.current);
					rafRef.current = null;
				}
			};
		}
	}, [fadeOut, updateEndRect, animationFrameLoop]);

	// Determine behavior based on advanceMode
	const isExternal = advanceMode === 'external';
	const shouldUseFullPageBlock = advanceMode === 'auto' && blocking && !endRect;

	const handleAnimationComplete = () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// When an endRect exists and we're not in auto mode, we'll wait for user click
		if (isExternal || (endRect && advanceMode === 'default')) {
			return;
		}
		// Otherwise, proceed with automatic animation
		else if (onAnimationComplete) {
			setFadeOut(true);
			onAnimationComplete(false);
		}
	};

	// Handle user click on ClickableArea
	const handleClickableAreaClick = useCallback(() => {
		// In external mode, we don't do anything on click
		if (isExternal || typeof advanceMode === 'function') {
			return;
		}

		// Start the fadeout process after click
		setFadeOut(true);

		// Call onAnimationComplete if provided
		if (onAnimationComplete) {
			onAnimationComplete(true);
		}
	}, [onAnimationComplete, isExternal]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, []);

	// Fade out start highlight after a short delay
	useEffect(() => {
		if (showStartHighlight) {
			const timer = setTimeout(() => {
				setShowStartHighlight(false);
			}, 800); // Fade out after 800ms

			return () => clearTimeout(timer);
		}
	}, [showStartHighlight]);

	// Always derive the latest position when rendering
	// This ensures we have the most up-to-date position for the cursor animation
	const actualStartPosition = startPosition
		? getPositionFromElementWithViewport(startPosition, 10, shouldScroll)
		: getPositionFromElementWithViewport('cursor', 10, shouldScroll);

	// Calculate the new end position
	const newActualEndPosition = getPositionFromElementWithViewport(
		endPosition,
		10,
		shouldScroll
	);

	// Check if the position jumped to screen center (indicating element disappeared)
	const screenCenter = getScreenCenterPosition();
	// logic: Add tolerance threshold when comparing to screen center coordinates to handle minor floating point differences
	const EPSILON = 0.001;
	const isScreenCenter =
		Math.abs(newActualEndPosition.x - screenCenter.x) < EPSILON &&
		Math.abs(newActualEndPosition.y - screenCenter.y) < EPSILON;

	// If we had a previous position and now we're at screen center, keep the previous position
	const actualEndPosition =
		previousActualEndPositionRef.current && isScreenCenter
			? previousActualEndPositionRef.current
			: newActualEndPosition;

	// Update the ref with the current position (but only if it's not screen center)
	if (!isScreenCenter) {
		previousActualEndPositionRef.current = actualEndPosition;
	}

	const handleBaseCursorAnimationComplete = () => {
		if (tooltipText) {
			setShowTooltip(true);
			return;
		} else {
			handleAnimationComplete();
		}
	};

	return (
		<>
			{/* Full page blocking overlay for auto mode with blocking enabled */}
			{shouldUseFullPageBlock &&
				typeof window !== 'undefined' &&
				createPortal(
					<motion.div
						initial={{ opacity: 0.2 }}
						animate={{ opacity: fadeOut ? 0 : 0.2 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0'
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							width: '100vw',
							height: '100vh',
							zIndex: 9000,
							pointerEvents: 'auto',
							backgroundColor: 'black',
						}}
						onClick={(e: React.MouseEvent) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						aria-hidden='true'
					/>,
					document.body
				)}

			{/* Add highlight for starting position if it's an element */}
			{startRect && (
				<motion.div
					initial={{ opacity: 1 }}
					animate={{ opacity: fadeOut ? 0 : showStartHighlight ? 1 : 0.5 }}
					transition={{ duration: 0.5, delay: 0.3 }}>
					<ClickableArea rect={startRect} className='pointer-events-none' />
				</motion.div>
			)}

			{/* Render startTooltip if available and startRect exists */}
			{startTooltip && startTooltip.tooltipText && startRect && (
				<motion.div
					initial={{
						opacity: 0,
						top: startRect.top + startRect.height / 2,
						left: startRect.left + startRect.width / 2,
					}}
					animate={{
						opacity: fadeOut ? 0 : 1,
						top: startRect.top + startRect.height / 2,
						left: startRect.left + startRect.width / 2,
					}}
					transition={{
						opacity: { duration: 0.3 },
						...SPRING_CONFIGS.STANDARD,
					}}
					style={{
						position: 'fixed',
						zIndex: 9999,
						pointerEvents: 'none',
					}}>
					<TooltipText
						content={startTooltip.tooltipText}
						position={startTooltip.tooltipPosition || 'bottom'}
						tooltipAnchor={startTooltip.tooltipAnchor || 'rect'}
						fadeOut={fadeOut}
						endRect={startRect}
						onEnd={() => {}}
					/>
				</motion.div>
			)}

			{endRect && (
				<motion.div
					initial={{ opacity: 1 }}
					animate={{ opacity: fadeOut ? 0 : 1 }}
					transition={{ duration: 0.3 }}>
					<ClickableArea
						rect={endRect}
						onClick={() => handleClickableAreaClick()}
						blocking={blocking}
						fadeOut={fadeOut}
						disabled={disableClickableArea}
					/>
				</motion.div>
			)}

			{/* Conditionally render either EdgePointer or BaseCursor based on whether target is offscreen */}
			{isTargetOffscreen && endRect ? (
				<EdgePointer
					startPosition={actualStartPosition}
					endRect={endRect}
					fadeOut={fadeOut}
					tooltipText={`${
						tooltipText || 'The element'
					} (Element is off screen, scroll or drag to get there)`}
					onAnimationComplete={handleBaseCursorAnimationComplete}
					shouldAnimateStartMotion={!showTooltip}
				/>
			) : (
				<BaseCursor
					startPosition={actualStartPosition}
					endPosition={actualEndPosition}
					fadeOut={fadeOut}
					onAnimationComplete={handleBaseCursorAnimationComplete}
					tooltipText={tooltipText}
					tooltipPosition={tooltipPosition}
					tooltipAnchor={tooltipAnchor}
					showTooltip={showTooltip}
					onTooltipComplete={handleAnimationComplete}
					cursorKey={`virtual-cursor`}
					endRect={endRect}
					dragCursor={dragCursor}>
					{children}
				</BaseCursor>
			)}
		</>
	);
};

export default VirtualCursor;

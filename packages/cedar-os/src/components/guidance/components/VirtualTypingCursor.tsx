import {
	LazyPositionOrElement,
	PositionOrElement,
	getPositionFromElementWithViewport,
	getRectFromPositionOrElement,
} from '@/components/guidance/utils/positionUtils';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import BaseCursor, { Timeout } from './BaseCursor';
import { motion } from 'motion/react';
import ClickableArea from '@/components/guidance/components/ClickableArea';
import {
	isValueMatching,
	isInputElement,
	getElementValue,
	startTypingAnimation,
} from '@/components/guidance/utils/typingUtils';

// Re-export validation patterns for backward compatibility
export { validationPatterns } from '@/components/guidance/utils/typingUtils';

interface VirtualTypingCursorProps {
	endPosition: PositionOrElement;
	startPosition?: PositionOrElement;
	expectedValue: string | ((val: string) => boolean);
	checkExistingValue?: boolean;
	typingDelay?: number;
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor tooltip to rect or cursor
	onAnimationComplete?: () => void;
	advanceMode?: 'auto' | 'external' | 'default' | number; // Controls how the action advances to the next one
	blocking?: boolean; // Add blocking overlay support
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements outside viewport
}

const VirtualTypingCursor: React.FC<VirtualTypingCursorProps> = ({
	endPosition,
	startPosition,
	expectedValue,
	checkExistingValue = true,
	typingDelay = 150,
	tooltipText,
	tooltipPosition,
	tooltipAnchor = 'rect',
	onAnimationComplete,
	advanceMode = 'default',
	blocking = false, // Default to non-blocking
	shouldScroll = false,
}) => {
	const [mouseAnimationFinished, setMouseAnimationFinished] = useState(false);
	const [typingAnimationFinished, setTypingAnimationFinished] = useState(false);
	const showTooltip = !!tooltipText;
	const [fadeOut, setFadeOut] = useState(false);
	const [valueIsMatching, setValueIsMatching] = useState(false);
	const timeoutRef = useRef<Timeout | null>(null);
	const typingTimeoutRef = useRef<Timeout | null>(null);
	const inputChangeListenerRef = useRef<((e: Event) => void) | null>(null);
	const rafRef = useRef<number | null>(null);

	// Determine behavior based on advanceMode
	const isExternal = advanceMode === 'external';

	// Store the original endPosition ref for tracking
	const endPositionRef = useRef(endPosition);

	// Store endRect in state so we can update it dynamically
	const [endRect, setEndRect] = useState<DOMRect | null>(
		getRectFromPositionOrElement(endPosition, 10, shouldScroll)
	);

	// Add a ref to track the current endRect to avoid dependency cycle
	const endRectRef = useRef(endRect);

	// Update endRectRef when endRect changes
	useEffect(() => {
		endRectRef.current = endRect;
	}, [endRect]);

	// Update endPositionRef when prop changes
	useEffect(() => {
		endPositionRef.current = endPosition;
	}, [endPosition]);

	// Function to update the endRect based on current position
	const updateEndRect = useCallback(() => {
		const currentRect = getRectFromPositionOrElement(
			endPositionRef.current,
			10,
			shouldScroll
		);

		// Only update state if the rect has actually changed
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
	}, [shouldScroll]);

	// Last timestamp for throttling updates
	const lastUpdateTimeRef = useRef<number>(0);
	// Update interval in ms (similar to VirtualCursor)
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

	// Properly resolve the endPosition if it's a lazy reference
	let resolvedEndPosition = endPosition;
	if (
		endPosition &&
		typeof endPosition === 'object' &&
		'_lazy' in endPosition
	) {
		resolvedEndPosition = (endPosition as LazyPositionOrElement).resolve();
	}

	// Validate that we have a proper element or position
	const isValidElement =
		resolvedEndPosition &&
		typeof resolvedEndPosition === 'object' &&
		(resolvedEndPosition as HTMLElement).getBoundingClientRect;

	// Now get the actual element, with safer type handling
	const endElement = isValidElement
		? (resolvedEndPosition as HTMLElement)
		: null;

	// Set up the input listener when the element changes
	useEffect(() => {
		// Set up a listener if we have an input element, regardless of expectedValue type
		if (endElement && isInputElement(endElement)) {
			// Define the input listener
			const inputListener = (e: Event) => {
				let target;
				let isValid = false;
				if (
					endElement instanceof HTMLInputElement ||
					endElement instanceof HTMLTextAreaElement
				) {
					target = e.target as HTMLInputElement | HTMLTextAreaElement;
					isValid = isValueMatching(target.value, expectedValue);
				} else {
					target = e.target as HTMLElement;
					const currentValue = getElementValue(target);
					isValid = isValueMatching(currentValue, expectedValue);
				}

				setValueIsMatching(isValid);

				if (isValid) {
					setTypingAnimationFinished(true);
				}
			};

			// Clean up any existing listeners
			if (inputChangeListenerRef.current) {
				endElement.removeEventListener('input', inputChangeListenerRef.current);
				endElement.removeEventListener(
					'change',
					inputChangeListenerRef.current
				);
				endElement.removeEventListener('keyup', inputChangeListenerRef.current);
			}

			// Store and add the new listener to multiple events for redundancy
			inputChangeListenerRef.current = inputListener;

			// Add listeners to various events to ensure we catch all input changes
			endElement.addEventListener('input', inputListener);
			endElement.addEventListener('change', inputListener);
			endElement.addEventListener('keyup', inputListener);

			// Check the current value immediately
			const currentValue = getElementValue(endElement);
			const isValid = isValueMatching(currentValue, expectedValue);
			setValueIsMatching(isValid);
			if (isValid) {
				setTypingAnimationFinished(true);
			}

			// Cleanup on unmount or when element changes
			return () => {
				if (inputChangeListenerRef.current) {
					endElement.removeEventListener(
						'input',
						inputChangeListenerRef.current
					);
					endElement.removeEventListener(
						'change',
						inputChangeListenerRef.current
					);
					endElement.removeEventListener(
						'keyup',
						inputChangeListenerRef.current
					);
				}
			};
		}
	}, [endElement, expectedValue]);

	// Handle mouse movement animation completion
	const handleMouseAnimationComplete = () => {
		setMouseAnimationFinished(true);

		// Start typing animation or complete the animation
		if (endElement && isInputElement(endElement)) {
			// Focus the input element for better user experience
			endElement.focus();

			// Add a special class to help identify the element being interacted with
			endElement.classList.add('cedar-typing-target');

			// Add a direct click handler to the element to ensure it's properly focused
			endElement.click();

			// Start typing animation if expectedValue is a string
			if (typeof expectedValue === 'string') {
				startTypingAnimation(
					endElement,
					expectedValue,
					typingDelay,
					checkExistingValue,
					() => {
						setTypingAnimationFinished(true);
						setValueIsMatching(true);
					},
					typingTimeoutRef
				);
			}
			// For function validation, the listener is already set up in the useEffect
		} else if (!tooltipText) {
			// If there's no typing to do and no tooltip, complete the animation
			handleCompleteAnimation();
		}
	};

	// Complete the animation and call the callback
	const handleCompleteAnimation = () => {
		// If in external mode and we have a tooltip, don't complete
		if (isExternal && tooltipText) {
			return;
		}

		// Delay the fade-out a bit to make it more natural
		timeoutRef.current = setTimeout(() => {
			setFadeOut(true);

			// Delay calling onAnimationComplete to allow fade-out to be visible
			if (onAnimationComplete) {
				timeoutRef.current = setTimeout(onAnimationComplete, 500);
			}
		}, 500);
	};

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, []);

	// Add an effect to handle animation completion after typing finishes
	useEffect(() => {
		// If typing is complete and the value matches, trigger completion
		if (typingAnimationFinished && valueIsMatching) {
			if (!isExternal) {
				// Now that typing is ACTUALLY complete, we can fade out
				handleCompleteAnimation();
			} else if (onAnimationComplete) {
				// For external mode, we call onAnimationComplete but don't fade out
				onAnimationComplete();
			}
		}
	}, [
		typingAnimationFinished,
		valueIsMatching,
		isExternal,
		onAnimationComplete,
	]);

	// Convert all position inputs to actual Position objects to match VirtualCursor
	const actualStartPosition = startPosition
		? getPositionFromElementWithViewport(startPosition)
		: getPositionFromElementWithViewport(endPosition);
	const actualEndPosition = getPositionFromElementWithViewport(endPosition);

	const handleBaseCursorAnimationComplete = () => {
		if (!mouseAnimationFinished) {
			handleMouseAnimationComplete();
		} else if (fadeOut && onAnimationComplete && !isExternal) {
			onAnimationComplete();
		}
	};

	return (
		<>
			{endRect && (
				<motion.div
					initial={{ opacity: 1 }}
					animate={{ opacity: fadeOut ? 0 : 1 }}
					transition={{ duration: 0.3 }}>
					<ClickableArea
						rect={endRect}
						onClick={() => null}
						blocking={blocking}
						fadeOut={fadeOut}
					/>
				</motion.div>
			)}

			<BaseCursor
				startPosition={actualStartPosition}
				endPosition={actualEndPosition}
				fadeOut={fadeOut}
				onAnimationComplete={handleBaseCursorAnimationComplete}
				tooltipText={tooltipText}
				tooltipPosition={tooltipPosition}
				tooltipAnchor={tooltipAnchor}
				showTooltip={showTooltip}
				onTooltipComplete={() => null}
				cursorKey='virtual-typing-cursor'
				endRect={endRect}
			/>
		</>
	);
};

export default VirtualTypingCursor;

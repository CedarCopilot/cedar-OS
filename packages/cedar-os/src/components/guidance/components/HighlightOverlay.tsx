'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
	getRectFromPositionOrElement,
	PositionOrElement,
} from '../utils/positionUtils';
import ClickableArea from './ClickableArea';

export interface HighlightOverlayProps {
	elements:
		| PositionOrElement[]
		| { _lazy: true; resolve: () => PositionOrElement[] };
	shouldScroll?: boolean;
}

export const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
	elements,
	shouldScroll = true,
}) => {
	// Store element rects in state
	const [elementRects, setElementRects] = useState<(DOMRect | null)[]>([]);
	// Store resolved elements
	const [resolvedElements, setResolvedElements] = useState<PositionOrElement[]>(
		[]
	);
	// Store element refs for tracking
	const elementsRef = useRef(resolvedElements);
	// Store original elements prop for tracking
	const originalElementsRef = useRef(elements);
	// Animation frame ID for requestAnimationFrame
	const rafRef = useRef<number | null>(null);
	// Last timestamp for throttling updates
	const lastUpdateTimeRef = useRef<number>(0);
	// Last timestamp for resolving lazy elements
	const lastResolveTimeRef = useRef<number>(0);
	// Update interval in ms
	const updateInterval = 100;
	// Resolver update interval in ms (refresh lazy elements every 500ms)
	const resolverUpdateInterval = 500;
	// Flag to track if we have a lazy resolver
	const isLazyRef = useRef(false);

	// Update original elements ref when prop changes
	useEffect(() => {
		originalElementsRef.current = elements;
		// Determine if we have a lazy resolver
		isLazyRef.current = !!(
			elements &&
			typeof elements === 'object' &&
			'_lazy' in elements &&
			elements._lazy
		);
	}, [elements]);

	// Function to resolve elements from a lazy resolver
	const resolveElements = useCallback(() => {
		const currentElements = originalElementsRef.current;

		if (
			currentElements &&
			typeof currentElements === 'object' &&
			'_lazy' in currentElements &&
			currentElements._lazy
		) {
			try {
				// Resolve the elements and update state
				const resolved = currentElements.resolve();
				setResolvedElements(resolved || []);
			} catch (error) {
				console.error('Error resolving lazy elements:', error);
				setResolvedElements([]);
			}
		} else if (Array.isArray(currentElements)) {
			// If not lazy, just use the elements directly
			setResolvedElements(currentElements);
		}
	}, []);

	// Function to update the element rects based on current positions
	const updateElementRects = useCallback(
		(timestamp?: number) => {
			// If we have a lazy resolver and enough time has passed, resolve elements again
			if (
				isLazyRef.current &&
				timestamp &&
				timestamp - lastResolveTimeRef.current >= resolverUpdateInterval
			) {
				resolveElements();
				lastResolveTimeRef.current = timestamp;
			}

			if (!elementsRef.current || elementsRef.current.length === 0) return;

			const newRects = elementsRef.current.map((element) =>
				getRectFromPositionOrElement(element, 10, shouldScroll)
			);

			// Only update state if there's a change to avoid unnecessary rerenders
			const hasChanged = newRects.some((rect, index) => {
				const currentRect = elementRects[index];
				return (
					!currentRect ||
					!rect ||
					rect.x !== currentRect.x ||
					rect.y !== currentRect.y ||
					rect.width !== currentRect.width ||
					rect.height !== currentRect.height
				);
			});

			if (hasChanged || elementRects.length !== newRects.length) {
				setElementRects(newRects);
			}
		},
		[elementRects, resolveElements, shouldScroll]
	);

	// The animation frame loop function with throttling
	const animationFrameLoop = useCallback(
		(timestamp: number) => {
			// Only update if enough time has passed since last update
			if (timestamp - lastUpdateTimeRef.current >= updateInterval) {
				updateElementRects(timestamp);
				lastUpdateTimeRef.current = timestamp;
			}

			// Continue the loop by requesting the next frame
			rafRef.current = requestAnimationFrame(animationFrameLoop);
		},
		[updateElementRects]
	);

	// Initial resolution of elements when component mounts or elements prop changes
	useEffect(() => {
		resolveElements();
	}, [resolveElements]);

	// Update elementsRef when resolved elements change
	useEffect(() => {
		elementsRef.current = resolvedElements;
		// Initial update right away
		updateElementRects();
	}, [resolvedElements, updateElementRects]);

	// Set up position tracking using requestAnimationFrame
	useEffect(() => {
		// Initial update right away
		updateElementRects();

		// Start the animation frame loop
		rafRef.current = requestAnimationFrame(animationFrameLoop);

		// Clean up animation frame on unmount
		return () => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [animationFrameLoop, updateElementRects]);

	// Don't render anything if no elements to highlight
	if (!elementRects.length) return null;

	return (
		<>
			{elementRects.map((rect, index) =>
				rect ? (
					<motion.div
						key={`highlight-${index}`}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}>
						<ClickableArea rect={rect} className='pointer-events-none ring-2' />
					</motion.div>
				) : null
			)}
		</>
	);
};

export default HighlightOverlay;

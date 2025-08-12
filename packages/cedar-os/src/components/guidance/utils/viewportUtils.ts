import { Position } from '@/components/guidance/utils/positionUtils';

/**
 * Determines if a position is within the viewport
 * @param position The position to check
 * @param padding Optional padding to add as buffer (defaults to 0)
 * @returns True if the position is within the viewport
 */
export const isPositionInViewport = (
	position: Position,
	padding: number = 0
): boolean => {
	if (typeof window === 'undefined') {
		return true; // Default to true on server-side
	}

	return (
		position.x >= padding &&
		position.y >= padding &&
		position.x <= window.innerWidth - padding &&
		position.y <= window.innerHeight - padding
	);
};

/**
 * Determines if a DOM rectangle is fully within the viewport
 * @param rect The DOM rectangle to check
 * @param padding Optional padding to add as buffer (defaults to 0)
 * @returns True if the rectangle is fully within the viewport
 */
export const isRectInViewport = (
	rect: DOMRect,
	padding: number = 0
): boolean => {
	if (typeof window === 'undefined') {
		return true; // Default to true on server-side
	}

	return (
		rect.left >= padding &&
		rect.top >= padding &&
		rect.right <= window.innerWidth - padding &&
		rect.bottom <= window.innerHeight - padding
	);
};

/**
 * Checks if a rectangle is partially visible in the viewport
 * @param rect The DOM rectangle to check
 * @returns True if any part of the rectangle is visible in the viewport
 */
export const isRectPartiallyInViewport = (rect: DOMRect): boolean => {
	if (typeof window === 'undefined') {
		return true; // Default to true on server-side
	}

	return !(
		rect.bottom < 0 ||
		rect.right < 0 ||
		rect.top > window.innerHeight ||
		rect.left > window.innerWidth
	);
};

/**
 * Calculates how much of a rectangle is visible in the viewport (as a percentage)
 * @param rect The DOM rectangle to check
 * @returns A value between 0 (not visible) and 1 (fully visible)
 */
export const getVisibleRectPercentage = (rect: DOMRect): number => {
	if (typeof window === 'undefined') {
		return 1; // Default to fully visible on server-side
	}

	// If rectangle is completely outside viewport, return 0
	if (
		rect.bottom < 0 ||
		rect.right < 0 ||
		rect.top > window.innerHeight ||
		rect.left > window.innerWidth
	) {
		return 0;
	}

	// If rectangle is completely inside viewport, return 1
	if (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <= window.innerHeight &&
		rect.right <= window.innerWidth
	) {
		return 1;
	}

	// Calculate the visible area
	const rectWidth = rect.right - rect.left;
	const rectHeight = rect.bottom - rect.top;
	const rectArea = rectWidth * rectHeight;

	// Calculate visible rectangle dimensions
	const visibleLeft = Math.max(0, rect.left);
	const visibleRight = Math.min(window.innerWidth, rect.right);
	const visibleTop = Math.max(0, rect.top);
	const visibleBottom = Math.min(window.innerHeight, rect.bottom);

	// Calculate visible area
	const visibleWidth = visibleRight - visibleLeft;
	const visibleHeight = visibleBottom - visibleTop;
	const visibleArea = visibleWidth * visibleHeight;

	// Return the percentage of the rectangle that is visible
	return visibleArea / rectArea;
};

/**
 * Determines if a position is off screen and in which direction
 * @param position The position to check
 * @returns An object with boolean flags for each direction, or null if position is in viewport
 */
export const getOffscreenDirection = (
	position: Position
): { top: boolean; right: boolean; bottom: boolean; left: boolean } | null => {
	if (typeof window === 'undefined' || isPositionInViewport(position)) {
		return null; // Position is in viewport or server-side
	}

	return {
		top: position.y < 0,
		right: position.x > window.innerWidth,
		bottom: position.y > window.innerHeight,
		left: position.x < 0,
	};
};

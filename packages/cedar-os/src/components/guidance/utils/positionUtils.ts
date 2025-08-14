import {
	isElementInViewport,
	scrollElementIntoView,
} from '@/components/guidance/utils/elementUtils';

export interface Position {
	x: number;
	y: number;
}

// Type for either Position object or HTML element
export type PositionOrElement =
	| Position
	| HTMLElement
	| LazyPositionOrElement
	| 'cursor';

// Type for lazy position resolution
export interface LazyPositionOrElement {
	_lazy: boolean;
	resolve: () => Position | HTMLElement;
}

/**
 * Calculates the center position of an element based on its DOMRect
 */
export const calculatePosition = (rect: DOMRect): Position => {
	const x = rect.left + rect.width / 2;
	const y = rect.top + rect.height / 2;
	return { x, y };
};

/**
 * Gets the current cursor position from the data attribute on document.body
 * Falls back to {x: 0, y: 0} if not available or if parsing fails
 */
export const getCursorPosition = (): Position => {
	const cursorPosition = document.body.getAttribute('data-cursor-position');
	if (cursorPosition) {
		try {
			const position = JSON.parse(cursorPosition);
			return { x: position.x, y: position.y };
		} catch (e) {
			console.warn('Error parsing cursor position:', e);
			return { x: 0, y: 0 };
		}
	}
	return { x: 0, y: 0 };
};

// Override getPositionFromElement to include viewport checks
export const getPositionFromElementWithViewport = (
	posOrEl: PositionOrElement,
	maxDepth = 10,
	shouldScroll = false
): Position => {
	if (posOrEl === 'cursor') {
		return getCursorPosition();
	}

	// Handle lazy position with recursion limit
	if (posOrEl && typeof posOrEl === 'object' && '_lazy' in posOrEl) {
		if (maxDepth <= 0) {
			console.warn(
				'Maximum recursion depth reached in getPositionFromElementWithViewport. Possible circular reference.'
			);
			return { x: 0, y: 0 }; // Fallback position
		}
		return getPositionFromElementWithViewport(
			(posOrEl as LazyPositionOrElement).resolve(),
			maxDepth - 1,
			shouldScroll
		);
	}

	if (!posOrEl) {
		return { x: 0, y: 0 };
	}

	if ((posOrEl as HTMLElement).getBoundingClientRect) {
		// It's an HTML element
		const el = posOrEl as HTMLElement;
		if (shouldScroll && !isElementInViewport(el)) {
			scrollElementIntoView(el);
		}
		const rect = el.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		};
	}
	// It's a Position object
	return posOrEl as Position;
};

// Helper to get position from either a Position object or HTMLElement
export const getPositionFromElement = (
	posOrEl: PositionOrElement,
	maxDepth = 10,
	shouldScroll = false
): Position => {
	if (posOrEl === 'cursor') {
		return getCursorPosition();
	}

	// Handle lazy position with recursion limit
	if (posOrEl && typeof posOrEl === 'object' && '_lazy' in posOrEl) {
		if (maxDepth <= 0) {
			console.warn(
				'Maximum recursion depth reached in getPositionFromElement. Possible circular reference.'
			);
			return { x: 0, y: 0 }; // Fallback position
		}
		return getPositionFromElement(
			(posOrEl as LazyPositionOrElement).resolve(),
			maxDepth - 1,
			shouldScroll
		);
	}

	if (!posOrEl) {
		return { x: 0, y: 0 };
	}

	if ((posOrEl as HTMLElement).getBoundingClientRect) {
		// It's an HTML element
		const el = posOrEl as HTMLElement;
		// Check if scrolling is needed and enabled
		if (shouldScroll && !isElementInViewport(el)) {
			scrollElementIntoView(el);
		}
		const rect = el.getBoundingClientRect();
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2,
		};
	}
	// It's a Position object
	return posOrEl as Position;
};

// Helper to get DOMRect from either a Position object or HTMLElement
export const getRectFromPositionOrElement = (
	posOrEl: PositionOrElement,
	maxDepth = 10,
	shouldScroll = false
): DOMRect | null => {
	// Handle lazy position with recursion limit
	if (posOrEl && typeof posOrEl === 'object' && '_lazy' in posOrEl) {
		if (maxDepth <= 0) {
			console.warn(
				'Maximum recursion depth reached in getRectFromPositionOrElement. Possible circular reference.'
			);
			return null; // Fallback return value
		}
		return getRectFromPositionOrElement(
			(posOrEl as LazyPositionOrElement).resolve(),
			maxDepth - 1,
			shouldScroll
		);
	}

	if (!posOrEl) {
		return null;
	}

	if ((posOrEl as HTMLElement).getBoundingClientRect) {
		// It's an HTML element
		const el = posOrEl as HTMLElement;
		// Check if scrolling is needed and enabled
		if (shouldScroll && !isElementInViewport(el)) {
			scrollElementIntoView(el);
		}
		return el.getBoundingClientRect();
	}
	return null;
};

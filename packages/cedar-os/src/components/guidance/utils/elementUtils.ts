import { Position } from './positionUtils';

// Utility function to get the center of the screen as Position
export const getScreenCenterPosition = (): Position => {
	if (typeof window === 'undefined') {
		return { x: 0, y: 0 };
	}
	return {
		x: Math.floor(window.innerWidth / 2),
		y: Math.floor(window.innerHeight / 2),
	};
};

export interface LazyPositionOrElement {
	_lazy: boolean;
	resolve: () => Position | HTMLElement;
}

// Type for either Position object or HTML element
export type PositionOrElement =
	| Position
	| HTMLElement
	| LazyPositionOrElement
	| 'cursor';

// Define the standardized SearchCriteria type
export type SearchCriteria =
	| string
	| {
			text?: string;
			attribute?: { name: string; value: string };
			className?: string;
			selector?: string;
	  };

// Update the elementFinder type
export type ElementFinder =
	| string
	| { text: string }
	| { role: string; name?: string }
	| { attribute: { name: string; value: string } }
	| { className: string }
	| { selector: string };

/**
 * Normalizes search criteria to a standard object format
 *
 * @param searchCriteria - The search criteria in either string or object format
 * @returns The normalized search criteria object
 */
export const normalizeCriteria = (
	searchCriteria: SearchCriteria
): Exclude<SearchCriteria, string> => {
	return typeof searchCriteria === 'string'
		? { selector: searchCriteria }
		: searchCriteria;
};

/**
 * Checks if an HTML element matches the given search criteria
 *
 * @param element - The element to check
 * @param searchCriteria - The criteria to match against
 * @returns True if the element matches the criteria, false otherwise
 */
export const elementMatchesCriteria = (
	element: HTMLElement,
	searchCriteria: SearchCriteria
): boolean => {
	const criteria = normalizeCriteria(searchCriteria);

	// If selector is provided and it's a tag name, match by tag name for backward compatibility
	if (
		criteria.selector &&
		criteria.selector.indexOf('.') === -1 &&
		criteria.selector.indexOf('#') === -1 &&
		criteria.selector.indexOf('[') === -1 &&
		criteria.selector.indexOf('>') === -1
	) {
		const tagName = criteria.selector.toLowerCase();
		return element.tagName.toLowerCase() === tagName;
	}

	// If selector is provided and it's not just a tag name, use matches
	if (criteria.selector) {
		try {
			return element.matches(criteria.selector);
		} catch (e) {
			console.warn('Invalid selector:', criteria.selector, e);
			return false;
		}
	}

	// Search by text content
	if (criteria.text && element.textContent?.includes(criteria.text)) {
		return true;
	}

	// Search by attribute
	if (criteria.attribute) {
		const { name, value } = criteria.attribute;
		return element.getAttribute(name) === value;
	}

	// Search by class name
	if (criteria.className && element.classList.contains(criteria.className)) {
		return true;
	}

	return false;
};

/**
 * Gets an element based on a selector or finds it by text content or role
 * Falls back to a position if the element isn't found
 */
export const getElementOrPosition = (
	elementFinder: ElementFinder,
	fallbackPosition?: Position
): Position | HTMLElement => {
	let element: HTMLElement | null = null;
	// Use screen center if fallbackPosition is not provided
	const defaultPosition = fallbackPosition || getScreenCenterPosition();

	try {
		if (typeof elementFinder === 'string') {
			element = document.querySelector(elementFinder) as HTMLElement | null;
		} else if ('text' in elementFinder) {
			// Try multiple approaches to find text

			// 1. First try direct text content match with XPath
			const xpath = `//*[contains(text(), '${elementFinder.text}')]`;
			const result = document.evaluate(
				xpath,
				document,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			);
			element = result.singleNodeValue as HTMLElement | null;
		} else if ('role' in elementFinder) {
			const roleSelector = `[role="${elementFinder.role}"]`;

			if (elementFinder.name) {
				element = document.querySelector(
					`${roleSelector}[aria-label*="${elementFinder.name}"]`
				) as HTMLElement | null;

				if (!element) {
					const elements = Array.from(document.querySelectorAll(roleSelector));
					element = elements.find((el) =>
						el.textContent?.includes(elementFinder.name as string)
					) as HTMLElement | null;
				}

				if (!element) {
					const buttons = Array.from(document.querySelectorAll('button'));
					element = buttons.find((btn) =>
						btn.textContent?.includes(elementFinder.name as string)
					) as HTMLElement | null;
				}
			} else {
				element = document.querySelector(roleSelector) as HTMLElement | null;
			}
		} else if ('attribute' in elementFinder) {
			const { name, value } = elementFinder.attribute;
			element = document.querySelector(
				`[${name}="${value}"]`
			) as HTMLElement | null;
		} else if ('className' in elementFinder) {
			element = document.querySelector(
				`.${elementFinder.className}`
			) as HTMLElement | null;
		} else if ('selector' in elementFinder) {
			element = document.querySelector(
				elementFinder.selector
			) as HTMLElement | null;
		}
	} catch (error) {
		console.warn('Element finding error:', error);
	}

	return element || defaultPosition;
};

/**
 * Creates a lazy element finder that evaluates at runtime
 */
export const lazyFindElement = (
	elementFinder: ElementFinder,
	fallbackPosition?: Position
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();
			return getElementOrPosition(elementFinder, defaultPosition);
		},
	};
};

// Helper to check if an element is in viewport
export const isElementInViewport = (element: HTMLElement): boolean => {
	const rect = element.getBoundingClientRect();
	return (
		rect.top >= 0 &&
		rect.left >= 0 &&
		rect.bottom <=
			(window.innerHeight || document.documentElement.clientHeight) &&
		rect.right <= (window.innerWidth || document.documentElement.clientWidth)
	);
};

// Helper to scroll to element smoothly
export const scrollElementIntoView = (element: HTMLElement): Promise<void> => {
	return new Promise((resolve) => {
		if (!isElementInViewport(element)) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			// Give time for the scroll to complete
			setTimeout(resolve, 500);
		} else {
			resolve();
		}
	});
};

/**
 * Calculates the DOM distance between two elements (number of edges to traverse)
 *
 * @param sourceElement - First element
 * @param targetElement - Second element
 * @returns Number representing the distance between nodes
 */
const calculateDomDistance = (
	sourceElement: HTMLElement,
	targetElement: HTMLElement
): number => {
	if (sourceElement === targetElement) return 0;

	// Find the common ancestor
	const sourceAncestors: HTMLElement[] = [];
	let currentElement: HTMLElement | null = sourceElement;

	// Build path from source to root
	while (currentElement) {
		sourceAncestors.push(currentElement);
		currentElement = currentElement.parentElement;
	}

	// Check if target is in source's ancestor path
	let targetDistance = 0;
	currentElement = targetElement;

	while (currentElement) {
		const indexInSourcePath = sourceAncestors.indexOf(currentElement);
		if (indexInSourcePath !== -1) {
			// Found common ancestor, calculate total distance
			return targetDistance + indexInSourcePath;
		}
		targetDistance++;
		currentElement = currentElement.parentElement;
	}

	// If no common ancestor found (shouldn't happen in a valid DOM), return a large number
	return Number.MAX_SAFE_INTEGER;
};

/**
 * Finds the closest element to a source element that matches the provided search criteria
 *
 * @param sourceElement - The source element to measure distance from
 * @param searchCriteria - Criteria to find the target element (by text content or attribute)
 * @param scope - Element to limit the search within (defaults to document.body)
 * @returns The closest matching element or null if no match
 */
export const findClosestMatchingElement = (
	sourceElement: HTMLElement,
	searchCriteria: SearchCriteria,
	scope: HTMLElement = document.body
): HTMLElement | null => {
	if (!sourceElement) {
		console.warn('Source element not provided');
		return null;
	}

	// Convert string to selector if string is provided
	const criteria = normalizeCriteria(searchCriteria);

	// Direct selector search if provided
	if (criteria.selector) {
		const elements = Array.from(
			scope.querySelectorAll(criteria.selector)
		).filter(
			(el): el is HTMLElement =>
				el instanceof HTMLElement && el !== sourceElement
		);

		if (elements.length > 0) {
			// Sort by DOM distance from source element
			elements.sort((a, b) => {
				const distanceA = calculateDomDistance(sourceElement, a);
				const distanceB = calculateDomDistance(sourceElement, b);
				return distanceA - distanceB;
			});

			return elements[0];
		}

		return null;
	}

	// Get all elements in the scope
	const allElements = Array.from(scope.querySelectorAll('*')).filter(
		(el): el is HTMLElement => el instanceof HTMLElement && el !== sourceElement
	);

	// Find matching elements
	const matchingElements = allElements.filter((el) =>
		elementMatchesCriteria(el, criteria)
	);

	if (matchingElements.length === 0) {
		return null;
	}

	// Sort by DOM distance from source element
	matchingElements.sort((a, b) => {
		const distanceA = calculateDomDistance(sourceElement, a);
		const distanceB = calculateDomDistance(sourceElement, b);
		return distanceA - distanceB;
	});

	// Return the closest match
	return matchingElements[0];
};

/**
 * Finds the closest element to an element matching a source criteria that also matches target search criteria
 * Returns a lazy resolver that will find the element when needed
 *
 * @param sourceElementFinder - Source element finder (by selector, text, or role)
 * @param targetSearchCriteria - Criteria to find the target element. Can be a CSS selector string or a search criteria object.
 * @param fallbackPosition - Fallback position if source element can't be found (defaults to screen center)
 * @param scope - Element to limit the search within (defaults to document.body)
 * @returns A lazy position or element resolver
 */
export const findClosestElementBySearchCriteria = (
	sourceElementFinder: ElementFinder,
	targetSearchCriteria: SearchCriteria,
	fallbackPosition?: Position,
	scope?: HTMLElement
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();

			// First, find the source element
			const sourceElement = getElementOrPosition(
				sourceElementFinder,
				defaultPosition
			);

			// If source element couldn't be found, return fallback position
			if (!(sourceElement instanceof HTMLElement)) {
				console.warn('Source element not found, returning fallback position');
				return defaultPosition;
			}

			// Then find the closest matching element to the source
			// Safe check for document in SSR environments like Next.js
			const searchScope =
				scope || (typeof document !== 'undefined' ? document.body : null);

			// If we don't have a valid search scope, return the fallback position
			if (!searchScope) {
				console.warn('Search scope not available, returning fallback position');
				return defaultPosition;
			}

			// If targetSearchCriteria is a string, treat it as a selector
			const searchCriteria =
				typeof targetSearchCriteria === 'string'
					? { selector: targetSearchCriteria }
					: targetSearchCriteria;

			const closestElement = findClosestMatchingElement(
				sourceElement,
				searchCriteria,
				searchScope
			);

			// Return the element or fallback position
			return closestElement || defaultPosition;
		},
	};
};

/**
 * Creates a lazy element finder that finds the closest element matching the criteria.
 * Useful for finding elements like `data-handleid="output-response"` that are
 * closest to elements containing specific text (e.g., "Generate Output").
 *
 * @param sourceElementFinder - Finder for the source element, can be a CSS selector string or an ElementFinder object
 * @param targetSearchCriteria - Criteria to find the target element. Can be a CSS selector string or a search criteria object.
 * @param fallbackPosition - Fallback position if elements aren't found (defaults to screen center)
 * @param scope - Optional element to limit the search within
 * @returns A lazy position or element resolver
 */
export const lazyFindClosestElement = (
	sourceElementFinder: ElementFinder,
	targetSearchCriteria: SearchCriteria,
	fallbackPosition?: Position,
	scope?: HTMLElement
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();

			// First find the source element
			const sourceElement = getElementOrPosition(
				sourceElementFinder,
				defaultPosition
			);

			// If source element couldn't be found, return fallback position
			if (!(sourceElement instanceof HTMLElement)) {
				console.warn('Source element not found, returning fallback position');
				return defaultPosition;
			}

			// Find the closest matching element
			// Safe check for document in SSR environments like Next.js
			const searchScope =
				scope || (typeof document !== 'undefined' ? document.body : null);

			// If we don't have a valid search scope, return the fallback position
			if (!searchScope) {
				console.warn('Search scope not available, returning fallback position');
				return defaultPosition;
			}

			// If targetSearchCriteria is a string, treat it as a selector
			const searchCriteria =
				typeof targetSearchCriteria === 'string'
					? { selector: targetSearchCriteria }
					: targetSearchCriteria;

			const closestElement = findClosestMatchingElement(
				sourceElement,
				searchCriteria,
				searchScope
			);

			return closestElement || defaultPosition;
		},
	};
};

/**
 * Finds a child element within a parent element that matches the provided search criteria
 *
 * @param parentElement - The parent element to search within
 * @param searchCriteria - Criteria to find the child element (by text content, attribute or class)
 * @returns The matching child element or null if no match
 */
export const findChildElement = (
	parentElement: HTMLElement,
	searchCriteria: SearchCriteria
): HTMLElement | null => {
	if (!parentElement) {
		console.warn('Parent element not provided');
		return null;
	}

	// Convert string to selector if string is provided
	const criteria = normalizeCriteria(searchCriteria);

	// Direct selector search if provided
	if (criteria.selector) {
		const element = parentElement.querySelector(criteria.selector);
		if (element instanceof HTMLElement) {
			return element;
		}
	}

	// Get all child elements from the parent
	const allChildElements = Array.from(
		parentElement.querySelectorAll('*')
	).filter((el): el is HTMLElement => el instanceof HTMLElement);

	// Find first matching child
	if (criteria.text) {
		// Use exact text matching for text criteria
		return (
			allChildElements.find((el) => el.textContent === criteria.text) || null
		);
	}

	// For non-text criteria, use the standard matching function
	return (
		allChildElements.find((el) => elementMatchesCriteria(el, criteria)) || null
	);
};

/**
 * Finds a child element within a parent element identified by the parent finder.
 * Unlike lazyFindChildElement, this resolves immediately and returns the result.
 *
 * @param parentElementFinder - Finder for the parent element
 * @param childSearchCriteria - Criteria to find the child element
 * @param fallbackPosition - Fallback position if elements aren't found (defaults to screen center)
 * @returns The found child element or fallback position
 */
export const findChildElementImmediate = (
	parentElementFinder: ElementFinder,
	childSearchCriteria: SearchCriteria,
	fallbackPosition?: Position
): Position | HTMLElement => {
	// Use screen center if fallbackPosition is not provided
	const defaultPosition = fallbackPosition || getScreenCenterPosition();

	// First find the parent element
	const parentElement = getElementOrPosition(
		parentElementFinder,
		defaultPosition
	);

	// If parent element couldn't be found, return fallback position
	if (!(parentElement instanceof HTMLElement)) {
		console.warn('Parent element not found, returning fallback position');
		return defaultPosition;
	}

	// Convert string to selector if string is provided
	const searchCriteria =
		typeof childSearchCriteria === 'string'
			? { selector: childSearchCriteria }
			: childSearchCriteria;

	// Find the child element within the parent
	const childElement = findChildElement(parentElement, searchCriteria);

	return childElement || defaultPosition;
};

/**
 * Creates a lazy element finder that first finds a parent element, then finds a child within it.
 *
 * @param parentElementFinder - Finder for the parent element
 * @param childSearchCriteria - Criteria to find the child element
 * @param fallbackPosition - Fallback position if elements aren't found (defaults to screen center)
 * @returns A lazy position or element resolver
 */
export const lazyFindChildElement = (
	parentElementFinder: ElementFinder,
	childSearchCriteria: SearchCriteria,
	fallbackPosition?: Position
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();

			// First find the parent element
			const parentElement = getElementOrPosition(
				parentElementFinder,
				defaultPosition
			);

			// If parent element couldn't be found, return fallback position
			if (!(parentElement instanceof HTMLElement)) {
				console.warn('Parent element not found, returning fallback position');
				return defaultPosition;
			}

			// Convert string to selector if string is provided
			const searchCriteria =
				typeof childSearchCriteria === 'string'
					? { selector: childSearchCriteria }
					: childSearchCriteria;

			// Find the child element within the parent
			const childElement = findChildElement(parentElement, searchCriteria);

			return childElement || defaultPosition;
		},
	};
};

/**
 * Finds a parent element of a specified source element
 *
 * @param sourceElement - The source element whose parent we want to find
 * @param levels - Number of levels to go up (1 = parent, 2 = grandparent)
 * @returns The parent element or null if not available
 */
export const findParentElement = (
	sourceElement: HTMLElement,
	levels: number = 1
): HTMLElement | null => {
	if (!sourceElement) {
		console.warn('Source element not provided');
		return null;
	}

	let parentElement: HTMLElement | null = sourceElement;

	// Navigate up the DOM tree by the specified number of levels
	for (let i = 0; i < levels && parentElement; i++) {
		parentElement = parentElement.parentElement;
	}

	return parentElement;
};

/**
 * Creates a lazy element finder that first finds a source element, then navigates to its parent
 *
 * @param sourceElementFinder - Finder for the source element
 * @param levels - Number of levels to go up (1 = parent, 2 = grandparent)
 * @param fallbackPosition - Fallback position if elements aren't found (defaults to screen center)
 * @returns A lazy position or element resolver
 */
export const lazyFindParentElement = (
	sourceElementFinder: ElementFinder,
	levels: number = 1,
	fallbackPosition?: Position
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();

			// First find the source element
			const sourceElement = getElementOrPosition(
				sourceElementFinder,
				defaultPosition
			);

			// If source element couldn't be found, return fallback position
			if (!(sourceElement instanceof HTMLElement)) {
				console.warn('Source element not found, returning fallback position');
				return defaultPosition;
			}

			// Find the parent element
			const parentElement = findParentElement(sourceElement, levels);
			return parentElement || defaultPosition;
		},
	};
};

/**
 * Finds the nearest parent element of a specific tag type
 *
 * @param sourceElement - The source element whose parent we want to find
 * @param parentTagName - Tag name of the parent to look for (e.g., 'button', 'div')
 * @returns The matching parent element or null if not found
 */
export const findParentOfType = (
	sourceElement: HTMLElement,
	parentTagName: string
): HTMLElement | null => {
	if (!sourceElement) {
		console.warn('Source element not provided');
		return null;
	}

	let currentElement: HTMLElement | null = sourceElement;

	// Navigate up the DOM tree until we find the specified tag or reach the top
	while (
		currentElement &&
		currentElement.tagName.toLowerCase() !== parentTagName.toLowerCase()
	) {
		currentElement = currentElement.parentElement;
	}

	return currentElement;
};

/**
 * Finds the nearest parent element that matches the provided search criteria
 *
 * @param sourceElement - The source element whose parent we want to find
 * @param searchCriteria - Criteria to find the parent element (by text, attribute, class, or selector)
 * @returns The matching parent element or null if not found
 */
export const findParentByCriteria = (
	sourceElement: HTMLElement,
	searchCriteria: SearchCriteria
): HTMLElement | null => {
	if (!sourceElement) {
		console.warn('Source element not provided');
		return null;
	}

	let currentElement: HTMLElement | null = sourceElement.parentElement;

	// Navigate up the DOM tree until we find an element matching our criteria or reach the top
	while (currentElement) {
		if (elementMatchesCriteria(currentElement, searchCriteria)) {
			return currentElement;
		}
		currentElement = currentElement.parentElement;
	}

	return null;
};

/**
 * Creates a lazy element finder that first finds an element with a specific child,
 * then finds its nearest parent matching the provided search criteria
 *
 * @param childSearchCriteria - Criteria to find the child element (by text, attribute, class, or selector)
 * @param parentSearchCriteria - Criteria to find the parent element (by text, attribute, class, or selector)
 * @param fallbackPosition - Fallback position if elements aren't found (defaults to screen center)
 * @param scope - Optional element to limit the search within
 * @returns A lazy position or element resolver
 */
export const lazyFindParent = (
	childSearchCriteria: SearchCriteria,
	parentSearchCriteria: SearchCriteria,
	fallbackPosition?: Position,
	scope?: HTMLElement
): LazyPositionOrElement => {
	return {
		_lazy: true,
		resolve: () => {
			// Use screen center if fallbackPosition is not provided
			const defaultPosition = fallbackPosition || getScreenCenterPosition();

			// Safe check for document in SSR environments like Next.js
			const searchScope =
				scope || (typeof document !== 'undefined' ? document.body : null);

			// If we don't have a valid search scope, return the fallback position
			if (!searchScope) {
				console.warn('Search scope not available, returning fallback position');
				return defaultPosition;
			}

			// Find the element matching our child criteria
			let targetElement: HTMLElement | null = null;

			// Convert string to selector if string is provided
			const childCriteria = normalizeCriteria(childSearchCriteria);

			// Normalize parent criteria - handle ID selectors specially
			const parentCriteria =
				typeof parentSearchCriteria === 'string' &&
				parentSearchCriteria.startsWith('#')
					? { selector: parentSearchCriteria }
					: normalizeCriteria(parentSearchCriteria);

			// Direct selector search if provided for child
			if (childCriteria.selector) {
				const element = searchScope.querySelector(childCriteria.selector);
				if (element instanceof HTMLElement) {
					targetElement = element;
				}
			} else if (childCriteria.text) {
				// Improved text search - try multiple approaches
				// 1. First try direct text content match with XPath
				const xpath = `//*[contains(text(), '${childCriteria.text}')]`;
				try {
					const result = document.evaluate(
						xpath,
						searchScope,
						null,
						XPathResult.FIRST_ORDERED_NODE_TYPE,
						null
					);
					targetElement = result.singleNodeValue as HTMLElement | null;
				} catch (error) {
					console.warn('XPath evaluation error:', error);
				}

				// 2. If not found, try searching for any element containing the text
				if (!targetElement) {
					const allElements = Array.from(
						searchScope.querySelectorAll('*')
					).filter((el): el is HTMLElement => el instanceof HTMLElement);

					targetElement =
						allElements.find((el) =>
							el.textContent?.includes(childCriteria.text || '')
						) || null;
				}
			} else {
				// Get all elements in the scope
				const allElements = Array.from(
					searchScope.querySelectorAll('*')
				).filter((el): el is HTMLElement => el instanceof HTMLElement);

				// Find the first matching element
				targetElement =
					allElements.find((el) => elementMatchesCriteria(el, childCriteria)) ||
					null;
			}

			// If target element couldn't be found, return fallback position
			if (!targetElement) {
				console.warn('Target element not found, returning fallback position');
				return defaultPosition;
			}

			// If parent criteria is an ID selector, find that element directly
			if (parentCriteria.selector && parentCriteria.selector.startsWith('#')) {
				const idSelector = parentCriteria.selector;
				const idElement = document.querySelector(idSelector);
				if (idElement instanceof HTMLElement) {
					return idElement;
				}
			}

			// Find the parent element that matches the criteria
			const parentElement = findParentByCriteria(targetElement, parentCriteria);

			// If no direct parent found, try to find the element by ID in the whole document
			if (
				!parentElement &&
				parentCriteria.selector &&
				parentCriteria.selector.startsWith('#')
			) {
				const idSelector = parentCriteria.selector;
				const idElement = document.querySelector(idSelector);
				if (idElement instanceof HTMLElement) {
					return idElement;
				}
			}

			return parentElement || defaultPosition;
		},
	};
};

/**
 * Checks if a rect is valid and visible on screen
 * A valid rect has positive width and height, and at least part of it is within the viewport
 *
 * @param rect - The DOM rectangle to check
 * @returns True if the rect is valid and visible, false otherwise
 */
export const isRectValidAndVisible = (rect: DOMRect | null): boolean => {
	if (!rect) return false;

	// Check if rect has valid dimensions
	if (rect.width <= 0 || rect.height <= 0) return false;

	// Check if at least part of the rect is within the viewport
	const viewportWidth =
		window.innerWidth || document.documentElement.clientWidth;
	const viewportHeight =
		window.innerHeight || document.documentElement.clientHeight;

	// Check if rect is completely outside the viewport
	if (
		rect.right < 0 ||
		rect.bottom < 0 ||
		rect.left > viewportWidth ||
		rect.top > viewportHeight
	) {
		return false;
	}

	return true;
};

/**
 * Finds an element and checks if it has a valid and visible rectangle on screen
 *
 * @param elementFinder - The finder for the element to check
 * @param shouldScroll - Whether to scroll the element into view (default: false)
 * @returns True if the element exists and has a valid visible rectangle, false otherwise
 */
export const hasValidVisibleRect = (
	elementFinder: ElementFinder,
	shouldScroll: boolean = false
): boolean => {
	try {
		const element = getElementOrPosition(elementFinder);

		// If we got back a Position instead of an element, it means the element wasn't found
		if (!(element instanceof HTMLElement)) {
			return false;
		}

		// Check if we should scroll the element into view
		if (shouldScroll && !isElementInViewport(element)) {
			scrollElementIntoView(element);
		}

		// Get the element's rect and check if it's valid and visible
		const rect = element.getBoundingClientRect();
		return isRectValidAndVisible(rect);
	} catch (error) {
		console.warn('Error checking for valid rect:', error);
		return false;
	}
};

/**
 * Creates a lazy function that checks if an element has a valid and visible rectangle
 * Useful for conditionals in IF actions
 *
 * @param elementFinder - The finder for the element to check
 * @param shouldScroll - Whether to scroll the element into view (default: false)
 * @returns A function that returns true if the element has a valid visible rectangle, false otherwise
 */
export const lazyHasValidVisibleRect = (
	elementFinder: ElementFinder,
	shouldScroll: boolean = false
): (() => boolean) => {
	return () => hasValidVisibleRect(elementFinder, shouldScroll);
};

/**
 * Checks if multiple elements exist and are visible
 * Returns true only if ALL elements are valid and visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns True if all elements exist and have valid visible rectangles, false otherwise
 */
export const hasAllValidVisibleRects = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): boolean => {
	try {
		return elementFinders.every((finder) =>
			hasValidVisibleRect(finder, shouldScroll)
		);
	} catch (error) {
		console.warn('Error checking for valid rects:', error);
		return false;
	}
};

/**
 * Checks if at least one of multiple elements exists and is visible
 * Returns true if ANY of the elements are valid and visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns True if at least one element exists and has a valid visible rectangle, false otherwise
 */
export const hasAnyValidVisibleRect = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): boolean => {
	try {
		return elementFinders.some((finder) =>
			hasValidVisibleRect(finder, shouldScroll)
		);
	} catch (error) {
		console.warn('Error checking for valid rects:', error);
		return false;
	}
};

/**
 * Creates a lazy function that checks if all elements exist and are visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns A function that returns true if all elements have valid visible rectangles, false otherwise
 */
export const lazyHasAllValidVisibleRects = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): (() => boolean) => {
	return () => hasAllValidVisibleRects(elementFinders, shouldScroll);
};

/**
 * Creates a lazy function that checks if at least one element exists and is visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns A function that returns true if at least one element has a valid visible rectangle, false otherwise
 */
export const lazyHasAnyValidVisibleRect = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): (() => boolean) => {
	return () => hasAnyValidVisibleRect(elementFinders, shouldScroll);
};

/**
 * Checks if an element has a specific attribute with an optional value check
 *
 * @param elementFinder - The finder for the element to check
 * @param attributeName - The name of the attribute to check for
 * @param attributeValue - Optional value the attribute should have
 * @returns True if the element has the attribute (with matching value if specified), false otherwise
 */
export const hasAttribute = (
	elementFinder: ElementFinder,
	attributeName: string,
	attributeValue?: string
): boolean => {
	try {
		const element = getElementOrPosition(elementFinder);

		if (!(element instanceof HTMLElement)) {
			return false;
		}

		const attrValue = element.getAttribute(attributeName);

		if (attrValue === null) {
			return false;
		}

		return attributeValue === undefined ? true : attrValue === attributeValue;
	} catch (error) {
		console.warn('Error checking for attribute:', error);
		return false;
	}
};

/**
 * Creates a lazy function that checks if an element has a specific attribute
 *
 * @param elementFinder - The finder for the element to check
 * @param attributeName - The name of the attribute to check for
 * @param attributeValue - Optional value the attribute should have
 * @returns A function that returns true if the element has the attribute (with matching value if specified), false otherwise
 */
export const lazyHasAttribute = (
	elementFinder: ElementFinder,
	attributeName: string,
	attributeValue?: string
): (() => boolean) => {
	return () => hasAttribute(elementFinder, attributeName, attributeValue);
};

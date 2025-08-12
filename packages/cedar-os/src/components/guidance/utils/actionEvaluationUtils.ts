import {
	ElementFinder,
	hasValidVisibleRect,
	lazyHasAllValidVisibleRects,
	lazyHasAnyValidVisibleRect,
	lazyHasAttribute,
	lazyHasValidVisibleRect,
} from '@/components/guidance';

/**
 * Helper function for IF actions to check if an element exists and is visible
 *
 * @param elementFinder - The finder for the element to check
 * @param shouldScroll - Whether to scroll the element into view (default: false)
 * @returns A function that returns true if the element has a valid visible rectangle, false otherwise
 */
export const ifElementExists = (
	elementFinder: ElementFinder,
	shouldScroll: boolean = false
): (() => boolean) => {
	return lazyHasValidVisibleRect(elementFinder, shouldScroll);
};

/**
 * Helper function for IF actions to directly check if an element exists and is visible
 * Use this when you need to immediately evaluate the condition
 *
 * @param elementFinder - The finder for the element to check
 * @param shouldScroll - Whether to scroll the element into view (default: false)
 * @returns True if the element exists and has a valid visible rectangle, false otherwise
 */
export const ifElementExistsSync = (
	elementFinder: ElementFinder,
	shouldScroll: boolean = false
): boolean => {
	return hasValidVisibleRect(elementFinder, shouldScroll);
};

/**
 * Helper function for IF actions to check if all elements exist and are visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns A function that returns true if all elements have valid visible rectangles, false otherwise
 */
export const ifAllElementsExist = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): (() => boolean) => {
	return lazyHasAllValidVisibleRects(elementFinders, shouldScroll);
};

/**
 * Helper function for IF actions to check if at least one element exists and is visible
 *
 * @param elementFinders - Array of element finders to check
 * @param shouldScroll - Whether to scroll elements into view (default: false)
 * @returns A function that returns true if at least one element has a valid visible rectangle, false otherwise
 */
export const ifAnyElementExists = (
	elementFinders: ElementFinder[],
	shouldScroll: boolean = false
): (() => boolean) => {
	return lazyHasAnyValidVisibleRect(elementFinders, shouldScroll);
};

/**
 * Helper function for IF actions to check if an element has a specific attribute
 *
 * @param elementFinder - The finder for the element to check
 * @param attributeName - The name of the attribute to check for
 * @param attributeValue - Optional value the attribute should have
 * @returns A function that returns true if the element has the attribute (with matching value if specified), false otherwise
 */
export const ifElementHasAttribute = (
	elementFinder: ElementFinder,
	attributeName: string,
	attributeValue?: string
): (() => boolean) => {
	return lazyHasAttribute(elementFinder, attributeName, attributeValue);
};

/**
 * Helper function that combines multiple conditions with AND logic
 * Returns true only if ALL conditions return true
 *
 * @param conditions - Array of condition functions to check
 * @returns A function that returns true if all conditions return true, false otherwise
 */
export const ifAll = (conditions: Array<() => boolean>): (() => boolean) => {
	return () => conditions.every((condition) => condition());
};

/**
 * Helper function that combines multiple conditions with OR logic
 * Returns true if ANY condition returns true
 *
 * @param conditions - Array of condition functions to check
 * @returns A function that returns true if any condition returns true, false otherwise
 */
export const ifAny = (conditions: Array<() => boolean>): (() => boolean) => {
	return () => conditions.some((condition) => condition());
};

/**
 * Helper function that negates a condition
 * Returns true if the condition returns false, and vice versa
 *
 * @param condition - The condition function to negate
 * @returns A function that returns the opposite of the condition
 */
export const ifNot = (condition: () => boolean): (() => boolean) => {
	return () => !condition();
};

/**
 * Periodically checks a condition until it returns true or times out
 * @param condition Function that returns true when the condition is met
 * @param checkIntervalMs How often to check the condition (in milliseconds)
 * @param timeoutMs Maximum time to wait before giving up (in milliseconds)
 * @returns Promise that resolves to true if condition was met, false if timed out
 */
export const checkConditionPeriodically = (
	condition: () => boolean,
	checkIntervalMs: number = 1000,
	timeoutMs: number = 30000
): Promise<boolean> => {
	return new Promise((resolve) => {
		// Track start time to implement timeout
		const startTime = Date.now();
		let timeoutId: NodeJS.Timeout;

		// Function to check condition and either resolve or schedule next check
		const checkCondition = () => {
			// Check if condition is met
			if (condition()) {
				return resolve(true);
			}

			// Check if we've timed out
			if (Date.now() - startTime > timeoutMs) {
				return resolve(false);
			}

			// Schedule next check
			timeoutId = setTimeout(checkCondition, checkIntervalMs);
		};

		// Start checking
		checkCondition();

		return () => clearTimeout(timeoutId);
	});
};

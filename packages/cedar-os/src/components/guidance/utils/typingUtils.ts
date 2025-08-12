// Helper to check if a value matches the expected pattern
export const isValueMatching = (
	value: string,
	expected: string | ((val: string) => boolean)
): boolean => {
	if (typeof expected === 'function') {
		return expected(value);
	}

	return value === expected;
};

// Common validation functions
export const validationPatterns = {
	email: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
	url: (value: string) =>
		/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/.test(value),
	number: (value: string) => /^\d+$/.test(value),
};

// Helper function to update React input values
export const updateReactInputValue = (
	element: HTMLInputElement | HTMLTextAreaElement | HTMLElement,
	value: string
): void => {
	// Regular input element handling (existing code)
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement
	) {
		// Set the DOM element value directly
		element.value = value;

		// Create a native browser input event
		const nativeInputEvent = new Event('input', {
			bubbles: true,
			cancelable: true,
		});

		// Create a change event with the properly constructed target property
		const nativeChangeEvent = new Event('change', {
			bubbles: true,
			cancelable: true,
		});

		// Define the target property for both events to ensure React gets the right information
		Object.defineProperty(nativeInputEvent, 'target', {
			writable: false,
			value: {
				value,
				name: element.name || '',
				type: element.type || 'text',
			},
		});

		Object.defineProperty(nativeChangeEvent, 'target', {
			writable: false,
			value: {
				value,
				name: element.name || '',
				type: element.type || 'text',
			},
		});

		// First dispatch native browser events
		element.dispatchEvent(nativeInputEvent);
		element.dispatchEvent(nativeChangeEvent);

		// Try to find any React-specific handlers
		const reactHandlerKey = Object.keys(element).find(
			(key) =>
				key.startsWith('__reactEventHandlers') || key.startsWith('__reactProps')
		);

		if (reactHandlerKey) {
			// Cast element to access handlers
			const reactHandlerObject = element as unknown as Record<string, unknown>;
			const reactHandlers = reactHandlerObject[reactHandlerKey] as
				| {
						onChange?: (e: Event) => void;
						onInput?: (e: Event) => void;
				  }
				| undefined;

			// Call React handlers directly if they exist
			if (reactHandlers) {
				if (reactHandlers.onChange) {
					reactHandlers.onChange(nativeChangeEvent);
				}
				if (reactHandlers.onInput) {
					reactHandlers.onInput(nativeInputEvent);
				}
			}
		}
	} else {
		// Safety check - ensure element is valid before proceeding
		if (!element || typeof element.getAttribute !== 'function') {
			console.error('Invalid element passed to updateReactInputValue');
			return;
		}

		// Handle contenteditable divs differently
		if (element.getAttribute('contenteditable') === 'true') {
			// Set innerHTML for contenteditable elements
			element.innerHTML = value;

			// Create a change event to notify React
			const nativeInputEvent = new Event('input', {
				bubbles: true,
				cancelable: true,
			});

			element.dispatchEvent(nativeInputEvent);
			return;
		}
	}
};

// Helper to check if element is a valid input element (including contenteditable)
export const isInputElement = (element: HTMLElement | null): boolean => {
	if (!element) return false;
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		(typeof element.getAttribute === 'function' &&
			element.getAttribute('contenteditable') === 'true')
	);
};

// Helper to get element value regardless of element type
export const getElementValue = (element: HTMLElement): string => {
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element.value;
	}
	if (typeof element.getAttribute !== 'function') return '';

	if (element.getAttribute('contenteditable') === 'true') {
		// TipTap and other rich text editors might have their content in a different structure
		// First try getting plain text content
		return element.textContent || '';
	}
	return '';
};

// Helper to clear element value regardless of element type
export const clearElementValue = (element: HTMLElement): void => {
	if (!element) return;
	if (typeof element.getAttribute !== 'function') return;

	if (element.getAttribute('contenteditable') === 'true') {
		element.innerHTML = '';
	} else if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement
	) {
		element.value = '';
	}
};

// Helper to type into a contenteditable element
export const typeIntoContentEditable = (
	element: HTMLElement,
	text: string,
	typingDelay: number
): Promise<void> => {
	return new Promise((resolve) => {
		// Safety check - ensure element is valid
		if (!element || typeof element.getAttribute !== 'function') {
			console.error('Invalid element passed to typeIntoContentEditable');
			resolve(); // Resolve the promise to avoid hanging
			return;
		}

		// Detect if this is a TipTap/ProseMirror editor
		const isTipTap =
			element.classList.contains('tiptap') ||
			element.classList.contains('ProseMirror');

		// Clear existing content
		if (isTipTap) {
			// For TipTap, we need to maintain the paragraph structure
			// Check if there's already a paragraph element
			const paragraphs = element.querySelectorAll('p');
			if (paragraphs.length > 0) {
				// Clear the content of the first paragraph
				paragraphs[0].textContent = '';
				// Remove any other paragraphs
				for (let i = 1; i < paragraphs.length; i++) {
					paragraphs[i].remove();
				}
			} else {
				// Create a paragraph if none exists
				element.innerHTML = '<p></p>';
			}
		} else {
			// For regular contenteditable
			element.innerHTML = '';
		}

		// Focus the element
		element.focus();

		// Find the target node to insert text into
		const targetNode = isTipTap
			? element.querySelector('p') || element
			: element;

		// Create a text node if needed
		if (!targetNode.firstChild) {
			const textNode = document.createTextNode('');
			targetNode.appendChild(textNode);
		}

		// Set cursor at the end of the target node
		const selection = window.getSelection();
		const range = document.createRange();

		if (targetNode.firstChild) {
			range.setStart(targetNode.firstChild, 0);
		} else {
			range.setStart(targetNode, 0);
		}

		range.collapse(true);
		selection?.removeAllRanges();
		selection?.addRange(range);

		// Type character by character with consistent speed using the provided typingDelay
		let index = 0;

		const intervalId = setInterval(() => {
			if (index < text.length) {
				// Check if we can use execCommand (preferred method)
				if (document.queryCommandSupported('insertText')) {
					document.execCommand('insertText', false, text[index]);
				} else {
					// Alternative: update the target node directly
					if (
						targetNode.firstChild &&
						targetNode.firstChild.nodeType === Node.TEXT_NODE
					) {
						// Update existing text node
						targetNode.firstChild.textContent =
							(targetNode.firstChild.textContent || '') + text[index];
					} else {
						// Create a new text node if needed
						const currentText = targetNode.textContent || '';
						targetNode.textContent = currentText + text[index];
					}

					// Trigger events for React
					element.dispatchEvent(new Event('input', { bubbles: true }));
					element.dispatchEvent(new Event('change', { bubbles: true }));
				}

				index++;
			} else {
				clearInterval(intervalId);

				// For TipTap, make sure we trigger a final update
				if (isTipTap) {
					element.dispatchEvent(new Event('input', { bubbles: true }));
					element.dispatchEvent(new Event('change', { bubbles: true }));

					// TipTap might need an extra keyboard event to fully register changes
					element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
				}

				// Allow time for React updates
				setTimeout(resolve, 100);
			}
		}, typingDelay); // Use the provided typingDelay for consistent spacing between characters
	});
};

export type Timeout = ReturnType<typeof setTimeout>;

// Main typing function that can be used by both VirtualTypingCursor and ExecuteTyping
export const startTypingAnimation = (
	endElement: HTMLElement | null,
	expectedValue: string,
	typingDelay: number = 150,
	checkExistingValue: boolean = true,
	onComplete?: () => void,
	timeoutRef?: React.MutableRefObject<Timeout | null>
): Promise<void> => {
	return new Promise((resolve) => {
		if (
			!endElement ||
			!isInputElement(endElement) ||
			typeof expectedValue !== 'string'
		) {
			resolve();
			return;
		}

		// Focus the input element to ensure keyboard accessibility
		endElement.focus();

		// Check if the element already has the expected value
		const currentValue = getElementValue(endElement);
		if (checkExistingValue && isValueMatching(currentValue, expectedValue)) {
			onComplete?.();
			resolve();
			return;
		}

		// Clear the input field before typing
		clearElementValue(endElement);

		// Dispatch an input event after clearing to update any listeners
		endElement.dispatchEvent(new Event('input', { bubbles: true }));

		// Safety check for getAttribute
		if (typeof endElement.getAttribute !== 'function') {
			console.error('Element does not have getAttribute method');
			resolve();
			return;
		}

		// Special handling for contenteditable elements
		if (endElement.getAttribute('contenteditable') === 'true') {
			// Use our dedicated contenteditable typing function
			typeIntoContentEditable(endElement, expectedValue, typingDelay)
				.then(() => {
					onComplete?.();
					resolve();
				})
				.catch((error) => {
					console.error('Error typing into contenteditable:', error);
					resolve();
				});

			return;
		}

		// Standard input element typing (character by character)
		let index = 0;
		const typeNextChar = () => {
			if (index < expectedValue.length) {
				// Get current value up to the current index
				const newValue = expectedValue.substring(0, index + 1);

				// Use our helper function to update the input properly
				updateReactInputValue(endElement, newValue);

				// Check if we're at the end
				if (index === expectedValue.length - 1) {
					// Done
					onComplete?.();
					resolve();
				} else {
					// Schedule next character
					index++;
					// Use the user-specified typingDelay for consistent speed
					const timeout = setTimeout(typeNextChar, typingDelay);
					if (timeoutRef) {
						timeoutRef.current = timeout;
					}
				}
			}
		};

		// Use the same typingDelay for the first character for consistent speed
		const timeout = setTimeout(typeNextChar, typingDelay);
		if (timeoutRef) {
			timeoutRef.current = timeout;
		}
	});
};

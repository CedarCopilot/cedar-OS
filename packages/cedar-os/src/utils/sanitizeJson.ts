// Helper function to sanitize context data for JSON serialization
export const sanitizeJson = (obj: any): any => {
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map(sanitizeJson);
	}

	// Handle objects
	if (typeof obj === 'object') {
		// Check if it's a React element (has $$typeof property)
		if ('$$typeof' in obj) {
			return '[React Component]';
		}

		// Check if it's a DOM element
		if (obj instanceof Element) {
			return '[DOM Element]';
		}

		// Recursively sanitize object properties
		const sanitized: any = {};
		for (const [key, value] of Object.entries(obj)) {
			// Skip functions
			if (typeof value === 'function') {
				sanitized[key] = '[Function]';
			} else {
				sanitized[key] = sanitizeJson(value);
			}
		}
		return sanitized;
	}

	// Return primitives as-is
	return obj;
};

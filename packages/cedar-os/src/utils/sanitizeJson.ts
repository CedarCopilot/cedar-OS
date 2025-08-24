// Helper function to sanitize context data for JSON serialization
export const sanitizeJson = (obj: any, seen = new WeakSet()): any => {
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => sanitizeJson(item, seen));
	}

	// Handle objects
	if (typeof obj === 'object') {
		// Avoid circular references
		if (seen.has(obj)) {
			return '[Circular]';
		}
		seen.add(obj);

		// Check if it's a React element (has $$typeof property)
		if ('$$typeof' in obj) {
			return '[React Component]';
		}

		// Check if it's a DOM element
		if (typeof Element !== 'undefined' && obj instanceof Element) {
			return '[DOM Element]';
		}

		// Recursively sanitize object properties
		const sanitized: any = {};
		for (const [key, value] of Object.entries(obj)) {
			// Skip functions
			if (typeof value === 'function') {
				sanitized[key] = '[Function]';
			} else {
				sanitized[key] = sanitizeJson(value, seen);
			}
		}
		return sanitized;
	}

	// Return primitives as-is
	return obj;
};

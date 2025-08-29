// Helper function to sanitize context data for JSON serialization
export const sanitizeJson = (
	obj: object,
	visited = new Map<unknown, string>(),
	path = '$'
): object | string => {
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Handle functions early
	if (typeof obj === 'function') {
		return '[Function]';
	}

	// Handle arrays
	if (Array.isArray(obj)) {
		// Check for circular reference in arrays
		if (visited.has(obj)) {
			const originalPath = visited.get(obj);
			return `[Circular: ${originalPath}]`;
		}
		visited.set(obj, path);

		const result = obj.map((item, index) =>
			sanitizeJson(item, visited, `${path}[${index}]`)
		);
		return result;
	}

	// Handle objects
	if (typeof obj === 'object') {
		// Check for circular reference
		if (visited.has(obj)) {
			const originalPath = visited.get(obj);
			return `[Circular: ${originalPath}]`;
		}

		// Add to visited map with current path
		visited.set(obj, path);

		// Check if it's a React element (has $$typeof property)
		if ('$$typeof' in obj) {
			return '[React Component]';
		}

		// Check if it's a DOM element
		if (obj instanceof Element) {
			return '[DOM Element]';
		}

		// Check for other non-plain objects
		if (obj instanceof Date) {
			return obj.toISOString();
		}
		if (obj instanceof RegExp) {
			return obj.toString();
		}
		if (obj instanceof Error) {
			return {
				name: obj.name,
				message: obj.message,
				stack: obj.stack,
			};
		}
		if (obj instanceof Map || obj instanceof Set) {
			return `[${obj.constructor.name}]`;
		}

		// Recursively sanitize object properties
		const sanitized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			// Skip functions
			if (typeof value === 'function') {
				sanitized[key] = '[Function]';
			} else {
				// Build the JSON path for the property
				const propertyPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
					? `${path}.${key}`
					: `${path}["${key.replace(/"/g, '\\"')}"]`;
				sanitized[key] = sanitizeJson(value, visited, propertyPath);
			}
		}

		return sanitized;
	}

	// Return primitives as-is
	return obj;
};

// Helper function to desanitize JSON data back to its original form with circular references
export const desanitizeJson = (obj: unknown): unknown => {
	// First pass: create the structure without resolving circular references
	const structure = createStructure(obj);

	// Second pass: resolve all circular references
	resolveCircularReferences(structure, structure);

	return structure;
};

// First pass: create the basic structure
function createStructure(obj: unknown): unknown {
	if (obj === null || obj === undefined) {
		return obj;
	}

	// Primitives and strings (including circular reference markers)
	if (typeof obj !== 'object') {
		return obj;
	}

	// Arrays
	if (Array.isArray(obj)) {
		return obj.map((item) => createStructure(item));
	}

	// Objects
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		result[key] = createStructure(value);
	}
	return result;
}

// Second pass: resolve circular references
function resolveCircularReferences(obj: unknown, root: unknown): void {
	if (obj === null || obj === undefined || typeof obj !== 'object') {
		return;
	}

	if (Array.isArray(obj)) {
		for (let i = 0; i < obj.length; i++) {
			if (typeof obj[i] === 'string') {
				const circularMatch = (obj[i] as string).match(/^\[Circular: (.+)\]$/);
				if (circularMatch) {
					obj[i] = resolvePath(root, circularMatch[1]);
				}
			} else {
				resolveCircularReferences(obj[i], root);
			}
		}
	} else {
		// It's an object
		for (const [key, value] of Object.entries(obj)) {
			if (typeof value === 'string') {
				const circularMatch = value.match(/^\[Circular: (.+)\]$/);
				if (circularMatch) {
					(obj as Record<string, unknown>)[key] = resolvePath(
						root,
						circularMatch[1]
					);
				}
			} else {
				resolveCircularReferences(value, root);
			}
		}
	}
}

// Helper function to resolve a JSON path to the actual object reference
function resolvePath(root: unknown, path: string): unknown {
	// Handle root reference
	if (path === '$') {
		return root;
	}

	// Parse the path and navigate to the target
	let current: unknown = root;

	// Remove the leading $ and process the path
	const pathWithoutRoot = path.substring(1);

	// Split the path into segments, handling both dot notation and bracket notation
	const segments: string[] = [];
	let currentSegment = '';
	let inBracket = false;
	let inQuotes = false;
	let escapeNext = false;

	for (let i = 0; i < pathWithoutRoot.length; i++) {
		const char = pathWithoutRoot[i];

		if (escapeNext) {
			currentSegment += char;
			escapeNext = false;
			continue;
		}

		if (char === '\\') {
			escapeNext = true;
			continue;
		}

		if (char === '"' && inBracket) {
			inQuotes = !inQuotes;
			continue;
		}

		if (char === '[' && !inQuotes) {
			if (currentSegment) {
				segments.push(currentSegment);
				currentSegment = '';
			}
			inBracket = true;
			continue;
		}

		if (char === ']' && !inQuotes && inBracket) {
			if (currentSegment) {
				segments.push(currentSegment);
				currentSegment = '';
			}
			inBracket = false;
			continue;
		}

		if (char === '.' && !inBracket && !inQuotes) {
			if (currentSegment) {
				segments.push(currentSegment);
				currentSegment = '';
			}
			continue;
		}

		currentSegment += char;
	}

	if (currentSegment) {
		segments.push(currentSegment);
	}

	// Navigate through the object using the segments
	for (const segment of segments) {
		if (current === null || current === undefined) {
			return undefined;
		}

		// Check if segment is a number (array index)
		const indexMatch = segment.match(/^(\d+)$/);
		if (indexMatch) {
			current = (current as Record<number, unknown>)[parseInt(segment, 10)];
		} else {
			// It's a property name
			current = (current as Record<string, unknown>)[segment];
		}
	}

	return current;
}

import { useCedarStore } from '@/store/CedarStore';
import type { BasicStateValue } from '@/store/stateSlice/stateSlice';
import { compare, Operation } from 'fast-json-patch';
import type { DiffChecker } from './diffHistorySlice';
import { useEffect } from 'react';
import type { RegisterDiffStateConfig } from './diffHistorySlice';

// Re-export the config type from diffHistorySlice
export type { RegisterDiffStateConfig } from './diffHistorySlice';

/**
 * Return type for registerDiffState
 */
export interface DiffStateReturn {
	undo: () => boolean;
	redo: () => boolean;
	acceptAllDiffs: () => boolean;
	rejectAllDiffs: () => boolean;
}

/**
 * Filters JSON patches based on diffChecker configuration
 * @param patches - Array of JSON patch operations
 * @param diffChecker - Configuration for selective diff checking
 * @returns Filtered array of patches
 */
function filterPatchesByDiffChecker(
	patches: Operation[],
	diffChecker?: DiffChecker
): Operation[] {
	if (!diffChecker) {
		return patches;
	}

	const { type, fields } = diffChecker;

	if (type === 'ignore') {
		// Filter out patches that match any of the ignore fields (including child paths)
		return patches.filter((patch) => {
			return !fields.some((field) => {
				// Normalize paths (ensure they start with /)
				const normalizedField = field.startsWith('/') ? field : `/${field}`;
				const patchPath = patch.path;

				// Check if patch path starts with the ignore field (covers child paths too)
				return patchPath.startsWith(normalizedField);
			});
		});
	} else if (type === 'listen') {
		// Only keep patches that match any of the listen fields (including child paths)
		return patches.filter((patch) => {
			return fields.some((field) => {
				// Normalize paths (ensure they start with /)
				const normalizedField = field.startsWith('/') ? field : `/${field}`;
				const patchPath = patch.path;

				// Check if patch path starts with the listen field (covers child paths too)
				return patchPath.startsWith(normalizedField);
			});
		});
	}

	return patches;
}

/**
 * Utility function to add diff markers to array objects
 * Compares arrays and adds 'diff' field to objects based on changes
 * @param oldState - The previous state array
 * @param newState - The new state array
 * @param idField - The field to use as unique identifier (default: 'id')
 * @param diffPath - JSON path where to add the diff field (default: '' for root level, '/data' for nested)
 * @param diffChecker - Optional configuration for selective diff checking
 */
export function addDiffToArrayObjs<T extends Record<string, unknown>>(
	oldState: T[],
	newState: T[],
	idField: string = 'id',
	diffPath: string = '',
	diffChecker?: DiffChecker
): T[] {
	const oldMap = new Map(oldState.map((item) => [item[idField], item]));

	return newState.map((item) => {
		const id = item[idField];
		const oldItem = oldMap.get(id);

		let diffType: 'added' | 'changed' | null = null;

		if (!oldItem) {
			// Item was added
			diffType = 'added';
		} else {
			// Check if item was changed
			const patches = compare(oldItem, item);

			// Apply diffChecker filtering if provided
			const filteredPatches = filterPatchesByDiffChecker(patches, diffChecker);

			if (filteredPatches.length > 0) {
				diffType = 'changed';
			}
		}

		// If no changes, return item as is
		if (!diffType) {
			return item;
		}

		// Add diff field at the specified path
		return setValueAtPath(item, diffPath, diffType);
	});
}

/**
 * Helper function to set a value at a JSON path
 * @param obj - The object to modify
 * @param path - JSON path (e.g., '', '/data', '/nested/field')
 * @param value - The value to set
 */
function setValueAtPath<T>(obj: T, path: string, value: unknown): T {
	// Handle root level (empty path)
	if (!path || path === '' || path === '/') {
		return { ...obj, diff: value };
	}

	// Parse the path (remove leading slash and split by slash)
	const pathParts = path.startsWith('/')
		? path.slice(1).split('/')
		: path.split('/');

	// Create a deep copy of the object
	const result = JSON.parse(JSON.stringify(obj));

	// Navigate to the target location
	let current = result;
	for (let i = 0; i < pathParts.length - 1; i++) {
		const part = pathParts[i];
		if (!(part in current)) {
			current[part] = {};
		}
		current = current[part];
	}

	// Set the value at the final path
	const lastPart = pathParts[pathParts.length - 1];
	if (typeof current === 'object' && current !== null) {
		current[lastPart] = { ...current[lastPart], diff: value };
	}

	return result;
}

/**
 * Hook version of registerDiffState for use in React components
 * Sets up diff tracking for a state without overriding setters.
 * The diffHistorySlice will automatically propagate changes to stateSlice.
 *
 * @example
 * ```typescript
 * // For React Flow nodes, add diff markers to the data property
 * const nodesDiff = useRegisterDiffState({
 *   key: 'nodes',
 *   value: nodes,
 *   setValue: setNodes,
 *   description: 'Product roadmap nodes',
 *   computeState: (oldState, newState) => {
 *     return addDiffToArrayObjs(oldState, newState, 'id', '/data');
 *   },
 *   customSetters: {
 *     addNode: {
 *       name: 'addNode',
 *       description: 'Add a new node',
 *       parameters: [{ name: 'node', type: 'Node', description: 'Node to add' }],
 *       execute: (currentNodes, node) => {
 *         setNodes([...currentNodes, node]); // Diff tracking happens automatically
 *       }
 *     }
 *   }
 * });
 *
 * // Access the computed state and diff operations
 * const { computedState, undo, redo, acceptAllDiffs, rejectAllDiffs } = nodesDiff;
 * ```
 */
export function useRegisterDiffState<T extends BasicStateValue>(
	config: RegisterDiffStateConfig<T>
) {
	const registerDiffState = useCedarStore((state) => state.registerDiffState);

	// const { key } = config;

	// Register the diff state only once on mount
	// We intentionally don't include config.value in dependencies to avoid loops
	// The value will be synced through the one-way flow: diffHistorySlice → stateSlice → component
	useEffect(() => {
		registerDiffState(config);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		config.key,
		// Intentionally exclude config.value to prevent infinite loops
		// The value is managed by the store and synced back via setValue
		config.setValue,
		config.description,
		config.schema,
		config.customSetters,
		config.diffMode,
		config.computeState,
		registerDiffState,
	]);
}

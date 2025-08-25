# Diff History State Management

This module provides hooks for managing state with automatic diff tracking and history management in Cedar OS.

## `useDiffState`

A React hook that works like `useState` but automatically tracks changes, maintains history, and supports undo/redo operations.

### Basic Usage

```typescript
import { useDiffState } from 'cedar-os';

function MyComponent() {
	// Simple usage - just like useState but with diff tracking
	const [value, setValue] = useDiffState('myValue', 'initial value');

	return (
		<div>
			<p>{value}</p>
			<button onClick={() => setValue('new value')}>Update</button>
		</div>
	);
}
```

### Advanced Usage with Options

```typescript
import {
	useDiffState,
	useDiffStateOperations,
	addDiffToArrayObjs,
} from 'cedar-os';

function ProductRoadmap() {
	// State with diff visualization for arrays
	const [nodes, setNodes] = useDiffState('nodes', initialNodes, {
		description: 'Product roadmap nodes',
		diffMode: 'defaultAccept', // or 'holdAccept'
		computeState: (oldState, newState) => {
			// Add diff markers to array objects
			return addDiffToArrayObjs(oldState, newState, 'id', '/data');
		},
		customSetters: {
			addNode: {
				name: 'addNode',
				description: 'Add a new node',
				parameters: [{ name: 'node', type: 'Node' }],
				execute: (currentNodes, setValue, node) => {
					setValue([...currentNodes, node]);
				},
			},
		},
	});

	// Get diff operations in the same or different component
	const nodeOps = useDiffStateOperations('nodes');

	return (
		<div>
			{nodes.map((node) => (
				<div key={node.id} className={node.diff ? `diff-${node.diff}` : ''}>
					{node.data.title}
				</div>
			))}

			{nodeOps && (
				<div>
					<button onClick={nodeOps.undo}>Undo</button>
					<button onClick={nodeOps.redo}>Redo</button>
					<button onClick={nodeOps.acceptAllDiffs}>Accept All</button>
					<button onClick={nodeOps.rejectAllDiffs}>Reject All</button>
				</div>
			)}
		</div>
	);
}
```

## API Reference

### `useDiffState<T>(key, initialValue, options?)`

Creates a diff-tracked state.

**Parameters:**

- `key: string` - Unique identifier for the state
- `initialValue: T` - Initial value
- `options?` - Optional configuration:
  - `description?: string` - Human-readable description
  - `schema?: ZodSchema<T>` - Zod schema for validation
  - `diffMode?: 'defaultAccept' | 'holdAccept'` - How to handle diffs
  - `computeState?: (oldState, newState, patches) => T` - Transform state with diff markers
  - `customSetters?: Record<string, Setter<T>>` - Custom setter functions

**Returns:** `[state: T, setState: (value: T) => void]`

### `useDiffStateOperations<T>(key)`

Gets diff operations for a previously registered diff state.

**Parameters:**

- `key: string` - The key of the diff state

**Returns:** Object with operations or `null` if state not found:

- `undo: () => boolean` - Undo last change
- `redo: () => boolean` - Redo last undone change
- `acceptAllDiffs: () => boolean` - Accept all pending diffs
- `rejectAllDiffs: () => boolean` - Reject all pending diffs
- `oldState: T | undefined` - The old state value
- `newState: T | undefined` - The new state value

### `addDiffToArrayObjs<T>(oldState, newState, idField?, diffPath?)`

Utility function to add diff markers to array objects.

**Parameters:**

- `oldState: T[]` - Previous array state
- `newState: T[]` - New array state
- `idField?: string` - Field to use as unique identifier (default: 'id')
- `diffPath?: string` - JSON path where to add diff field (default: '' for root)

**Returns:** `T[]` - Array with diff markers added

## Diff Modes

- **`defaultAccept`**: Changes are immediately visible, diffs are for visualization only
- **`holdAccept`**: Changes are held until explicitly accepted or rejected

## Use Cases

1. **Form with Undo/Redo**: Track form changes and allow users to undo/redo
2. **Visual Diff Tracking**: Show what changed in complex data structures
3. **Approval Workflows**: Hold changes for review before applying
4. **Collaborative Editing**: Track and merge changes from multiple sources
5. **State History**: Maintain a complete history of state changes

## Comparison with Other Hooks

| Hook                   | Use Case              | Diff Tracking | History | Undo/Redo |
| ---------------------- | --------------------- | ------------- | ------- | --------- |
| `useState`             | Simple state          | ❌            | ❌      | ❌        |
| `useCedarState`        | Global state          | ❌            | ❌      | ❌        |
| `useDiffState`         | Diff-tracked state    | ✅            | ✅      | ✅        |
| `useRegisterDiffState` | Advanced diff control | ✅            | ✅      | ✅        |

Choose `useDiffState` when you need:

- Automatic diff tracking
- Undo/redo functionality
- Visual change indicators
- State history
- Simple useState-like API

# useControlledDiffState Hook

The `useControlledDiffState` hook provides manual control over diff state management, giving you explicit control over when diffs are created, saved, and managed. Unlike `useRegisterDiffState` which automatically tracks changes, this hook exposes all the diff operations as functions you can call when needed.

## Key Features

- **Manual diff control**: You decide when to create diffs vs. updating the base state
- **Version history**: Save snapshots and navigate through them with undo/redo
- **Selective diff management**: Accept or reject individual changes
- **Custom state setters**: Execute complex state updates with diff tracking
- **Computed state**: Transform state with diff markers for visualization

## Basic Usage

```typescript
import { useControlledDiffState } from 'cedar-os';

function MyComponent() {
	const diffControl = useControlledDiffState('myState', { count: 0 });

	const {
		state, // Current computed state with diff markers
		setState, // Set state without creating a diff
		newDiffState, // Create a new diff state
		saveVersion, // Save current state to history
		undo, // Undo to previous version
		redo, // Redo to next version
		acceptAllDiffs, // Accept all current diffs
		rejectAllDiffs, // Reject all current diffs
		isDiffMode, // Check if in diff mode
	} = diffControl;

	return (
		<div>
			<p>Count: {state.count}</p>
			<p>Diff Mode: {isDiffMode ? 'Yes' : 'No'}</p>

			{/* Update without creating a diff */}
			<button onClick={() => setState({ count: state.count + 1 })}>
				Increment (No Diff)
			</button>

			{/* Create a diff for review */}
			<button onClick={() => newDiffState({ count: state.count + 5 })}>
				Add 5 (With Diff)
			</button>

			{/* Accept or reject changes */}
			{isDiffMode && (
				<>
					<button onClick={acceptAllDiffs}>Accept Changes</button>
					<button onClick={rejectAllDiffs}>Reject Changes</button>
				</>
			)}

			{/* History navigation */}
			<button onClick={undo}>Undo</button>
			<button onClick={redo}>Redo</button>
		</div>
	);
}
```

## Advanced Example with Arrays and Diff Markers

```typescript
import { useControlledDiffState, addDiffToArrayObjs } from 'cedar-os';

interface TodoItem {
	id: string;
	text: string;
	completed: boolean;
	diff?: 'added' | 'changed';
}

function TodoList() {
	const todos = useControlledDiffState<TodoItem[]>('todos', [], {
		description: 'Todo list items',
		diffMode: 'holdAccept', // Hold changes for review
		computeState: (oldState, newState) => {
			// Add diff markers to visualize changes
			return addDiffToArrayObjs(oldState, newState, 'id');
		},
		stateSetters: {
			toggleTodo: {
				name: 'toggleTodo',
				description: 'Toggle todo completion',
				parameters: [{ name: 'id', type: 'string', description: 'Todo ID' }],
				execute: (currentTodos, setValue, id: string) => {
					setValue(
						currentTodos.map((todo) =>
							todo.id === id ? { ...todo, completed: !todo.completed } : todo
						)
					);
				},
			},
		},
	});

	const handleAddTodo = (text: string) => {
		const newTodo: TodoItem = {
			id: Date.now().toString(),
			text,
			completed: false,
		};

		// Create a diff so user can review the addition
		todos.newDiffState([...todos.state, newTodo]);
	};

	const handleToggleTodo = (id: string) => {
		// Use custom setter with diff tracking
		todos.executeDiffSetter('toggleTodo', { isDiff: true }, id);
	};

	const handleAcceptTodo = (id: string) => {
		// Accept changes for a specific todo
		todos.acceptDiff<TodoItem>(
			'', // root path for array
			'id', // identification field
			id // target todo ID
		);
	};

	return (
		<div>
			<ul>
				{todos.state.map((todo) => (
					<li key={todo.id} className={todo.diff ? `diff-${todo.diff}` : ''}>
						<input
							type='checkbox'
							checked={todo.completed}
							onChange={() => handleToggleTodo(todo.id)}
						/>
						<span>{todo.text}</span>

						{todo.diff && (
							<button onClick={() => handleAcceptTodo(todo.id)}>
								Accept Change
							</button>
						)}
					</li>
				))}
			</ul>

			{todos.isDiffMode && (
				<div>
					<button onClick={todos.acceptAllDiffs}>Accept All</button>
					<button onClick={todos.rejectAllDiffs}>Reject All</button>
				</div>
			)}
		</div>
	);
}
```

## Version Control Example

```typescript
function DocumentEditor() {
	const doc = useControlledDiffState('document', {
		title: 'Untitled',
		content: '',
		lastSaved: null,
	});

	const handleSave = () => {
		// Save current state as a version
		doc.saveVersion();

		// Update without creating a diff (this becomes the new baseline)
		doc.setState({
			...doc.state,
			lastSaved: new Date().toISOString(),
		});
	};

	const handleEdit = (updates: Partial<typeof doc.state>) => {
		// Create a diff for the edit
		doc.newDiffState({
			...doc.state,
			...updates,
		});
	};

	const handleExperiment = () => {
		// Save current state before experimenting
		doc.saveVersion();

		// Make experimental changes
		doc.newDiffState({
			...doc.state,
			content: doc.state.content + '\n\n[EXPERIMENTAL SECTION]',
		});
	};

	return (
		<div>
			<input
				value={doc.state.title}
				onChange={(e) => handleEdit({ title: e.target.value })}
			/>

			<textarea
				value={doc.state.content}
				onChange={(e) => handleEdit({ content: e.target.value })}
			/>

			<div>
				<button onClick={handleSave}>Save Version</button>
				<button onClick={handleExperiment}>Try Experiment</button>
				<button onClick={doc.undo}>Undo</button>
				<button onClick={doc.redo}>Redo</button>
			</div>

			{doc.isDiffMode && (
				<div>
					<p>You have unsaved changes</p>
					<button onClick={doc.acceptAllDiffs}>Keep Changes</button>
					<button onClick={doc.rejectAllDiffs}>Discard Changes</button>
				</div>
			)}
		</div>
	);
}
```

## API Reference

### Return Value

The hook returns an object with the following properties and methods:

| Property/Method     | Type                                                                      | Description                                                        |
| ------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `state`             | `T`                                                                       | The current computed state with diff markers applied               |
| `diffState`         | `DiffState<T> \| undefined`                                               | The current diff state information                                 |
| `setState`          | `(newValue: T) => void`                                                   | Set state without creating a diff (updates both old and new state) |
| `newDiffState`      | `(newValue: T) => void`                                                   | Create a new diff state (updates only new state)                   |
| `saveVersion`       | `() => void`                                                              | Save the current state as a version in history                     |
| `undo`              | `() => boolean`                                                           | Undo to the previous state in history                              |
| `redo`              | `() => boolean`                                                           | Redo to the next state in history                                  |
| `acceptAllDiffs`    | `() => boolean`                                                           | Accept all current diffs                                           |
| `rejectAllDiffs`    | `() => boolean`                                                           | Reject all current diffs                                           |
| `acceptDiff`        | `(jsonPath, identificationField, targetId?, diffMarkerPaths?) => boolean` | Accept a specific diff                                             |
| `rejectDiff`        | `(jsonPath, identificationField, targetId?, diffMarkerPaths?) => boolean` | Reject a specific diff                                             |
| `executeDiffSetter` | `(setterKey, options?, args?) => void`                                    | Execute a custom setter with diff tracking                         |
| `isDiffMode`        | `boolean`                                                                 | Check if currently in diff mode                                    |
| `oldState`          | `T \| undefined`                                                          | The old state (before changes)                                     |
| `newState`          | `T \| undefined`                                                          | The new state (with changes)                                       |

### Options

| Option         | Type                                 | Description                                           |
| -------------- | ------------------------------------ | ----------------------------------------------------- |
| `description`  | `string`                             | Human-readable description for AI metadata            |
| `stateSetters` | `Record<string, Setter<T>>`          | Custom setter functions for complex state updates     |
| `schema`       | `ZodSchema<T>`                       | Zod schema for validating the state                   |
| `diffMode`     | `'defaultAccept' \| 'holdAccept'`    | How to handle diffs (default: 'defaultAccept')        |
| `computeState` | `(oldState, newState, patches) => T` | Function to compute the final state with diff markers |

## When to Use

Use `useControlledDiffState` when you need:

- **Manual control** over when diffs are created
- **Version history** with save points and undo/redo
- **Review workflows** where changes need approval
- **Experimental changes** that might be reverted
- **Complex state updates** that need custom logic
- **Visual diff indicators** in your UI

## Comparison with Other Hooks

| Hook                     | Auto Diff Tracking | Manual Control | Use Case                                        |
| ------------------------ | ------------------ | -------------- | ----------------------------------------------- |
| `useCedarState`          | No                 | No             | Simple state management                         |
| `useDiffState`           | Yes                | No             | Automatic diff tracking with useState-like API  |
| `useRegisterDiffState`   | Yes                | Limited        | Automatic diff tracking with external state     |
| `useControlledDiffState` | No                 | Full           | Manual diff control with all operations exposed |

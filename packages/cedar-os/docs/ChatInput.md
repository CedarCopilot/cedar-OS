# ChatInput Component

The `ChatInput` component is a powerful chat input with mention support that automatically renders context badges based on registered mention providers.

## Basic Usage

```tsx
import { ChatInput } from 'cedar-os';

function MyComponent() {
	const [isInputFocused, setIsInputFocused] = useState(false);

	return (
		<ChatInput
			position='bottom-center'
			handleFocus={() => setIsInputFocused(true)}
			handleBlur={() => setIsInputFocused(false)}
			isInputFocused={isInputFocused}
			onSubmit={(message) => console.log(message)}
		/>
	);
}
```

## Dynamic Mention Providers

The key feature is that context badges are automatically rendered based on registered mention providers. You don't need to hardcode them!

### Using State-Based Mention Providers

```tsx
import { useStateBasedMentionProvider, useCedarState } from 'cedar-os';
import { FileText } from 'lucide-react';

function MyComponent() {
	// Define your state
	const [documents] = useCedarState('documents', [
		{ id: 'doc1', title: 'Project Proposal', type: 'pdf' },
		{ id: 'doc2', title: 'Meeting Notes', type: 'doc' },
	]);

	// Register a mention provider for this state
	useStateBasedMentionProvider({
		stateKey: 'documents',
		trigger: '@',
		labelField: 'title',
		searchFields: ['title', 'type'],
		description: 'Documents',
		icon: <FileText />,
		color: '#8b5cf6', // Purple
	});

	// The ChatInput will automatically show document badges when mentioned!
	return <ChatInput {...props} />;
}
```

### Multiple Providers

You can register multiple providers and they'll all work together:

```tsx
// Documents provider
useStateBasedMentionProvider({
	stateKey: 'documents',
	icon: <FileText />,
	color: '#8b5cf6',
});

// Team members provider
useStateBasedMentionProvider({
	stateKey: 'teamMembers',
	icon: <Users />,
	color: '#3b82f6',
});

// Tags provider with custom badge renderer
useStateBasedMentionProvider({
	stateKey: 'tags',
	icon: <Tag />,
	color: '#10b981',
	renderContextBadge: (entry) => (
		<div
			key={entry.id}
			className='custom-tag-badge'
			style={{ backgroundColor: entry.data?.color }}>
			{entry.metadata?.label}
		</div>
	),
});
```

## Custom Mention Providers

For advanced use cases, you can create fully custom providers:

```tsx
import { useMentionProvider } from 'cedar-os';

const customProvider = {
	id: 'custom-provider',
	trigger: '@',
	label: 'Custom Items',

	getItems: async (query) => {
		// Fetch or filter items based on query
		const items = await fetchItems(query);
		return items.map((item) => ({
			id: item.id,
			label: item.name,
			data: item,
		}));
	},

	toContextEntry: (item) => ({
		id: item.id,
		source: 'mention',
		data: item.data,
		metadata: {
			label: item.label,
			icon: <CustomIcon />,
			color: '#ff6b6b',
		},
	}),
};

useMentionProvider(customProvider);
```

## Props

### ChatInput Props

| Prop             | Type                                        | Description                            |
| ---------------- | ------------------------------------------- | -------------------------------------- |
| `position`       | `'bottom-center' \| 'embedded' \| 'custom'` | Position of the input container        |
| `handleFocus`    | `() => void`                                | Callback when input is focused         |
| `handleBlur`     | `() => void`                                | Callback when input loses focus        |
| `isInputFocused` | `boolean`                                   | Whether the input is currently focused |
| `onSubmit`       | `(message: string) => void`                 | Callback when message is submitted     |

### StateBasedMentionProviderConfig

| Prop                 | Type                         | Description                                     |
| -------------------- | ---------------------------- | ----------------------------------------------- |
| `stateKey`           | `string`                     | Key to identify the state in Cedar store        |
| `trigger`            | `string`                     | Character that triggers mentions (default: '@') |
| `labelField`         | `string \| (item) => string` | Field or function to extract label              |
| `searchFields`       | `string[]`                   | Fields to search in                             |
| `description`        | `string`                     | Description shown in mention list               |
| `icon`               | `ReactNode`                  | Icon for badges and mentions                    |
| `color`              | `string`                     | Hex color for badges                            |
| `renderMenuItem`     | `(item) => ReactNode`        | Custom menu item renderer                       |
| `renderEditorItem`   | `(item, attrs) => ReactNode` | Custom editor item renderer                     |
| `renderContextBadge` | `(entry) => ReactNode`       | Custom badge renderer                           |

## Features

- **Automatic Badge Rendering**: Badges appear automatically for all registered providers
- **Custom Renderers**: Full control over how items appear in menus, editor, and badges
- **Type-Safe**: Full TypeScript support
- **Icon & Color Support**: Built-in support for icons and colors
- **Search**: Built-in search functionality across specified fields
- **Removable Badges**: Click badges to remove them (for mention-sourced entries)

## Example

See the full example in `ChatInputExample.tsx` for a complete implementation with multiple providers.

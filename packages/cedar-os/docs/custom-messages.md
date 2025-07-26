# Custom Message Rendering System

Cedar provides a flexible and type-safe message rendering system that works out of the box with default message types, while allowing you to extend it with custom message types and renderers.

## Features

- **Zero Configuration**: Default message types work immediately
- **Type Safety**: Full TypeScript support with autocomplete and type checking
- **Extensible**: Add custom message types without modifying Cedar core
- **Registry-based**: Register custom renderers that override default rendering
- **Composable**: Mix default and custom message types seamlessly

## Default Message Types

Cedar includes these message types out of the box:

- `text` - Simple text messages with markdown support
- `todolist` - Todo list with checkable items
- `ticker` - Horizontal scrolling ticker with buttons
- `dialogue_options` - Interactive dialogue choices
- `multiple_choice` - Multiple choice questions
- `storyline` - Story sections with icons
- `slider` - Numeric slider input

## Basic Usage

For basic usage with default message types, just use the default store:

```tsx
import { useCedarStore } from '@/store/CedarStore';
import { ChatBubbles } from '@/components/chatMessages/ChatBubbles';

function App() {
	const { addMessage } = useCedarStore();

	// Add a message
	addMessage({
		type: 'text',
		role: 'user',
		content: 'Hello, Cedar!',
	});

	return <ChatBubbles />;
}
```

## Adding Custom Message Types

### 1. Define Your Message Types

```tsx
import { TypedMessage, DefaultMessage } from '@/store/CedarStore';

// Define custom message types
type CustomMessages =
	| DefaultMessage // Include all default types
	| TypedMessage<
			'image',
			{
				imageUrl: string;
				alt?: string;
				width?: number;
				height?: number;
			}
	  >
	| TypedMessage<
			'video',
			{
				videoUrl: string;
				thumbnail?: string;
				duration?: number;
			}
	  >;
```

### 2. Create a Typed Messages Slice

```tsx
import { createTypedMessagesSlice } from '@/store/CedarStore';

const customMessagesSlice = createTypedMessagesSlice<CustomMessages>();
```

### 3. Create Your Store

```tsx
import { createCedarStore } from '@/store/CedarStore';

export const useAppStore = createCedarStore({
	extend: [customMessagesSlice] as const,
	persistOptions: {
		name: 'my-app-store',
	},
});
```

### 4. Create Custom Renderers

```tsx
import { MessageByType } from '@/store/CedarStore';

const ImageMessageRenderer: React.FC<{
	message: MessageByType<'image', CustomMessages>;
}> = ({ message }) => {
	return (
		<div className='image-message'>
			<img
				src={message.imageUrl}
				alt={message.alt}
				width={message.width}
				height={message.height}
			/>
			{message.text && <p>{message.text}</p>}
		</div>
	);
};
```

### 5. Register Your Renderers

```tsx
import { useMessageRenderer } from '@/hooks/useMessageRenderer';

function App() {
	// Register the custom renderer
	useMessageRenderer({
		type: 'image',
		renderer: ImageMessageRenderer,
	});

	return <ChatBubbles />;
}
```

### 6. Use Your Custom Messages

```tsx
const { addMessage } = useAppStore();

// TypeScript provides full autocomplete and type checking!
addMessage({
	type: 'image', // ✅ Autocomplete shows all available types
	role: 'bot',
	text: 'Here is the image you requested',
	imageUrl: 'https://example.com/image.jpg',
	alt: 'Example image',
	width: 800,
	height: 600,
});

// TypeScript catches errors
addMessage({
	type: 'image',
	role: 'bot',
	text: 'Missing imageUrl',
	// ❌ Error: Property 'imageUrl' is missing
});
```

## Advanced Usage

### Multiple Custom Slices

You can extend the store with multiple slices:

```tsx
const messagesSlice = createTypedMessagesSlice<CustomMessages>();
const featuresSlice = createFeatureSlice();
const analyticsSlice = createAnalyticsSlice();

export const useAppStore = createCedarStore({
	extend: [messagesSlice, featuresSlice, analyticsSlice] as const,
});
```

### Override Default Renderers

You can override default message renderers by registering a new renderer with the same type:

```tsx
// Custom text renderer with different styling
const CustomTextRenderer: React.FC<{ message: TextMessage }> = ({
	message,
}) => {
	return <div className='custom-text-style'>{message.content}</div>;
};

useMessageRenderer({
	type: 'text',
	renderer: CustomTextRenderer,
	priority: 10, // Higher priority overrides default
});
```

### Conditional Rendering

You can use the `validateMessage` option for more complex rendering logic:

```tsx
useMessageRenderer({
	type: 'text',
	renderer: SpecialTextRenderer,
	validateMessage: (msg) =>
		msg.type === 'text' && msg.metadata?.isSpecial === true,
});
```

## Type Helpers

Cedar provides several type helpers for working with messages:

- `TypedMessage<T, P>` - Create a typed message with type T and properties P
- `MessageByType<T, M>` - Extract a specific message type from a union
- `BaseMessage` - The base interface all messages extend
- `DefaultMessage` - Union of all default message types

## Best Practices

1. **Always include DefaultMessage** in your custom types to maintain compatibility
2. **Use const assertions** when passing slices to createCedarStore
3. **Register renderers in a parent component** to ensure they're available
4. **Keep message types simple** - complex logic belongs in renderers
5. **Use the text field** for fallback content that works without custom rendering

## Migration from Default Store

If you're already using the default `useCedarStore`, migrating is easy:

```tsx
// Before
import { useCedarStore } from '@/store/CedarStore';

// After
import { useAppStore } from './store'; // Your custom store

// The API is identical, just with better types!
```

## Example: Complete Chat Application

See `packages/cedar-os/examples/custom-messages.tsx` for a complete example implementing custom image, code, and chart message types.

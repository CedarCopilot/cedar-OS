# cedar-os-components

A collection of React components for building conversational AI interfaces with Cedar OS.

## Installation

```bash
npm install cedar-os-components
```

## Usage

```tsx
import { ChatInput, FloatingCedarChat, Button } from 'cedar-os-components';

function MyApp() {
	return (
		<div>
			<FloatingCedarChat />
			<ChatInput />
			<Button>Click me</Button>
		</div>
	);
}
```

## Components

This package includes over 35 React components organized into categories:

### Chat Components

- `CedarCaptionChat` - Caption-style chat component with floating UI
- `FloatingCedarChat` - Floating chat interface with animation support
- `SidePanelCedarChat` - Side panel chat interface with slide animations

### Chat Input

- `ChatInput` - Enhanced chat input component with context support
- `ContextBadgeRow` - Row of context badges for chat input
- `FloatingChatInput` - Floating chat input with positioning and auto-close

### Chat Messages

- `CaptionMessages` - Caption-style message display component
- `ChatBubbles` - Animated chat bubble component
- `ChatRenderer` - Renders chat messages with markdown support
- `MarkdownRenderer` - Chat markdown rendering component
- `StreamingText` - Animated streaming text component
- And more...

### Containers

- `Container3D` - 3D-styled container with motion effects
- `GlassyPaneContainer` - Glass morphism container component
- `Flat3dContainer` - Flat container with 3D styling

### UI Components

- `Button` - Customizable button component
- `Slider3D` - 3D-styled slider component
- `KeyboardShortcut` - Keyboard shortcut display component

### Text Effects

- `ShimmerText` - Text with shimmer animation effect
- `TypewriterText` - Typewriter animation text component

### And Many More...

See the [registry.json](./registry.json) file for a complete list of all available components.

## Dependencies

This package has peer dependencies on:

- `react` >= 17.0.0
- `react-dom` >= 17.0.0

Additional dependencies are bundled with the package.

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode for development
npm run dev
```

## License

MIT

export interface ComponentRegistryEntry {
	name: string;
	type: 'chatComponents' | 'chatInput' | 'chatMessages' | 'containers' | 'inputs' | 'ornaments' | 'structural' | 'text' | 'ui';
	dependencies?: string[];
	devDependencies?: string[];
	registryDependencies?: string[];
	files: string[]; // Just the filenames, paths will be derived from type
	meta: {
		importName: string;
		displayName: string;
		description: string;
	};
}

// Helper function to get full file paths based on type and filename
export const getFilePath = (type: ComponentRegistryEntry['type'], filename: string): string => {
	return `${type}/${filename}`;
};

// Helper function to get all file paths for a component
export const getComponentFiles = (entry: ComponentRegistryEntry) => {
	return entry.files.map(filename => ({
		name: filename,
		path: getFilePath(entry.type, filename),
		type: filename.endsWith('.tsx') ? 'registry:component' as const : 
			  filename.endsWith('.css') ? 'registry:style' as const : 
			  'registry:ui' as const
	}));
};

export const registry: ComponentRegistryEntry[] = [
	// Chat Components
	{
		name: 'cedar-caption-chat',
		type: 'chatComponents',
		dependencies: ['react', 'lucide-react', 'uuid'],
		registryDependencies: ['cedar-os'],
		files: ['CedarCaptionChat.tsx'],
		meta: {
			importName: 'CedarCaptionChat',
			displayName: 'Cedar Caption Chat',
			description: 'Caption-style chat component with floating UI',
		},
	},
	{
		name: 'floating-cedar-chat',
		type: 'chatComponents',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['FloatingCedarChat.tsx'],
		meta: {
			importName: 'FloatingCedarChat',
			displayName: 'Floating Cedar Chat',
			description: 'Floating chat interface with animation support',
		},
	},
	{
		name: 'side-panel-cedar-chat',
		type: 'chatComponents',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['SidePanelCedarChat.tsx'],
		meta: {
			importName: 'SidePanelCedarChat',
			displayName: 'Side Panel Cedar Chat',
			description: 'Side panel chat interface with slide animations',
		},
	},

	// Chat Input
	{
		name: 'chat-input',
		type: 'chatInput',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['ChatInput.tsx', 'ChatInput.css', 'index.ts'],
		meta: {
			importName: 'ChatInput',
			displayName: 'Chat Input',
			description: 'Enhanced chat input component with context support',
		},
	},
	{
		name: 'context-badge-row',
		type: 'chatInput',
		dependencies: ['react', 'lucide-react'],
		registryDependencies: ['cedar-os'],
		files: ['ContextBadgeRow.tsx'],
		meta: {
			importName: 'ContextBadgeRow',
			displayName: 'Context Badge Row',
			description: 'Row of context badges for chat input',
		},
	},

	// Chat Messages
	{
		name: 'caption-messages',
		type: 'chatMessages',
		dependencies: ['react', 'lucide-react', 'motion-plus-react'],
		registryDependencies: ['cedar-os'],
		files: ['CaptionMessages.tsx'],
		meta: {
			importName: 'CaptionMessages',
			displayName: 'Caption Messages',
			description: 'Caption-style message display component',
		},
	},
	{
		name: 'chat-bubbles',
		type: 'chatMessages',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['ChatBubbles.tsx'],
		meta: {
			importName: 'ChatBubbles',
			displayName: 'Chat Bubbles',
			description: 'Animated chat bubble component',
		},
	},
	{
		name: 'chat-renderer',
		type: 'chatMessages',
		dependencies: ['react', 'react-markdown', 'motion-plus-react'],
		registryDependencies: ['cedar-os'],
		files: ['ChatRenderer.tsx'],
		meta: {
			importName: 'ChatRenderer',
			displayName: 'Chat Renderer',
			description: 'Renders chat messages with markdown support',
		},
	},
	{
		name: 'dialogue-options',
		type: 'chatMessages',
		dependencies: ['react'],
		registryDependencies: ['cedar-os'],
		files: ['DialogueOptions.tsx'],
		meta: {
			importName: 'DialogueOptions',
			displayName: 'Dialogue Options',
			description: 'Interactive dialogue option selector',
		},
	},
	{
		name: 'multiple-choice',
		type: 'chatMessages',
		dependencies: ['react'],
		registryDependencies: ['cedar-os'],
		files: ['MultipleChoice.tsx'],
		meta: {
			importName: 'MultipleChoice',
			displayName: 'Multiple Choice',
			description: 'Multiple choice question component',
		},
	},
	{
		name: 'storyline',
		type: 'chatMessages',
		dependencies: ['react', 'framer-motion'],
		registryDependencies: ['cedar-os'],
		files: ['Storyline.tsx'],
		meta: {
			importName: 'Storyline',
			displayName: 'Storyline',
			description: 'Interactive storyline flow component',
		},
	},
	{
		name: 'storyline-edge',
		type: 'chatMessages',
		dependencies: ['react', 'framer-motion'],
		files: ['StorylineEdge.tsx'],
		meta: {
			importName: 'StorylineEdge',
			displayName: 'Storyline Edge',
			description: 'Connection edges for storyline components',
		},
	},
	{
		name: 'streaming-text',
		type: 'chatMessages',
		dependencies: ['react', 'motion/react'],
		files: ['StreamingText.tsx'],
		meta: {
			importName: 'StreamingText',
			displayName: 'Streaming Text',
			description: 'Animated streaming text component',
		},
	},
	{
		name: 'todo-list',
		type: 'chatMessages',
		dependencies: ['react', 'lucide-react'],
		registryDependencies: ['cedar-os'],
		files: ['TodoList.tsx'],
		meta: {
			importName: 'TodoList',
			displayName: 'Todo List',
			description: 'Interactive todo list component',
		},
	},
	{
		name: 'collapsed-chat-button',
		type: 'chatMessages',
		dependencies: ['react', 'lucide-react'],
		registryDependencies: ['cedar-os'],
		files: ['structural/CollapsedChatButton.tsx'],
		meta: {
			importName: 'CollapsedChatButton',
			displayName: 'Collapsed Chat Button',
			description: 'Button for collapsed chat state',
		},
	},

	// Containers
	{
		name: 'container-3d',
		type: 'containers',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['Container3D.tsx'],
		meta: {
			importName: 'Container3D',
			displayName: '3D Container',
			description: '3D-styled container with motion effects',
		},
	},
	{
		name: 'container-3d-button',
		type: 'containers',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['Container3DButton.tsx'],
		meta: {
			importName: 'Container3DButton',
			displayName: '3D Container Button',
			description: 'Interactive 3D container button',
		},
	},
	{
		name: 'flat-3d-button',
		type: 'containers',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['Flat3dButton.tsx'],
		meta: {
			importName: 'Flat3dButton',
			displayName: 'Flat 3D Button',
			description: 'Flat button with 3D effects',
		},
	},
	{
		name: 'flat-3d-container',
		type: 'containers',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['Flat3dContainer.tsx'],
		meta: {
			importName: 'Flat3dContainer',
			displayName: 'Flat 3D Container',
			description: 'Flat container with 3D styling',
		},
	},
	{
		name: 'glassy-pane-container',
		type: 'containers',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['GlassyPaneContainer.tsx'],
		meta: {
			importName: 'GlassyPaneContainer',
			displayName: 'Glassy Pane Container',
			description: 'Glass morphism container component',
		},
	},

	// Inputs
	{
		name: 'tooltip-menu',
		type: 'inputs',
		dependencies: ['react', 'lucide-react'],
		files: ['TooltipMenu.tsx'],
		meta: {
			importName: 'TooltipMenu',
			displayName: 'Tooltip Menu',
			description: 'Interactive tooltip menu component',
		},
	},

	// Ornaments
	{
		name: 'glowing-mesh',
		type: 'ornaments',
		dependencies: ['react', 'motion/react'],
		files: ['GlowingMesh.tsx'],
		meta: {
			importName: 'GlowingMesh',
			displayName: 'Glowing Mesh',
			description: 'Animated glowing mesh background',
		},
	},
	{
		name: 'glowing-mesh-gradient',
		type: 'ornaments',
		dependencies: ['react', 'motion/react'],
		files: ['GlowingMeshGradient.tsx'],
		meta: {
			importName: 'GlowingMeshGradient',
			displayName: 'Glowing Mesh Gradient',
			description: 'Gradient glowing mesh component',
		},
	},
	{
		name: 'gradient-mesh',
		type: 'ornaments',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['GradientMesh.tsx'],
		meta: {
			importName: 'GradientMesh',
			displayName: 'Gradient Mesh',
			description: 'Animated gradient mesh background',
		},
	},
	{
		name: 'inset-glow',
		type: 'ornaments',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['InsetGlow.tsx'],
		meta: {
			importName: 'InsetGlow',
			displayName: 'Inset Glow',
			description: 'Inset glow effect component',
		},
	},

	// Structural
	{
		name: 'floating-container',
		type: 'structural',
		dependencies: ['react', 'motion/react'],
		files: ['FloatingContainer.tsx'],
		meta: {
			importName: 'FloatingContainer',
			displayName: 'Floating Container',
			description: 'Floating container with animation',
		},
	},
	{
		name: 'side-panel-container',
		type: 'structural',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['SidePanelContainer.tsx'],
		meta: {
			importName: 'SidePanelContainer',
			displayName: 'Side Panel Container',
			description: 'Side panel layout container',
		},
	},

	// Text
	{
		name: 'shimmer-text',
		type: 'text',
		dependencies: ['react', 'motion/react', 'lucide-react'],
		registryDependencies: ['cedar-os'],
		files: ['ShimmerText.tsx'],
		meta: {
			importName: 'ShimmerText',
			displayName: 'Shimmer Text',
			description: 'Text with shimmer animation effect',
		},
	},
	{
		name: 'typewriter-text',
		type: 'text',
		dependencies: ['react', 'motion/react'],
		registryDependencies: ['cedar-os'],
		files: ['TypewriterText.tsx'],
		meta: {
			importName: 'TypewriterText',
			displayName: 'Typewriter Text',
			description: 'Typewriter animation text component',
		},
	},

	// UI
	{
		name: 'keyboard-shortcut',
		type: 'ui',
		dependencies: ['react'],
		files: ['KeyboardShortcut.tsx'],
		meta: {
			importName: 'KeyboardShortcut',
			displayName: 'Keyboard Shortcut',
			description: 'Keyboard shortcut display component',
		},
	},
	{
		name: 'slider-3d',
		type: 'ui',
		dependencies: ['react', 'motion/react', 'motion-plus-react', 'lucide-react'],
		registryDependencies: ['cedar-os'],
		files: ['Slider3D.tsx'],
		meta: {
			importName: 'Slider3D',
			displayName: '3D Slider',
			description: '3D-styled slider component',
		},
	},
	{
		name: 'button',
		type: 'ui',
		dependencies: ['react', '@radix-ui/react-slot', 'class-variance-authority'],
		registryDependencies: ['cedar-os'],
		files: ['button.tsx'],
		meta: {
			importName: 'Button',
			displayName: 'Button',
			description: 'Customizable button component',
		},
	},
];

export default registry;

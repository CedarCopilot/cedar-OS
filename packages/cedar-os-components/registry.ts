export interface ComponentRegistryEntry {
	name: string;
	type:
		| 'components:ui'
		| 'components:chat'
		| 'components:container'
		| 'components:text'
		| 'components:ornament'
		| 'components:structural'
		| 'components:input';
	dependencies?: string[];
	devDependencies?: string[];
	files: {
		name: string;
		content?: string;
		type?: 'registry:ui' | 'registry:component';
	}[];
	meta?: {
		importName?: string;
		displayName?: string;
		description?: string;
	};
}

export const registry: ComponentRegistryEntry[] = [
	// Chat Components
	{
		name: 'cedar-caption-chat',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react', 'uuid'],
		files: [
			{
				name: 'chatComponents/CedarCaptionChat.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'CedarCaptionChat',
			displayName: 'Cedar Caption Chat',
			description: 'Caption-style chat component with floating UI',
		},
	},
	{
		name: 'floating-cedar-chat',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		files: [
			{
				name: 'chatComponents/FloatingCedarChat.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'FloatingCedarChat',
			displayName: 'Floating Cedar Chat',
			description: 'Floating chat interface with animation support',
		},
	},
	{
		name: 'side-panel-cedar-chat',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		files: [
			{
				name: 'chatComponents/SidePanelCedarChat.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'SidePanelCedarChat',
			displayName: 'Side Panel Cedar Chat',
			description: 'Side panel chat interface with slide animations',
		},
	},

	// Chat Input
	{
		name: 'chat-input',
		type: 'components:input',
		dependencies: ['react', 'lucide-react', 'motion/react'],
		files: [
			{
				name: 'chatInput/ChatInput.tsx',
				type: 'registry:component',
			},
			{
				name: 'chatInput/ChatInput.css',
			},
			{
				name: 'chatInput/index.ts',
			},
		],
		meta: {
			importName: 'ChatInput',
			displayName: 'Chat Input',
			description: 'Enhanced chat input component with context support',
		},
	},
	{
		name: 'context-badge-row',
		type: 'components:input',
		dependencies: ['react', 'lucide-react'],
		files: [
			{
				name: 'chatInput/ContextBadgeRow.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'ContextBadgeRow',
			displayName: 'Context Badge Row',
			description: 'Row of context badges for chat input',
		},
	},

	// Chat Messages
	{
		name: 'caption-messages',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react', 'motion-plus-react'],
		files: [
			{
				name: 'chatMessages/CaptionMessages.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'CaptionMessages',
			displayName: 'Caption Messages',
			description: 'Caption-style message display component',
		},
	},
	{
		name: 'chat-bubbles',
		type: 'components:chat',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'chatMessages/ChatBubbles.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'ChatBubbles',
			displayName: 'Chat Bubbles',
			description: 'Animated chat bubble component',
		},
	},
	{
		name: 'chat-renderer',
		type: 'components:chat',
		dependencies: ['react', 'react-markdown', 'motion-plus-react'],
		files: [
			{
				name: 'chatMessages/ChatRenderer.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'ChatRenderer',
			displayName: 'Chat Renderer',
			description: 'Renders chat messages with markdown support',
		},
	},
	{
		name: 'dialogue-options',
		type: 'components:chat',
		dependencies: ['react'],
		files: [
			{
				name: 'chatMessages/DialogueOptions.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'DialogueOptions',
			displayName: 'Dialogue Options',
			description: 'Interactive dialogue option selector',
		},
	},
	{
		name: 'multiple-choice',
		type: 'components:chat',
		dependencies: ['react'],
		files: [
			{
				name: 'chatMessages/MultipleChoice.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'MultipleChoice',
			displayName: 'Multiple Choice',
			description: 'Multiple choice question component',
		},
	},
	{
		name: 'storyline',
		type: 'components:chat',
		dependencies: ['react', 'framer-motion'],
		files: [
			{
				name: 'chatMessages/Storyline.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Storyline',
			displayName: 'Storyline',
			description: 'Interactive storyline flow component',
		},
	},
	{
		name: 'storyline-edge',
		type: 'components:chat',
		dependencies: ['react', 'framer-motion'],
		files: [
			{
				name: 'chatMessages/StorylineEdge.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'StorylineEdge',
			displayName: 'Storyline Edge',
			description: 'Connection edges for storyline components',
		},
	},
	{
		name: 'streaming-text',
		type: 'components:text',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'chatMessages/StreamingText.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'StreamingText',
			displayName: 'Streaming Text',
			description: 'Animated streaming text component',
		},
	},
	{
		name: 'todo-list',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react'],
		files: [
			{
				name: 'chatMessages/TodoList.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'TodoList',
			displayName: 'Todo List',
			description: 'Interactive todo list component',
		},
	},
	{
		name: 'collapsed-chat-button',
		type: 'components:chat',
		dependencies: ['react', 'lucide-react'],
		files: [
			{
				name: 'chatMessages/structural/CollapsedChatButton.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'CollapsedChatButton',
			displayName: 'Collapsed Chat Button',
			description: 'Button for collapsed chat state',
		},
	},

	// Containers
	{
		name: 'container-3d',
		type: 'components:container',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'containers/Container3D.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Container3D',
			displayName: '3D Container',
			description: '3D-styled container with motion effects',
		},
	},
	{
		name: 'container-3d-button',
		type: 'components:container',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'containers/Container3DButton.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Container3DButton',
			displayName: '3D Container Button',
			description: 'Interactive 3D container button',
		},
	},
	{
		name: 'flat-3d-button',
		type: 'components:container',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'containers/Flat3dButton.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Flat3dButton',
			displayName: 'Flat 3D Button',
			description: 'Flat button with 3D effects',
		},
	},
	{
		name: 'flat-3d-container',
		type: 'components:container',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'containers/Flat3dContainer.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Flat3dContainer',
			displayName: 'Flat 3D Container',
			description: 'Flat container with 3D styling',
		},
	},
	{
		name: 'glassy-pane-container',
		type: 'components:container',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'containers/GlassyPaneContainer.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'GlassyPaneContainer',
			displayName: 'Glassy Pane Container',
			description: 'Glass morphism container component',
		},
	},

	// Inputs
	{
		name: 'tooltip-menu',
		type: 'components:input',
		dependencies: ['react', 'lucide-react'],
		files: [
			{
				name: 'inputs/TooltipMenu.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'TooltipMenu',
			displayName: 'Tooltip Menu',
			description: 'Interactive tooltip menu component',
		},
	},

	// Ornaments
	{
		name: 'glowing-mesh',
		type: 'components:ornament',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'ornaments/GlowingMesh.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'GlowingMesh',
			displayName: 'Glowing Mesh',
			description: 'Animated glowing mesh background',
		},
	},
	{
		name: 'glowing-mesh-gradient',
		type: 'components:ornament',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'ornaments/GlowingMeshGradient.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'GlowingMeshGradient',
			displayName: 'Glowing Mesh Gradient',
			description: 'Gradient glowing mesh component',
		},
	},
	{
		name: 'gradient-mesh',
		type: 'components:ornament',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'ornaments/GradientMesh.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'GradientMesh',
			displayName: 'Gradient Mesh',
			description: 'Animated gradient mesh background',
		},
	},
	{
		name: 'inset-glow',
		type: 'components:ornament',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'ornaments/InsetGlow.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'InsetGlow',
			displayName: 'Inset Glow',
			description: 'Inset glow effect component',
		},
	},

	// Structural
	{
		name: 'floating-container',
		type: 'components:structural',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'structural/FloatingContainer.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'FloatingContainer',
			displayName: 'Floating Container',
			description: 'Floating container with animation',
		},
	},
	{
		name: 'side-panel-container',
		type: 'components:structural',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'structural/SidePanelContainer.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'SidePanelContainer',
			displayName: 'Side Panel Container',
			description: 'Side panel layout container',
		},
	},

	// Text
	{
		name: 'shimmer-text',
		type: 'components:text',
		dependencies: ['react', 'motion/react', 'lucide-react'],
		files: [
			{
				name: 'text/ShimmerText.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'ShimmerText',
			displayName: 'Shimmer Text',
			description: 'Text with shimmer animation effect',
		},
	},
	{
		name: 'typewriter-text',
		type: 'components:text',
		dependencies: ['react', 'motion/react'],
		files: [
			{
				name: 'text/TypewriterText.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'TypewriterText',
			displayName: 'Typewriter Text',
			description: 'Typewriter animation text component',
		},
	},

	// UI
	{
		name: 'keyboard-shortcut',
		type: 'components:ui',
		dependencies: ['react'],
		files: [
			{
				name: 'ui/KeyboardShortcut.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'KeyboardShortcut',
			displayName: 'Keyboard Shortcut',
			description: 'Keyboard shortcut display component',
		},
	},
	{
		name: 'slider-3d',
		type: 'components:ui',
		dependencies: [
			'react',
			'motion/react',
			'motion-plus-react',
			'lucide-react',
		],
		files: [
			{
				name: 'ui/Slider3D.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Slider3D',
			displayName: '3D Slider',
			description: '3D-styled slider component',
		},
	},
	{
		name: 'button',
		type: 'components:ui',
		dependencies: ['react', '@radix-ui/react-slot', 'class-variance-authority'],
		files: [
			{
				name: 'ui/button.tsx',
				type: 'registry:component',
			},
		],
		meta: {
			importName: 'Button',
			displayName: 'Button',
			description: 'Customizable button component',
		},
	},
];

export default registry;

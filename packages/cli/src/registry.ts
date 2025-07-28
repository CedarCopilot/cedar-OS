export interface ComponentInfo {
	name: string;
	category: string;
	description: string;
	files: string[];
	dependencies?: string[];
}

export const COMPONENT_REGISTRY: Record<string, ComponentInfo> = {
	// Chat Components
	'cedar-caption-chat': {
		name: 'CedarCaptionChat',
		category: 'chatComponents',
		description: 'Caption-style chat component',
		files: ['CedarCaptionChat.tsx'],
	},
	'floating-cedar-chat': {
		name: 'FloatingCedarChat',
		category: 'chatComponents',
		description: 'Floating chat layout component',
		files: ['FloatingCedarChat.tsx'],
	},
	'side-panel-cedar-chat': {
		name: 'SidePanelCedarChat',
		category: 'chatComponents',
		description: 'Side-panel chat layout component',
		files: ['SidePanelCedarChat.tsx'],
	},

	// Chat Input Components
	'chat-input': {
		name: 'ChatInput',
		category: 'chatInput',
		description: 'Main chat input component',
		files: ['ChatInput.tsx', 'ChatInput.css'],
	},
	'context-badge-row': {
		name: 'ContextBadgeRow',
		category: 'chatInput',
		description: 'Row of context badges',
		files: ['ContextBadgeRow.tsx'],
	},

	// Chat Message Components
	'chat-bubbles': {
		name: 'ChatBubbles',
		category: 'chatMessages',
		description: 'Message bubble component',
		files: ['ChatBubbles.tsx'],
	},
	'chat-renderer': {
		name: 'ChatRenderer',
		category: 'chatMessages',
		description: 'Message rendering component',
		files: ['ChatRenderer.tsx'],
	},
	'dialogue-options': {
		name: 'DialogueOptions',
		category: 'chatMessages',
		description: 'Interactive dialogue options',
		files: ['DialogueOptions.tsx'],
	},
	'multiple-choice': {
		name: 'MultipleChoice',
		category: 'chatMessages',
		description: 'Multiple-choice interaction component',
		files: ['MultipleChoice.tsx'],
	},
	storyline: {
		name: 'Storyline',
		category: 'chatMessages',
		description: 'Storyline display component',
		files: ['Storyline.tsx'],
	},
	'storyline-edge': {
		name: 'StorylineEdge',
		category: 'chatMessages',
		description: 'Storyline edge connector',
		files: ['StorylineEdge.tsx'],
	},
	'streaming-text': {
		name: 'StreamingText',
		category: 'chatMessages',
		description: 'Streaming text effect',
		files: ['StreamingText.tsx'],
	},
	'todo-list': {
		name: 'TodoList',
		category: 'chatMessages',
		description: 'Todo-list message component',
		files: ['TodoList.tsx'],
	},
	'caption-messages': {
		name: 'CaptionMessages',
		category: 'chatMessages',
		description: 'Caption message component',
		files: ['CaptionMessages.tsx'],
	},
	'collapsed-chat-button': {
		name: 'CollapsedChatButton',
		category: 'chatMessages/structural',
		description: 'Collapsed chat toggle button',
		files: ['CollapsedChatButton.tsx'],
	},

	// Container Components
	'container-3d': {
		name: 'Container3D',
		category: 'containers',
		description: '3D container',
		files: ['Container3D.tsx'],
	},
	'container-3d-button': {
		name: 'Container3DButton',
		category: 'containers',
		description: '3D-styled button',
		files: ['Container3DButton.tsx'],
	},
	'flat-3d-button': {
		name: 'Flat3dButton',
		category: 'containers',
		description: 'Flat-style 3D button',
		files: ['Flat3dButton.tsx'],
	},
	'flat-3d-container': {
		name: 'Flat3dContainer',
		category: 'containers',
		description: 'Flat-style 3D container',
		files: ['Flat3dContainer.tsx'],
	},
	'glassy-pane-container': {
		name: 'GlassyPaneContainer',
		category: 'containers',
		description: 'Glassmorphism container',
		files: ['GlassyPaneContainer.tsx'],
	},

	// Input Components
	'tooltip-menu': {
		name: 'TooltipMenu',
		category: 'inputs',
		description: 'Tooltip menu component',
		files: ['TooltipMenu.tsx'],
	},

	// Ornament Components
	'glowing-mesh': {
		name: 'GlowingMesh',
		category: 'ornaments',
		description: 'Glowing mesh graphic',
		files: ['GlowingMesh.tsx'],
	},
	'glowing-mesh-gradient': {
		name: 'GlowingMeshGradient',
		category: 'ornaments',
		description: 'Gradient variant of glowing mesh',
		files: ['GlowingMeshGradient.tsx'],
	},
	'gradient-mesh': {
		name: 'GradientMesh',
		category: 'ornaments',
		description: 'Background gradient mesh',
		files: ['GradientMesh.tsx'],
	},
	'inset-glow': {
		name: 'InsetGlow',
		category: 'ornaments',
		description: 'Inset glow effect',
		files: ['InsetGlow.tsx'],
	},

	// Structural Components
	'floating-container': {
		name: 'FloatingContainer',
		category: 'structural',
		description: 'Floating container wrapper',
		files: ['FloatingContainer.tsx'],
	},
	'side-panel-container': {
		name: 'SidePanelContainer',
		category: 'structural',
		description: 'Side-panel container',
		files: ['SidePanelContainer.tsx'],
	},

	// Text Components
	'shimmer-text': {
		name: 'ShimmerText',
		category: 'text',
		description: 'Shimmer text effect',
		files: ['ShimmerText.tsx'],
	},
	'typewriter-text': {
		name: 'TypewriterText',
		category: 'text',
		description: 'Typewriter-style text',
		files: ['TypewriterText.tsx'],
	},

	// UI Components
	'keyboard-shortcut': {
		name: 'KeyboardShortcut',
		category: 'ui',
		description: 'Keyboard shortcut legend',
		files: ['KeyboardShortcut.tsx'],
	},
	'slider-3d': {
		name: 'Slider3D',
		category: 'ui',
		description: '3D slider control',
		files: ['Slider3D.tsx'],
	},
	button: {
		name: 'button',
		category: 'ui',
		description: 'Base button component',
		files: ['button.tsx'],
	},
};

export const CATEGORIES = {
	chatComponents: 'Chat Components',
	chatInput: 'Chat Input Components',
	chatMessages: 'Chat Message Components',
	'chatMessages/structural': 'Chat Message Structural Components',
	containers: 'Container Components',
	inputs: 'Input Components',
	ornaments: 'Ornament Components',
	structural: 'Structural Components',
	text: 'Text Components',
	ui: 'UI Components',
};

export function getComponentsByCategory(category: string): ComponentInfo[] {
	return Object.values(COMPONENT_REGISTRY).filter(
		(comp) => comp.category === category
	);
}

export function getAllComponents(): ComponentInfo[] {
	return Object.values(COMPONENT_REGISTRY);
}

export function getComponent(name: string): ComponentInfo | undefined {
	return COMPONENT_REGISTRY[name];
}

// Chat Components
export { CedarCaptionChat } from './chatComponents/CedarCaptionChat';
export { FloatingCedarChat } from './chatComponents/FloatingCedarChat';
export { SidePanelCedarChat } from './chatComponents/SidePanelCedarChat';

// Chat Input
export { ChatInput } from './chatInput/ChatInput';
export { ContextBadgeRow } from './chatInput/ContextBadgeRow';
export { FloatingChatInput } from './chatInput/FloatingChatInput';
export * from './chatInput/index';

// Chat Messages
export { default as CaptionMessages } from './chatMessages/CaptionMessages';
export { ChatBubbles } from './chatMessages/ChatBubbles';
export { default as ChatRenderer } from './chatMessages/ChatRenderer';
export { default as DialogueOptions } from './chatMessages/DialogueOptions';
export { MarkdownRenderer } from './chatMessages/MarkdownRenderer';
export { default as MultipleChoice } from './chatMessages/MultipleChoice';
export { default as Storyline } from './chatMessages/Storyline';
export { default as StorylineEdge } from './chatMessages/StorylineEdge';
export { StreamingText } from './chatMessages/StreamingText';
export { default as TodoList } from './chatMessages/TodoList';
export { CollapsedButton } from './chatMessages/structural/CollapsedChatButton';

// Containers
export { default as Container3D } from './containers/Container3D';
export { default as Container3DButton } from './containers/Container3DButton';
export { default as Flat3dButton } from './containers/Flat3dButton';
export { default as Flat3dContainer } from './containers/Flat3dContainer';
export { default as GlassyPaneContainer } from './containers/GlassyPaneContainer';

// Diffs
export { default as DiffContainer } from './diffs/DiffContainer';
export { default as DiffText } from './diffs/DiffText';
export * from './diffs/index';

// Inputs
export { TooltipMenu } from './inputs/TooltipMenu';

// Ornaments
export { default as GlowingMesh } from './ornaments/GlowingMesh';
export { default as GlowingMeshGradient } from './ornaments/GlowingMeshGradient';
export { default as GradientMesh } from './ornaments/GradientMesh';
export { default as InsetGlow } from './ornaments/InsetGlow';

// Structural
export { FloatingContainer } from './structural/FloatingContainer';
export { SidePanelContainer } from './structural/SidePanelContainer';
export * from './structural/index';

// Text
export { ShimmerText } from './text/ShimmerText';
export { TypewriterText } from './text/TypewriterText';
export { PhantomText } from './text/PhantomText';

// UI
export { KeyboardShortcut } from './ui/KeyboardShortcut';
// export { default as Slider3D } from './ui/Slider3D'; // Temporarily disabled due to motion type conflicts
export { Button } from './ui/button';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';

// Spells
export { default as QuestioningSpell } from './spells/QuestioningSpell';
export { default as RadialMenuSpell } from './spells/RadialMenuSpell';
export { default as SliderSpell } from './spells/SliderSpell';
export type {
	RangeMetadata as SliderRangeMetadata,
	SliderConfig,
	SliderSpellProps,
} from './spells/SliderSpell';
export { default as RangeSliderSpell } from './spells/RangeSliderSpell';
export type {
	RangeOption,
	RangeSliderConfig,
	RangeSliderSpellProps,
} from './spells/RangeSliderSpell';
export { default as TooltipMenuSpell } from './spells/TooltipMenuSpell';

// CommandBar
export { CommandBar } from './CommandBar';
export type {
	CommandBarItem,
	CommandBarGroup,
	CommandBarContents,
} from './CommandBar';

// Threads
export { ChatThreadController } from './threads/ChatThreadController';

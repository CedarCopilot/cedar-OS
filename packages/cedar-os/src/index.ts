// Components
export { CedarCopilot } from '../../cedar-os-components/CedarCopilot';

// Export components
export { ChatInput } from '../../cedar-os-components/chatInput/ChatInput';
export { default as TooltipMenu } from '../../cedar-os-components/inputs/TooltipMenu';

// Export chat components
export { CedarCaptionChat } from '../../cedar-os-components/chatComponents/CedarCaptionChat';
export { FloatingCedarChat } from '../../cedar-os-components/chatComponents/FloatingCedarChat';
export { SidePanelCedarChat } from '../../cedar-os-components/chatComponents/SidePanelCedarChat';

// Export structural components
export {
	FloatingContainer,
	SidePanelContainer,
} from '../../cedar-os-components/structural';
export type {
	FloatingDimensions,
	FloatingPosition,
	SidePanelDimensions,
} from '../../cedar-os-components/structural';

// Export UI components
export { default as Container3D } from '../../cedar-os-components/containers/Container3D';
export { default as Container3DButton } from '../../cedar-os-components/containers/Container3DButton';
export { default as Flat3dContainer } from '../../cedar-os-components/containers/Flat3dContainer';
export { default as Flat3dButton } from '../../cedar-os-components/containers/Flat3dButton';
export { default as GlassyPaneContainer } from '../../cedar-os-components/containers/GlassyPaneContainer';
export { KeyboardShortcut } from '../../cedar-os-components/ui/KeyboardShortcut';
export { default as Slider3D } from '../../cedar-os-components/ui/Slider3D';
export { Button } from '../../cedar-os-components/ui/button';

// Export text components
export { ShimmerText } from '../../cedar-os-components/text/ShimmerText';
export { TypewriterText } from '../../cedar-os-components/text/TypewriterText';

// Export ornament components
export { default as GlowingMesh } from '../../cedar-os-components/ornaments/GlowingMesh';
export { default as GlowingMeshGradient } from '../../cedar-os-components/ornaments/GlowingMeshGradient';
export { default as GradientMesh } from '../../cedar-os-components/ornaments/GradientMesh';

// Export chat message components
export { default as ChatRenderer } from '../../cedar-os-components/chatMessages/ChatRenderer';
export { default as ChatBubbles } from '../../cedar-os-components/chatMessages/ChatBubbles';
export { default as CaptionMessages } from '../../cedar-os-components/chatMessages/CaptionMessages';
export { default as DialogueOptions } from '../../cedar-os-components/chatMessages/DialogueOptions';
export { default as MultipleChoice } from '../../cedar-os-components/chatMessages/MultipleChoice';
export { default as Storyline } from '../../cedar-os-components/chatMessages/Storyline';
export { default as StorylineEdge } from '../../cedar-os-components/chatMessages/StorylineEdge';
export { default as StreamingText } from '../../cedar-os-components/chatMessages/StreamingText';
export { default as TodoList } from '../../cedar-os-components/chatMessages/TodoList';
export { CollapsedButton } from '../../cedar-os-components/chatMessages/structural/CollapsedChatButton';

export { useCedarEditor } from '@/components/chatInput/useCedarEditor';

// Export chat input components
export { MentionNodeView } from '@/components/chatInput/ChatMention';
export { ContextBadgeRow } from '../../cedar-os-components/chatInput/ContextBadgeRow';
export { default as MentionList } from '@/components/chatInput/MentionList';

// Export styling utilities
export {
	cn,
	createBorderColor,
	desaturateColor,
	getLightenedColor,
	getShadedColor,
	getTextColorForBackground,
	hexToRgb,
	luminanceThreshold,
	withClassName,
} from '@/styles/stylingUtils';

// Store
export { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
export { createAgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
export { createMessagesSlice } from '@/store/messages/messagesSlice';
export { createStateSlice } from '@/store/stateSlice/stateSlice';
export { createStylingSlice } from '@/store/stylingSlice';

// Export state management
export { useRegisterState } from '@/store/stateSlice/stateSlice';
export { useCedarState } from '@/store/stateSlice/useCedarState';

// Export context management
export {
	renderAdditionalContext,
	subscribeInputContext,
} from '@/store/agentInputContext/agentInputContextSlice';

// Export mention provider functionality
export {
	useMentionProvider,
	useMentionProviders,
	useMentionProvidersByTrigger,
	useStateBasedMentionProvider,
} from '@/store/agentInputContext/mentionProviders';

// Export typed agent connection hooks
export {
	useAgentConnection,
	useTypedAgentConnection,
} from '@/store/agentConnection/useTypedAgentConnection';

// Types
export type {
	AdditionalContext,
	ContextEntry,
	MentionItem,
	MentionProvider,
	StateBasedMentionProviderConfig,
} from '@/store/agentInputContext/types';

// Export message types
export type {
	BaseMessage,
	ChatResponse,
	CustomMessage,
	DefaultMessage,
	DialogueOptionChoice,
	DialogueOptionsMessage,
	Message,
	MessageByType,
	MessageInput,
	MessageRenderer,
	MessageRendererConfig,
	MessageRendererRegistry,
	MessageRole,
	MultipleChoiceMessage,
	SliderMessage,
	StorylineMessage,
	StorylineSection,
	TextMessage,
	TickerButton,
	TickerMessage,
	TodoListItem,
	TodoListMessage,
	TypedMessage,
} from '@/store/messages/types';

// Export types
export type { StylingSlice } from '@/store/stylingSlice';
export type { CedarStore } from '@/store/types';

// Export agent connection types
export type {
	AISDKParams,
	AnthropicParams,
	CustomParams,
	InferProviderParams,
	InferProviderType,
	LLMResponse,
	MastraParams,
	OpenAIParams,
	ProviderConfig,
	StreamEvent,
	StreamHandler,
	StreamResponse,
} from './store/agentConnection/types';

// Export SendMessageParams from the slice
export type { SendMessageParams } from './store/agentConnection/agentConnectionSlice';

// Export voice components and types
export { VoiceIndicator } from '@/store/voice/VoiceIndicator';
export type { VoiceState } from '@/store/voice/voiceSlice';

// Export all hooks and utilities from CedarStore
export {
	getCedarState,
	registerState,
	setCedarState,
	setCedarStore,
	useCedarStore,
	useChatInput,
	useDebugger,
	useMessages,
	useStyling,
	useVoice,
} from './store/CedarStore';

// Components
export { CedarCopilot } from '@/components/CedarCopilot';

export { useCedarEditor } from '@/components/chatInput/useCedarEditor';

// Export chat input components
export { MentionNodeView } from '@/components/chatInput/ChatMention';
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

// Export message processor hooks
export { useMessageProcessors } from '@/store/messages/useMessageProcessor';
export { useActionMessageProcessor } from '@/store/messages/useMessageProcessor';
export { createActionMessageProcessor } from '@/store/messages/createActionMessageProcessor';

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
	MessageRole,
	MessageProcessor,
	MultipleChoiceMessage,
	ActionMessage,
	ActionMessageFor,
	SliderMessage,
	StorylineMessage,
	StorylineSection,
	TextMessage,
	TickerButton,
	TickerMessage,
	TodoListItem,
	TodoListMessage,
	StageUpdateStatus,
	StageUpdateMessage,
	TypedMessage,
} from '@/store/messages/types';

// Export Mastra renderer entries and types
export type {
	MastraEventType,
	MastraMessage,
} from '@/store/messages/providers/mastra';

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
} from '@/store/agentConnection/types';

// Export SendMessageParams from the slice
export type { SendMessageParams } from '@/store/agentConnection/agentConnectionSlice';

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
} from '@/store/CedarStore';

// Export Tiptap components
export {
	Editor as CedarEditor,
	EditorContent as CedarEditorContent,
} from '@tiptap/react';

// Components
export { CedarCopilot } from '@/components/CedarCopilot';

// Export components
export { ChatInput } from '@/components/chatInput/ChatInput';
export { default as TooltipMenu } from '@/components/inputs/TooltipMenu';

// Export chat components
export { CedarCaptionChat } from '@/components/chatComponents/CedarCaptionChat';
export { FloatingCedarChat } from '@/components/chatComponents/FloatingCedarChat';
export { SidePanelCedarChat } from '@/components/chatComponents/SidePanelCedarChat';
export { default as ChatBubbles } from '@/components/chatMessages/ChatBubbles';

// Export structural components
export { FloatingContainer, SidePanelContainer } from '@/components/structural';
export type {
	FloatingDimensions,
	FloatingPosition,
	SidePanelDimensions,
} from '@/components/structural';

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

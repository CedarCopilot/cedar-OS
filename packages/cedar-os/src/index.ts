// Components
export { CedarCopilot } from '@/components/CedarCopilot';

// Export components
export {
	ChatInput,
	ChatInputContainer,
} from '@/components/chatInput/ChatInput';
export { default as TooltipMenu } from '@/components/inputs/TooltipMenu';

// Store slices
export { createStylingSlice } from '@/store/stylingSlice';
export { createMessagesSlice } from '@/store/messages/messagesSlice';
export { createAgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
export { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
export { createStateSlice } from '@/store/stateSlice/stateSlice';

// Export state management
export { useCedarState } from '@/store/stateSlice/useCedarState';
export { useRegisterState } from '@/store/stateSlice/stateSlice';

// Export context management
export {
	subscribeInputContext,
	renderAdditionalContext,
} from '@/store/agentInputContext/agentInputContextSlice';

// Export mention provider functionality
export {
	useMentionProvider,
	useStateBasedMentionProvider,
	useMentionProviders,
	useMentionProvidersByTrigger,
} from '@/store/agentInputContext/mentionProviders';

// Export typed agent connection hooks
export {
	useTypedAgentConnection,
	useAgentConnection,
} from '@/store/agentConnection/useTypedAgentConnection';

// Types
export type {
	ContextEntry,
	AdditionalContext,
	MentionItem,
	MentionProvider,
	StateBasedMentionProviderConfig,
} from '@/store/agentInputContext/types';

// Export types
export type { CedarStore } from '@/store/types';
export type { StylingSlice } from '@/store/stylingSlice';

// Export agent connection types
export type {
	ProviderConfig,
	LLMResponse,
	StreamEvent,
	StreamHandler,
	StreamResponse,
	OpenAIParams,
	AnthropicParams,
	MastraParams,
	AISDKParams,
	CustomParams,
	InferProviderParams,
	InferProviderType,
} from './store/agentConnection/types';

// Export SendMessageParams from the slice
export type { SendMessageParams } from './store/agentConnection/agentConnectionSlice';

// Export all hooks and utilities from CedarStore
export {
	useCedarStore,
	useMessages,
	useStyling,
	useChatInput,
	useVoice,
	useDebugger,
	registerState,
	getCedarState,
	setCedarState,
	setCedarStore,
} from './store/CedarStore';

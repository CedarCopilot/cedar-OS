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
	useRenderAdditionalContext,
	useSubscribeStateToInputContext,
} from '@/store/agentInputContext/agentInputContextSlice';

// Export mention provider functionality
export {
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
	// Phase 1: Backend context types moved from AgentConnectionTypes
	AdditionalContextParam,
	BackendSetterSchema,
	BackendStateSchema,
	BackendContextEntry,
} from '@/store/agentInputContext/AgentInputContextTypes';

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
} from '@/store/messages/MessageTypes';

// Export types
export type { StylingSlice } from '@/store/stylingSlice';
export type { CedarStore } from '@/store/CedarOSTypes';

// Export agent connection types
export type {
	AISDKParams,
	AnthropicParams,
	BaseParams,
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
} from '@/store/agentConnection/AgentConnectionTypes';

// Export SendMessageParams and response processor types from the slice
export type {
	BaseStructuredResponseType,
	DefaultStructuredResponseType,
	CustomStructuredResponseType,
	StructuredResponseType,
	ResponseProcessor,
	ResponseProcessorRegistry,
} from '@/store/agentConnection/AgentConnectionTypes';

// Export SendMessageParams from the slice
export type { SendMessageParams } from '@/store/agentConnection/agentConnectionSlice';

export {
	// Generic schema factories (for configurable providers)
	BaseParamsSchema,
	MastraParamsSchema,
	CustomParamsSchema,
	// Fixed schemas (for standardized providers)
	OpenAIParamsSchema,
	AnthropicParamsSchema,
	AISDKParamsSchema,
	// Convenience schemas (no extra fields)
	BasicBaseParamsSchema,
	BasicMastraParamsSchema,
	BasicCustomParamsSchema,
} from '@/store/agentConnection/AgentConnectionTypes';

// Export additional context schemas from AgentInputContextTypes
export {
	// Backend context schema factories
	AdditionalContextParamSchema,
	// Standard frontend context schemas
	ContextEntrySchema,
	AdditionalContextSchema,
	ChatRequestSchema,
	ChatResponseSchema,
	createChatRequestSchema,
} from '@/store/agentInputContext/AgentInputContextTypes';

// Export Mastra message types
export type {
	MastraStreamedResponse,
	MastraStreamedResponseType,
} from '@/store/agentConnection/providers/mastra';

// Export progress update response processor
export type {
	ProgressUpdateResponse,
	ProgressUpdateResponsePayload,
} from '@/store/agentConnection/responseProcessors/progressUpdateResponseProcessor';

// Export storage configuration types
export type {
	MessageStorageConfig,
	MessageThreadMeta,
	MessageStorageCustomAdapter,
	MessageStorageLocalAdapter,
	MessageStorageNoopAdapter,
	MessageStorageAdapter,
} from '@/store/messages/messageStorage';

// Export voice types
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
	useSpell,
	useSpells,
	useStyling,
	useVoice,
} from '@/store/CedarStore';

// Export setState response processor hooks
export {
	SetStateResponsePayload,
	SetStateResponse,
	SetStateResponseFor,
	createSetStateResponseProcessor,
	LegacyActionResponsePayload,
	LegacyActionResponse,
	LegacyActionResponseFor,
	createLegacyActionResponseProcessor,
	createResponseProcessor,
} from '@/store/agentConnection/responseProcessors/createResponseProcessor';

// Export message renderer factory function
export {
	createMessageRenderer,
	SetStateMessage,
	SetStateMessageFor,
	createSetStateMessageRenderer,
	LegacyActionMessage,
	LegacyActionMessageFor,
	createLegacyActionMessageRenderer,
} from '@/store/messages/renderers/createMessageRenderer';

// Export spell system types and utilities
export {
	Hotkey,
	MouseEvent,
	SelectionEvent,
	ActivationMode,
} from '@/store/spellSlice/SpellTypes';

export type {
	ActivationConditions,
	ActivationEvent,
	ActivationState,
	HotkeyCombo,
	CommonHotkeyCombo,
} from '@/store/spellSlice/SpellTypes';

export type { SpellSlice } from '@/store/spellSlice/spellSlice';

export type {
	UseSpellOptions,
	UseSpellReturn,
} from '@/store/spellSlice/useSpell';

// Export Tiptap components
export {
	Editor as CedarEditor,
	EditorContent as CedarEditorContent,
} from '@tiptap/react';

// Export utility functions
export { sanitizeJson, desanitizeJson } from '@/utils/sanitizeJson';

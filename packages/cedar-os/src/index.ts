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
	isDarkMode,
} from '@/styles/stylingUtils';

// Store
export { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
export { createAgentContextSlice } from '@/store/agentContext/agentContextSlice';
export { createMessagesSlice } from '@/store/messages/messagesSlice';
export { createStateSlice } from '@/store/stateSlice/stateSlice';
export { createStylingSlice } from '@/store/stylingSlice';

// Export state management
export { useRegisterState } from '@/store/stateSlice/useCedarState';
export { useCedarState } from '@/store/stateSlice/useCedarState';
export {
	useCedarDiffState,
	useRegisterDiffState,
	addDiffToArrayObjs,
	useDiffState,
	useDiffStateOperations,
	useDiffStateHelpers,
} from '@/store/diffHistoryStateSlice';

// Export state slice types
export type {
	BasicStateValue,
	Setter,
	SetterFunction,
	SetterArgs,
	registeredState,
	StateSlice,
	// New types
	ExecuteStateSetterParams,
	ExecuteStateSetterOptions,
	// Deprecated types (for backward compatibility)
	ExecuteCustomSetterParams,
	ExecuteCustomSetterOptions,
} from '@/store/stateSlice/stateSlice';

// Export context management
export {
	useRenderAdditionalContext,
	useSubscribeStateToAgentContext,
} from '@/store/agentContext/agentContextSlice';

// Export mention provider functionality
export {
	useMentionProviders,
	useMentionProvidersByTrigger,
	useStateBasedMentionProvider,
} from '@/store/agentContext/mentionProviders';

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
	BackendStateSetterSchema,
	BackendStateSchema,
	BackendContextEntry,
} from '@/store/agentContext/AgentContextTypes';

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
	// Response Schema System
	LLMResponseSchema,
	BaseStructuredResponseSchema,
	StructuredResponseSchema,
	StreamEventSchema,
	VoiceLLMResponseSchema,
} from '@/store/agentConnection/AgentConnectionTypes';

// Export additional context schemas from AgentContextTypes
export {
	// Backend context schema factories
	AdditionalContextParamSchema,
	// Standard frontend context schemas
	ContextEntrySchema,
	AdditionalContextSchema,
	ChatRequestSchema,
	ChatResponseSchema,
	createChatRequestSchema,
} from '@/store/agentContext/AgentContextTypes';

// Export Mastra message types
export type {
	MastraStreamedResponse,
	MastraStreamedResponseType,
} from '@/store/agentConnection/providers/mastra';

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
	useDiffHistory,
	useMessages,
	useMultipleSpells,
	useSpell,
	useSpells,
	useStyling,
	useVoice,
	useTools,
	useRegisterFrontendTool,
} from '@/store/CedarStore';

// Response processors
export type {
	HumanInTheLoopResponse,
	HumanInTheLoopMessage,
	HumanInTheLoopState,
} from '@/store/agentConnection/responseProcessors/humanInTheLoopTypes';

export { HumanInTheLoopResponseSchema } from '@/store/agentConnection/responseProcessors/humanInTheLoopTypes';
export { humanInTheLoopResponseProcessor } from '@/store/agentConnection/responseProcessors/humanInTheLoopResponseProcessor';

// Frontend tool response processor
export type {
	FrontendToolResponse,
	FrontendToolResponseFor,
} from '@/store/agentConnection/responseProcessors/frontendToolResponseProcessor';

export {
	FrontendToolResponseSchema,
	frontendToolResponseProcessor,
	createFrontendToolResponseProcessor,
} from '@/store/agentConnection/responseProcessors/frontendToolResponseProcessor';

export { humanInTheLoopMessageRenderer } from '@/store/messages/renderers/HumanInTheLoopRenderer';

// Frontend tool message renderer
export type { FrontendToolMessage } from '@/store/messages/renderers/FrontendToolRenderer';

export { defaultFrontendToolMessageRenderer } from '@/store/messages/renderers/FrontendToolRenderer';

export type {
	ProgressUpdateResponse,
	ProgressUpdateResponsePayload,
	ProgressUpdateResponseSchema,
} from '@/store/agentConnection/responseProcessors/progressUpdateResponseProcessor';

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
	SetStateResponseSchema,
	LegacyActionResponseSchema,
} from '@/store/agentConnection/responseProcessors/createResponseProcessor';

export {
	BackendMessageResponseSchema,
	messageResponseProcessor,
	BackendMessageResponse,
} from '@/store/agentConnection/responseProcessors/messageResponseProcessor';

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

// Export diff state types
export type {
	DiffMode,
	DiffState,
	DiffHistoryState,
	DiffHistorySlice,
	Operation,
	RegisterDiffStateConfig,
	DiffStateReturn,
	ComputeStateFunction,
} from '@/store/diffHistoryStateSlice';
// Export tools slice types and utilities
export { createToolsSlice } from '@/store/toolsSlice/toolsSlice';

export type {
	ToolsSlice,
	ToolsState,
	ToolsActions,
	ToolFunction,
	RegisteredTool,
	RegisteredToolBase,
	ToolRegistrationConfig,
	ToolsMap,
} from '@/store/toolsSlice/ToolsTypes';

export type { UseRegisterFrontendToolOptions } from '@/store/toolsSlice/useRegisterFrontendTool';

// Export Tiptap components
export {
	Editor as CedarEditor,
	EditorContent as CedarEditorContent,
} from '@tiptap/react';

// Export utility functions
export { sanitizeJson, desanitizeJson } from '@/utils/sanitizeJson';

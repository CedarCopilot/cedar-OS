import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
import { createStylingSlice } from './stylingSlice';
import { CedarStore } from './types';
import { createStateSlice } from '@/store/stateSlice/stateSlice';
import { createMessagesSlice } from '@/store/messages/messagesSlice';
import { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
import { createVoiceSlice } from '@/store/voice/voiceSlice';
import { createDebuggerSlice } from '@/store/debugger/debuggerSlice';

// Create the combined store (default for backwards compatibility)
export const useCedarStore = create<CedarStore>()(
	persist(
		(...a) => ({
			...createStylingSlice(...a),
			...createAgentInputContextSlice(...a),
			...createStateSlice(...a),
			...createMessagesSlice(...a),
			...createAgentConnectionSlice(...a),
			...createVoiceSlice(...a),
			...createDebuggerSlice(...a),
		}),
		{
			name: 'cedar-store',
			partialize: (state) => ({
				// 	styling: state.styling,
				// 	agentInputContext: state.agentInputContext,
				// 	state: state.state,
				messages: state.messages,
				// agentConnection: state.agentConnection,
			}),
		}
	)
);

export const useMessages = () => ({
	messages: useCedarStore((state) => state.messages),
	isProcessing: useCedarStore((state) => state.isProcessing),
	showChat: useCedarStore((state) => state.showChat),

	setMessages: useCedarStore((state) => state.setMessages),
	addMessage: useCedarStore((state) => state.addMessage),
	clearMessages: useCedarStore((state) => state.clearMessages),
	setIsProcessing: useCedarStore((state) => state.setIsProcessing),

	setShowChat: useCedarStore((state) => state.setShowChat),
});

// Export the set function directly
export const setCedarStore = useCedarStore.setState;

// Export a hook for styling config
export const useStyling = () => ({
	styling: useCedarStore((state) => state.styling),
	setStyling: useCedarStore((state) => state.setStyling),
	toggleDarkMode: useCedarStore((state) => state.toggleDarkMode),
});

// Export a hook for chat input
export const useChatInput = () => ({
	chatInputContent: useCedarStore((state) => state.chatInputContent),
	setChatInputContent: useCedarStore((state) => state.setChatInputContent),
	overrideInputContent: useCedarStore((state) => state.overrideInputContent),
	setOverrideInputContent: useCedarStore(
		(state) => state.setOverrideInputContent
	),
});

// Export registerState function to allow dynamic state registration
export const registerState: CedarStore['registerState'] = (config) =>
	useCedarStore.getState().registerState(config);

// Export getCedarState function for reading state values
export const getCedarState: CedarStore['getCedarState'] = (key) =>
	useCedarStore.getState().getCedarState(key);

// Export setCedarState function for updating state values
export const setCedarState: CedarStore['setCedarState'] = (key, value) =>
	useCedarStore.getState().setCedarState(key, value);

// Export the extensible store creator
export { createCedarStore } from './createCedarStore';
export type { CreateCedarStoreOptions } from './createCedarStore';

// Export the typed messages slice creator
export { createTypedMessagesSlice } from './messages/createTypedMessagesSlice';
export type { TypedMessagesSlice } from './messages/createTypedMessagesSlice';

// Export message types
export type {
	BaseMessage,
	DefaultMessage,
	TypedMessage,
	MessageByType,
} from './messages/types';

// Export voice slice and utilities
export { createVoiceSlice } from './voice/voiceSlice';
export type { VoiceSlice, VoiceState, VoiceActions } from './voice/voiceSlice';

// Export a hook for voice functionality
export const useVoice = () => ({
	isVoiceEnabled: useCedarStore((state) => state.isVoiceEnabled),
	isListening: useCedarStore((state) => state.isListening),
	isSpeaking: useCedarStore((state) => state.isSpeaking),
	voiceEndpoint: useCedarStore((state) => state.voiceEndpoint),
	voicePermissionStatus: useCedarStore((state) => state.voicePermissionStatus),
	voiceError: useCedarStore((state) => state.voiceError),
	voiceSettings: useCedarStore((state) => state.voiceSettings),

	requestVoicePermission: useCedarStore(
		(state) => state.requestVoicePermission
	),
	checkVoiceSupport: useCedarStore((state) => state.checkVoiceSupport),
	startListening: useCedarStore((state) => state.startListening),
	stopListening: useCedarStore((state) => state.stopListening),
	toggleVoice: useCedarStore((state) => state.toggleVoice),
	setVoiceEndpoint: useCedarStore((state) => state.setVoiceEndpoint),
	updateVoiceSettings: useCedarStore((state) => state.updateVoiceSettings),
	setVoiceError: useCedarStore((state) => state.setVoiceError),
	resetVoiceState: useCedarStore((state) => state.resetVoiceState),
});

// Export a hook for debugger functionality
export const useDebugger = () => ({
	agentConnectionLogs: useCedarStore((state) => state.agentConnectionLogs),
	maxLogs: useCedarStore((state) => state.maxLogs),
	isDebugEnabled: useCedarStore((state) => state.isDebugEnabled),

	logAgentRequest: useCedarStore((state) => state.logAgentRequest),
	logAgentResponse: useCedarStore((state) => state.logAgentResponse),
	logAgentError: useCedarStore((state) => state.logAgentError),
	logStreamStart: useCedarStore((state) => state.logStreamStart),
	logStreamChunk: useCedarStore((state) => state.logStreamChunk),
	logStreamEnd: useCedarStore((state) => state.logStreamEnd),
	clearDebugLogs: useCedarStore((state) => state.clearDebugLogs),
	setDebugEnabled: useCedarStore((state) => state.setDebugEnabled),
	setMaxLogs: useCedarStore((state) => state.setMaxLogs),
});

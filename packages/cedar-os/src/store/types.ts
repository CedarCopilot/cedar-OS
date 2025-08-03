import { StateSlice } from '@/store/stateSlice/stateSlice';
import { AgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
import { StylingConfig, StylingSlice } from './stylingSlice';
import { MessagesSlice } from './messages/messagesSlice';
import { AgentConnectionSlice } from './agentConnection/agentConnectionSlice';
import { VoiceSlice } from './voice/voiceSlice';
import { DebuggerSlice } from './debugger/debuggerSlice';
import { IdentitySlice } from './identitySlice';
import { HistorySlice } from './historySlice';
import { StorageSlice } from './storageSlice';

/**
 * The main Cedar store type that combines all slices
 */
export interface CedarStore
	extends StylingSlice,
		AgentInputContextSlice,
		StateSlice,
		MessagesSlice,
		AgentConnectionSlice,
		VoiceSlice,
		DebuggerSlice,
		StorageSlice,
		IdentitySlice,
		HistorySlice {}

// Re-export StylingConfig for convenience
export type { StylingConfig };

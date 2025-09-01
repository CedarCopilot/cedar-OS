import { StateSlice } from '@/store/stateSlice/stateSlice';
import { AgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
import { StylingConfig, StylingSlice } from '@/store/stylingSlice';
import { MessagesSlice } from '@/store/messages/messagesSlice';
import { AgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
import { VoiceSlice } from '@/store/voice/voiceSlice';
import { DebuggerSlice } from '@/store/debugger/debuggerSlice';
import { SpellSlice } from '@/store/spellSlice/spellSlice';
import { DiffHistorySlice } from '@/store/diffHistoryStateSlice';
import { ToolsSlice } from '@/store/toolsSlice/ToolsTypes';

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
		SpellSlice,
		DiffHistorySlice,
		ToolsSlice {}

// Re-export StylingConfig for convenience
export type { StylingConfig };

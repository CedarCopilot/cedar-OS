import { ResponseProcessor } from '@/store/agentConnection/AgentConnectionTypes';
import { LegacyActionResponse } from '@/store/agentConnection/responseProcessors/createResponseProcessor';
import { MessageInput } from '@/store/messages/MessageTypes';

// Legacy action response processor - backwards compatibility for 'action' type
// This handles the old 'action' type the same way as 'setState' for backwards compatibility
export const legacyActionResponseProcessor: ResponseProcessor<LegacyActionResponse> =
	{
		type: 'action' as const,
		namespace: 'default',
		execute: async (obj, store) => {
			const args = 'args' in obj && Array.isArray(obj.args) ? obj.args : [];
			// Pass options with isDiff set to true for action responses
			store.executeCustomSetter({
				key: obj.stateKey,
				setterKey: obj.setterKey,
				options: { isDiff: true },
				args,
			});
			store.addMessage(obj as unknown as MessageInput);
		},
		validate: (obj): obj is LegacyActionResponse =>
			obj.type === 'action' &&
			'stateKey' in obj &&
			'setterKey' in obj &&
			typeof obj.stateKey === 'string' &&
			typeof obj.setterKey === 'string',
	};

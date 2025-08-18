import { ResponseProcessor } from '@/store/agentConnection/AgentConnectionTypes';
import { ActionResponse } from '@/store/agentConnection/responseProcessors/createResponseProcessor';
import { MessageInput } from '@/store/messages/MessageTypes';

// Action response processor - generic action handling
export const actionResponseProcessor: ResponseProcessor<ActionResponse> = {
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
	validate: (obj): obj is ActionResponse =>
		obj.type === 'action' &&
		'stateKey' in obj &&
		'setterKey' in obj &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string',
};

import { ResponseProcessor } from '@/store/agentConnection/AgentConnectionTypes';
import { SetStateResponse } from '@/store/agentConnection/responseProcessors/createResponseProcessor';
import { MessageInput } from '@/store/messages/MessageTypes';

// SetState response processor - generic setState handling
export const setStateResponseProcessor: ResponseProcessor<SetStateResponse> = {
	type: 'setState' as const,
	namespace: 'default',
	execute: async (obj, store) => {
		const args = 'args' in obj && Array.isArray(obj.args) ? obj.args : [];
		// Pass options with isDiff set to true for setState responses
		store.executeCustomSetter({
			key: obj.stateKey,
			setterKey: obj.setterKey,
			options: { isDiff: true },
			args,
		});
		store.addMessage(obj as unknown as MessageInput);
	},
	validate: (obj): obj is SetStateResponse =>
		(obj.type === 'setState' || obj.type === 'action') &&
		'stateKey' in obj &&
		'setterKey' in obj &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string',
};

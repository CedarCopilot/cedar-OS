import {
	CustomStructuredResponseType,
	ResponseProcessor,
} from '@/store/agentConnection/types';

// Response processor for 'message' type - execute logic + use default text renderer
export type BackendMessageResponse = CustomStructuredResponseType<
	'message',
	{
		role?: 'user' | 'assistant' | 'bot';
		content: string;
	}
>;

export const messageResponseProcessor: ResponseProcessor<BackendMessageResponse> =
	{
		type: 'message',
		namespace: 'default',
		execute: (obj, store) => {
			// Convert message response type to text message and add to chat
			const role = obj.role || 'assistant';
			const content = obj.content;

			store.addMessage({
				role,
				type: 'text',
				content,
			});
		},
		validate: (obj): obj is BackendMessageResponse =>
			obj.type === 'message' &&
			typeof (obj as BackendMessageResponse).content === 'string',
	};

import type {
	ResponseProcessor,
	StructuredResponseType,
} from '@/store/agentConnection/types';
import { CedarStore } from '@/store/types';
import { Message } from '@/store/messages/types';

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

/**
 * Structured response object sent by the backend to indicate progress updates.
 */
export type ProgressUpdateResponse = {
	type: 'progress_update';
	state: 'in_progress' | 'complete' | 'error';
	text: string;
};

/**
 * Runtime type-guard for ProgressUpdateResponse.
 */
function isProgressUpdateResponse(
	obj: StructuredResponseType
): obj is ProgressUpdateResponse {
	return (
		obj &&
		typeof obj === 'object' &&
		(obj as ProgressUpdateResponse).type === 'progress_update' &&
		typeof (obj as ProgressUpdateResponse).text === 'string' &&
		['in_progress', 'complete', 'error'].includes(
			(obj as ProgressUpdateResponse).state as string
		)
	);
}

/**
 * Helper predicate to identify an existing progress update message.
 */
function isProgressMessage(m: Message | undefined): m is Message & {
	type: 'progress_update';
	state: 'in_progress' | 'complete' | 'error';
	text: string;
} {
	return !!m && m.type === 'progress_update';
}

// -----------------------------------------------------------------------------
// Processor implementation
// -----------------------------------------------------------------------------

export const progressUpdateResponseProcessor: ResponseProcessor<ProgressUpdateResponse> =
	{
		type: 'progress_update',
		namespace: 'default',
		execute: async (obj, store: CedarStore) => {
			// Clone the current messages array so we can manipulate it
			const messages = [...store.messages];
			const last = messages[messages.length - 1] as Message | undefined;

			if (obj.state === 'in_progress') {
				if (isProgressMessage(last) && last.state === 'in_progress') {
					// Update the existing in-progress message text
					messages[messages.length - 1] = {
						...last,
						text: obj.text,
					} as Message;
				} else {
					// Push a new in-progress message
					messages.push({
						id: `message-${Date.now()}-${Math.random()
							.toString(36)
							.slice(2, 9)}`,
						role: 'assistant',
						type: 'progress_update',
						text: obj.text,
						state: 'in_progress',
					} as unknown as Message);
				}
				store.setMessages(messages);
				return;
			}

			// Handle completion or error states
			if (obj.state === 'complete' || obj.state === 'error') {
				const newState = obj.state;
				if (isProgressMessage(last) && last.state === 'in_progress') {
					messages[messages.length - 1] = {
						...last,
						text: obj.text,
						state: newState,
					} as Message;
				} else {
					messages.push({
						id: `message-${Date.now()}-${Math.random()
							.toString(36)
							.slice(2, 9)}`,
						role: 'assistant',
						type: 'progress_update',
						text: obj.text,
						state: newState,
					} as unknown as Message);
				}
				store.setMessages(messages);
			}
		},
		validate: isProgressUpdateResponse,
	};

// -----------------------------------------------------------------------------
// Type definitions
// -----------------------------------------------------------------------------

import { z } from 'zod';
import {
	createResponseProcessor,
	CustomStructuredResponseType,
	StructuredResponseType,
	StructuredResponseSchema,
} from '@/index';
import { CedarStore } from '@/store/CedarOSTypes';
import { CustomMessage, Message } from '@/store/messages/MessageTypes';

export type ProgressUpdateResponsePayload = {
	type: 'progress_update';
	state: 'in_progress' | 'complete' | 'error';
	text: string;
};

export type ProgressUpdateResponse = CustomStructuredResponseType<
	'progress_update',
	ProgressUpdateResponsePayload
>;

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

export const progressUpdateResponseProcessor =
	createResponseProcessor<ProgressUpdateResponse>({
		type: 'progress_update',
		namespace: 'custom',
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
				// Remove any existing in-progress messages
				const filtered = messages.filter(
					(m) =>
						!(
							m.type === 'progress_update' &&
							(m as CustomMessage<'progress_update', ProgressUpdateResponse>)
								.state === 'in_progress'
						)
				);
				// Append the final complete or error message
				filtered.push({
					id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
					role: 'assistant',
					type: 'progress_update',
					text: obj.text,
					state: newState,
				} as unknown as Message);
				store.setMessages(filtered);
			}
		},
		validate: isProgressUpdateResponse,
	});

// ===============================================================================
// Zod Schema Definitions
// ===============================================================================

/**
 * Zod schema for ProgressUpdateResponse
 */
export const ProgressUpdateResponseSchema = StructuredResponseSchema(
	'progress_update'
).and(
	z.object({
		state: z.enum(['in_progress', 'complete', 'error']),
		text: z.string(),
	})
);

'use client';

import type { CustomMessage } from './types';

// ----------------------------------------------------------------------------------
// Shared Mastra message types
// ----------------------------------------------------------------------------------

/**
 * All event types emitted by a Mastra agent stream.
 */
export type MastraEventType =
	| 'start'
	| 'step-start'
	| 'tool-call'
	| 'tool-result'
	| 'step-finish'
	| 'tool-output'
	| 'step-result'
	| 'step-output'
	| 'finish';

/**
 * Strongly-typed wrapper around a Mastra structured event message.
 * Extends Cedar's `CustomMessage` so it is compatible with the message system.
 */
export type MastraMessage<T extends string = MastraEventType> = CustomMessage<
	T,
	{
		type: T;
		runId: string;
		from: string;
		// TODO: update once Mastra releases new types
		payload: Record<string, unknown>;
	}
>;

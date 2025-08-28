import { CustomStructuredResponseType } from '@/store/agentConnection/AgentConnectionTypes';
import { CustomMessage } from '@/store/messages/MessageTypes';

// ===============================================================================
// Human-in-the-Loop Response Type Definitions
// ===============================================================================

/**
 * Base human-in-the-loop response type matching Mastra's suspend response
 */
export type HumanInTheLoopResponse<SuspendPayload = Record<string, unknown>> =
	CustomStructuredResponseType<
		'humanInTheLoop',
		{
			status: 'suspended';
			runId: string;
			stepPath: [string[], ...string[][]]; // Support for nested workflow paths
			suspendPayload?: SuspendPayload;
			message?: string;
			timeoutMs?: number;
			metadata?: Record<string, unknown>;
		}
	>;

/**
 * Human-in-the-loop message type for UI rendering
 */
export type HumanInTheLoopMessage<
	SuspendPayload = Record<string, unknown>,
	ResumeData = Record<string, unknown>
> = CustomMessage<
	'humanInTheLoop',
	{
		state: 'suspended' | 'resumed' | 'cancelled' | 'timeout';
		runId: string;
		stepPath: [string[], ...string[][]];
		suspendPayload?: SuspendPayload;
		resumeData?: ResumeData;
		message?: string;
		resumeCallback?: (data: ResumeData) => Promise<void>;
		cancelCallback?: () => Promise<void>;
		resumedAt?: string;
		cancelledAt?: string;
		metadata?: Record<string, unknown>;
	}
>;

/**
 * State shape for suspend/resume data - single state key for all workflows
 */
export interface HumanInTheLoopState<
	SuspendPayload = Record<string, unknown>,
	ResumeData = Record<string, unknown>
> {
	[runId: string]: {
		runId: string;
		stepPath: [string[], ...string[][]];
		suspendPayload: SuspendPayload;
		suspendedAt: string;
		state: 'suspended' | 'resumed' | 'cancelled';
		resumeData?: ResumeData;
		resumedAt?: string;
		cancelledAt?: string;
		threadId?: string;
		messageId: string;
	};
}

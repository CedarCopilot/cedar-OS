import { MastraStreamedResponseType, useMessageRenderers } from 'cedar-os';
import MastraEventRenderer, {
	CustomMastraMessage,
} from './MastraEventRenderer';

/**
 * Hook to register all Mastra message renderers
 * Provides visual components for Mastra events, actions, and stage updates
 */
export function useMastraRenderers() {
	useMessageRenderers<CustomMastraMessage<MastraStreamedResponseType>>([
		// Mastra event renderers for all the stream event types
		{
			type: 'start',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'step-start',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'tool-call',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'tool-result',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'step-finish',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'tool-output',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'step-result',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'step-output',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
		{
			type: 'finish',
			render: (message) => MastraEventRenderer({ message }),
			priority: 8,
		},
	]);
}

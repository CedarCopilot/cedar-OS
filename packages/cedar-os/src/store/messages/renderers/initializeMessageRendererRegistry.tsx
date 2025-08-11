import type {
	MessageRenderer,
	Message,
	MessageRendererRegistry,
} from '@/store/messages/types';

// Import renderer components
import ProgressUpdateRenderer, {
	ProgressUpdateMessage,
} from './ProgressUpdateRenderer';
import ActionResponseRenderer, {
	ActionResponseMessage,
} from './ActionResponseRenderer';
import MastraEventRenderer, {
	CustomMastraMessage,
} from './MastraEventRenderer';
import { MastraStreamedResponseType } from '@/store/agentConnection/providers/mastra';

/* -------------------------------------------------------------------------
 * Default renderer configs
 * -------------------------------------------------------------------------*/

export const progressUpdateMessageRenderer: MessageRenderer<Message> = {
	type: 'progress_update',
	namespace: 'default',
	render: (message) => (
		<ProgressUpdateRenderer message={message as ProgressUpdateMessage} />
	),
	validateMessage: (msg): msg is ProgressUpdateMessage =>
		msg.type === 'progress_update',
};

export const actionResponseMessageRenderer: MessageRenderer<Message> = {
	type: 'action',
	namespace: 'default',
	render: (message) => (
		<ActionResponseRenderer message={message as ActionResponseMessage} />
	),
	validateMessage: (msg): msg is ActionResponseMessage => msg.type === 'action',
};

// Mastra event renderers – one per streamed event type
const mastraEventTypes: MastraStreamedResponseType[] = [
	'start',
	'step-start',
	'tool-call',
	'tool-result',
	'step-finish',
	'tool-output',
	'step-result',
	'step-output',
	'finish',
];

const mastraEventRenderers: MessageRenderer<Message>[] = mastraEventTypes.map(
	(t) => ({
		type: t,
		namespace: 'mastra',
		render: (message) => (
			<MastraEventRenderer
				message={message as CustomMastraMessage<MastraStreamedResponseType>}
			/>
		),
		validateMessage: (msg): msg is Message => msg.type === t,
	})
);

export const defaultMessageRenderers: MessageRenderer<Message>[] = [
	progressUpdateMessageRenderer,
	actionResponseMessageRenderer,
	...mastraEventRenderers,
];

/* -------------------------------------------------------------------------
 * Registry initialiser
 * -------------------------------------------------------------------------*/
export const initializeMessageRendererRegistry = (
	renderers: MessageRenderer<Message>[]
): MessageRendererRegistry => {
	const registry: MessageRendererRegistry = {};

	renderers.forEach((renderer) => {
		const existing = registry[renderer.type];
		if (!existing) {
			registry[renderer.type] = renderer;
		}
	});

	return registry;
};

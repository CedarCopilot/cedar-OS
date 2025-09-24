import type {
	MessageRenderer,
	Message,
	MessageRendererRegistry,
} from '@/store/messages/MessageTypes';

// Import renderer components
import ProgressUpdateRenderer, {
	ProgressUpdateMessage,
} from './ProgressUpdateRenderer';
import SetStateRenderer from './SetStateRenderer';
import LegacyActionRenderer from './LegacyActionRenderer';
import {
	SetStateMessage,
	LegacyActionMessage,
} from '@/store/messages/renderers/createMessageRenderer';
import MastraEventRenderer, {
	CustomMastraMessage,
} from './MastraEventRenderer';
import { MastraStreamedResponseType } from '@/store/agentConnection/providers/mastra';
import { humanInTheLoopMessageRenderer } from './HumanInTheLoopRenderer';
import { defaultFrontendToolMessageRenderer } from './FrontendToolRenderer';

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

export const setStateResponseMessageRenderer: MessageRenderer<Message> = {
	type: 'setState',
	namespace: 'default',
	render: (message) => (
		<SetStateRenderer message={message as SetStateMessage} />
	),
	validateMessage: (msg): msg is SetStateMessage => msg.type === 'setState',
};

export const legacyActionMessageRenderer: MessageRenderer<Message> = {
	type: 'action',
	namespace: 'default',
	render: (message) => (
		<LegacyActionRenderer message={message as LegacyActionMessage} />
	),
	validateMessage: (msg): msg is LegacyActionMessage => msg.type === 'action',
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
	setStateResponseMessageRenderer,
	legacyActionMessageRenderer, // Backwards compatibility for 'action' type
	humanInTheLoopMessageRenderer, // Human-in-the-loop workflow support
	defaultFrontendToolMessageRenderer, // Simple frontend tool renderer (like tool but for frontend)
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

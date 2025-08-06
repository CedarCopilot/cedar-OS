import type {
	StageUpdateMessage,
	ActionMessage,
	MessageProcessor,
	MessageProcessorRegistry,
	MessageProcessorEntry,
	CustomMessage,
} from './types';
import type { Message } from './types';
import { BaseMessage } from './types';

// Message processor for 'message' type - execute logic + use default text renderer
export type BackendMessage = CustomMessage<
	'message',
	{
		type: 'message';
		content: string;
	}
>;

export const messageProcessor: MessageProcessor<BackendMessage> = {
	type: 'message',
	namespace: 'default',
	priority: 0,
	execute: (obj, store) => {
		// Convert message type to text message and add to chat
		const role =
			'role' in obj && typeof obj.role === 'string'
				? (obj.role as BaseMessage['role'])
				: 'assistant';

		store.addMessage({
			role,
			type: 'text',
			content: obj.content as string,
		});
	},
	validate: (obj): obj is BackendMessage =>
		obj.type === 'message' &&
		typeof (obj as BackendMessage).content === 'string',
};

// Action processor for 'action' type - execute state setters + add to chat
export const actionProcessor: MessageProcessor<ActionMessage> = {
	type: 'action',
	namespace: 'default',
	priority: 0,
	execute: (obj, store) => {
		// Execute state setter if provided
		if (obj.stateKey && obj.setterKey) {
			const args = Array.isArray(obj.args) ? obj.args : [];
			store.executeCustomSetter(obj.stateKey, obj.setterKey, ...args);
		}

		// Add the action as a message so it can be rendered
		store.addMessage(obj);
	},
	validate: (obj: BaseMessage): obj is ActionMessage => {
		if (obj.type !== 'action') return false;
		const candidate = obj as Partial<ActionMessage>;
		return (
			typeof candidate.stateKey === 'string' &&
			typeof candidate.setterKey === 'string'
		);
	},
};

// Stage update processor for 'stage_update' type - add to chat with default renderer
export const stageUpdateProcessor: MessageProcessor<StageUpdateMessage> = {
	type: 'stage_update',
	namespace: 'default',
	priority: 0,
	execute: (obj, store) => {
		// Add stage update message to chat
		store.addMessage({
			role: 'assistant',
			type: 'stage_update',
			status: obj.status,
			message: obj.message,
			content: '',
		});
	},
	validate: (obj: BaseMessage): obj is StageUpdateMessage => {
		if (obj.type !== 'stage_update') return false;
		const candidate = obj as Partial<StageUpdateMessage>;
		return (
			typeof candidate.status === 'string' &&
			typeof candidate.message === 'string'
		);
	},
};

export const defaultProcessors: MessageProcessor[] = [
	messageProcessor as MessageProcessor<Message>,
	actionProcessor as MessageProcessor<Message>,
	stageUpdateProcessor as MessageProcessor<Message>,
];

// Helper function to initialize processor registry with defaults
export const initializeProcessorRegistry = (
	processors: MessageProcessor[]
): MessageProcessorRegistry => {
	const registry: MessageProcessorRegistry = {};

	processors.forEach((processor) => {
		const entry: MessageProcessorEntry = {
			...processor,
			priority: processor.priority ?? 0,
		};

		if (!registry[processor.type]) {
			registry[processor.type] = [];
		}
		registry[processor.type].push(entry);
	});

	// Sort each type's processors by priority (highest first)
	Object.keys(registry).forEach((type) => {
		registry[type].sort((a, b) => b.priority - a.priority);
	});

	return registry;
};

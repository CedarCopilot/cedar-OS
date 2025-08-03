import type {
	MessageHandler,
	MessageHandlerEntry,
	StageUpdateStatus,
} from './types';
import { CedarStore } from '@/store/types';
import { BaseMessage } from './types';

// Handler for 'message' structured objects
export const messageHandler: MessageHandler = (obj, store: CedarStore) => {
	if (typeof obj.content !== 'string') return false;

	const role =
		'role' in obj && typeof obj.role === 'string'
			? (obj.role as BaseMessage['role'])
			: 'assistant';

	store.addMessage({
		role,
		type: 'text',
		content: obj.content,
	});

	return true;
};

export const messageHandlerEntry: MessageHandlerEntry = {
	type: 'message',
	handler: messageHandler,
	validateMessage: (
		obj
	): obj is { type: 'message'; content: string; role?: string } =>
		obj.type === 'message' && typeof obj.content === 'string',
};

// Handler for 'action' structured objects
export const actionHandler: MessageHandler = (obj, store: CedarStore) => {
	if (
		'stateKey' in obj &&
		'setterKey' in obj &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string'
	) {
		const args = 'args' in obj && Array.isArray(obj.args) ? obj.args : [];
		// Execute the setter
		store.executeCustomSetter(obj.stateKey, obj.setterKey, ...args);
	}

	// Add the action as a message so it can be rendered
	store.addMessage({
		role: 'assistant',
		type: 'action',
		content: '',
		...(obj as Record<string, unknown>),
	});

	return true;
};

export const actionHandlerEntry: MessageHandlerEntry = {
	type: 'action',
	handler: actionHandler,
	validateMessage: (
		obj
	): obj is { type: 'action'; stateKey?: string; setterKey?: string } =>
		obj.type === 'action' &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string',
};

export const stageUpdateHandler: MessageHandler = (obj, store: CedarStore) => {
	if (obj.type !== 'stage_update') return false;
	store.addMessage({
		role: 'assistant',
		type: 'stage_update',
		status: obj.status as StageUpdateStatus,
		message: obj.message as string,
		content: '',
	});
	return true;
};

export const stageUpdateHandlerEntry: MessageHandlerEntry = {
	type: 'stage_update',
	handler: stageUpdateHandler,
	validateMessage: (
		obj
	): obj is {
		type: 'stage_update';
		status: StageUpdateStatus;
		message: string;
	} =>
		obj.type === 'stage_update' &&
		typeof obj.status === 'string' &&
		typeof obj.message === 'string',
};

export const defaultHandlers: Record<string, MessageHandlerEntry> = {
	message: messageHandlerEntry,
	action: actionHandlerEntry,
	stage_update: stageUpdateHandlerEntry,
};

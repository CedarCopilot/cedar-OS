import { MessageRenderer, Message, CustomMessage } from '@/store/messages/MessageTypes';
import React from 'react';

export function createMessageRenderer<T extends Message>(
	p: MessageRenderer<T>
): MessageRenderer<Message> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as MessageRenderer<Message>;
}

// ---------------------------------------------------------------------------
// Helper types and factory for Action chat messages
// ---------------------------------------------------------------------------

export type ActionMessagePayload = {
	stateKey: string;
	setterKey: string;
	args?: unknown[];
};

export type ActionMessage = CustomMessage<'action', ActionMessagePayload>;

// Helper to derive a narrower action message type
export type ActionMessageFor<
	StateKey extends string,
	SetterKey extends string,
	Args extends unknown[] = []
> = CustomMessage<
	'action',
	{ stateKey: StateKey; setterKey: SetterKey; args: Args }
>;

// Factory to create an Action message renderer with optional filtering
export function createActionMessageRenderer<T extends ActionMessage>(config: {
	namespace?: string;
	/** Optional setterKey filter; if provided the renderer only handles msgs with this key */
	setterKey?: string;
	render: (msg: T) => React.ReactNode;
	validateMessage?: (msg: Message) => msg is T;
}): MessageRenderer<Message> {
	const { namespace, setterKey, render, validateMessage } = config;

	const defaultValidate = (msg: Message): msg is ActionMessage => {
		if (msg.type !== 'action') return false;
		if (setterKey && (msg as ActionMessage).setterKey !== setterKey)
			return false;
		return true;
	};

	const rendererFn = (message: Message) => {
		return render(message as T);
	};

	return {
		type: 'action',
		namespace,
		render: rendererFn,
		validateMessage: validateMessage ?? defaultValidate,
	} as unknown as MessageRenderer<Message>;
}

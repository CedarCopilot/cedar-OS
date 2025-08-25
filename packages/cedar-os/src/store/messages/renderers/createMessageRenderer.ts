import {
	MessageRenderer,
	Message,
	CustomMessage,
} from '@/store/messages/MessageTypes';
import React from 'react';

export function createMessageRenderer<T extends Message>(
	p: MessageRenderer<T>
): MessageRenderer<Message> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as MessageRenderer<Message>;
}

// ---------------------------------------------------------------------------
// Helper types and factory for SetState chat messages
// ---------------------------------------------------------------------------

export type SetStateMessagePayload = {
	stateKey: string;
	setterKey: string;
	args?: unknown[];
};

export type SetStateMessage = CustomMessage<'setState', SetStateMessagePayload>;

// Helper to derive a narrower setState message type
export type SetStateMessageFor<
	StateKey extends string,
	SetterKey extends string,
	Args extends unknown[] = []
> = CustomMessage<
	'setState',
	{ stateKey: StateKey; setterKey: SetterKey; args: Args }
>;

// Factory to create a SetState message renderer with optional filtering
export function createSetStateMessageRenderer<
	T extends SetStateMessage
>(config: {
	namespace?: string;
	/** Optional setterKey filter; if provided the renderer only handles msgs with this key */
	setterKey?: string;
	render: (msg: T) => React.ReactNode;
	validateMessage?: (msg: Message) => msg is T;
}): MessageRenderer<Message> {
	const { namespace, setterKey, render, validateMessage } = config;

	const defaultValidate = (msg: Message): msg is SetStateMessage => {
		if (msg.type !== 'setState') return false;
		if (setterKey && (msg as SetStateMessage).setterKey !== setterKey)
			return false;
		return true;
	};

	const rendererFn = (message: Message) => {
		return render(message as T);
	};

	return {
		type: 'setState',
		namespace,
		render: rendererFn,
		validateMessage: validateMessage ?? defaultValidate,
	} as unknown as MessageRenderer<Message>;
}

import {
	BaseStructuredResponseType,
	CustomStructuredResponseType,
	ResponseProcessor,
	ResponseProcessorExecute,
	StructuredResponseType,
} from '@/store/agentConnection/types';
import { useCedarStore } from '@/store/CedarStore';
import { MessageInput } from '@/store/messages/types';
import { useEffect, useMemo } from 'react';

// -----------------------------------------------------------------------------
// Base payload shared by ActionResponse structured responses and chat messages
// -----------------------------------------------------------------------------

export type ActionResponsePayload = {
	stateKey: string;
	setterKey: string;
	args?: unknown[];
};

// Generic action structured response type
export type ActionResponse = CustomStructuredResponseType<
	'action',
	ActionResponsePayload
>;

// Action response processor - generic action handling
export const actionResponseProcessor: ResponseProcessor<ActionResponse> = {
	type: 'action' as const,
	namespace: 'default',
	execute: async (obj, store) => {
		const args = 'args' in obj && Array.isArray(obj.args) ? obj.args : [];
		store.executeCustomSetter(obj.stateKey, obj.setterKey, ...args);
		store.addMessage(obj as unknown as MessageInput);
	},
	validate: (obj): obj is ActionResponse =>
		obj.type === 'action' &&
		'stateKey' in obj &&
		'setterKey' in obj &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string',
};

// Helper type for action responses
export type ActionResponseFor<
	StateKey extends string,
	SetterKey extends string,
	Args extends unknown[] = []
> = BaseStructuredResponseType & {
	type: 'action';
	stateKey: StateKey;
	setterKey: SetterKey;
	args: Args;
};

// Factory function for creating action response processors
export function createActionResponseProcessor<
	T extends ActionResponse
>(config: {
	namespace?: string;
	/** Optional setterKey. If provided the processor only handles msgs with this key */
	setterKey?: string;
	execute?: ResponseProcessorExecute<T>;
	validate?: (obj: StructuredResponseType) => obj is T; // custom validator override
}): ResponseProcessor<T> {
	const { namespace, setterKey, execute, validate } = config;

	const defaultValidate = (obj: StructuredResponseType): obj is T => {
		if (obj.type !== 'action') return false;
		if (setterKey && (obj as ActionResponse).setterKey !== setterKey)
			return false;
		return true;
	};

	return {
		type: 'action',
		namespace,
		execute: execute as ResponseProcessorExecute<T>,
		validate: validate ?? defaultValidate,
	};
}

/**
 * Hook to register an action response processor with typed action names
 * @param config - Action processor configuration with typed action name
 */
export function useActionResponseProcessor<T extends ActionResponse>(config: {
	action: T;
	namespace?: string;
	execute: ResponseProcessorExecute<T>;
}) {
	const registerResponseProcessor = useCedarStore(
		(s) => s.registerResponseProcessor
	);

	// Memoize the processor configuration
	const processor = useMemo(() => {
		return createActionResponseProcessor(config);
	}, [config]);

	useEffect(() => {
		registerResponseProcessor(processor);
	}, [processor, registerResponseProcessor]);
}

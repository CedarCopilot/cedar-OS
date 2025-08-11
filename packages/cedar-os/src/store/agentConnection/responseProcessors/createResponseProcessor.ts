import {
	BaseStructuredResponseType,
	CustomStructuredResponseType,
	ResponseProcessorExecute,
	StructuredResponseType,
} from '@/store/agentConnection/types';

import { ResponseProcessor } from '@/store/agentConnection/types';

export function createResponseProcessor<T extends StructuredResponseType>(
	p: ResponseProcessor<T>
): ResponseProcessor<StructuredResponseType> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as ResponseProcessor<StructuredResponseType>;
}

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
}): ResponseProcessor<StructuredResponseType> {
	const { namespace, setterKey, execute, validate } = config;

	const defaultValidate = (
		obj: StructuredResponseType
	): obj is ActionResponse => {
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
	} as unknown as ResponseProcessor<StructuredResponseType>;
}

import {
	BaseStructuredResponseType,
	CustomStructuredResponseType,
	ResponseProcessorExecute,
	StructuredResponseType,
	ResponseProcessor,
} from '@/store/agentConnection/AgentConnectionTypes';

export function createResponseProcessor<T extends StructuredResponseType>(
	p: ResponseProcessor<T>
): ResponseProcessor<StructuredResponseType> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as ResponseProcessor<StructuredResponseType>;
}

// -----------------------------------------------------------------------------
// Base payload shared by SetStateResponse structured responses and chat messages
// -----------------------------------------------------------------------------

export type SetStateResponsePayload = {
	stateKey: string;
	setterKey: string;
	args?: unknown[];
};

// Generic setState structured response type
export type SetStateResponse = CustomStructuredResponseType<
	'setState',
	SetStateResponsePayload
>;

// Helper type for setState responses
export type SetStateResponseFor<
	StateKey extends string,
	SetterKey extends string,
	Args extends unknown[] = []
> = BaseStructuredResponseType & {
	type: 'setState';
	stateKey: StateKey;
	setterKey: SetterKey;
	args: Args;
};

// Factory function for creating setState response processors
export function createSetStateResponseProcessor<
	T extends SetStateResponse
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
	): obj is SetStateResponse => {
		if (obj.type !== 'setState') return false;
		if (setterKey && (obj as SetStateResponse).setterKey !== setterKey)
			return false;
		return true;
	};

	return {
		type: 'setState',
		namespace,
		execute: execute as ResponseProcessorExecute<T>,
		validate: validate ?? defaultValidate,
	} as unknown as ResponseProcessor<StructuredResponseType>;
}

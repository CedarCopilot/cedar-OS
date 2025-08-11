import {
	BaseStructuredResponseType,
	CustomStructuredResponseType,
	ResponseProcessor,
	ResponseProcessorExecute,
	StructuredResponseType,
} from '@/store/agentConnection/types';
import { useCedarStore } from '@/store/CedarStore';
import { useEffect, useMemo } from 'react';

// Generic action response type
export type ActionResponse = CustomStructuredResponseType<
	'action',
	{
		stateKey: string;
		setterKey: string;
		args?: unknown[];
	}
>;

// Action response processor - generic action handling
export const actionResponseProcessor: ResponseProcessor<ActionResponse> = {
	type: 'action' as const,
	namespace: 'default',
	priority: 5,
	execute: async (obj, store) => {
		const args = 'args' in obj && Array.isArray(obj.args) ? obj.args : [];
		store.executeCustomSetter(obj.stateKey, obj.setterKey, ...args);
	},
	validate: (obj): obj is ActionResponse =>
		obj.type === 'action' &&
		'stateKey' in obj &&
		'setterKey' in obj &&
		typeof obj.stateKey === 'string' &&
		typeof obj.setterKey === 'string',
};

// Helper type for action responses - mirrors ActionMessageFor pattern
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
	priority?: number;
	/** Optional setterKey. If provided the processor only handles msgs with this key */
	setterKey?: string;
	execute?: ResponseProcessorExecute<T>;
	validate?: (obj: StructuredResponseType) => obj is T; // custom validator override
}): ResponseProcessor<T> {
	const { namespace, priority = 0, setterKey, execute, validate } = config;

	const defaultValidate = (obj: StructuredResponseType): obj is T => {
		if (obj.type !== 'action') return false;
		if (setterKey && (obj as ActionResponse).setterKey !== setterKey)
			return false;
		return true;
	};

	return {
		type: 'action',
		namespace,
		priority,
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
	priority?: number;
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

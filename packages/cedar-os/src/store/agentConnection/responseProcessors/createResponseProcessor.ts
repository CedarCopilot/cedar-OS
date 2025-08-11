import { StructuredResponseType } from '@/store/agentConnection/types';

import { ResponseProcessor } from '@/store/agentConnection/types';

export function createResponseProcessor<T extends StructuredResponseType>(
	p: ResponseProcessor<T>
): ResponseProcessor<StructuredResponseType> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as ResponseProcessor<StructuredResponseType>;
}

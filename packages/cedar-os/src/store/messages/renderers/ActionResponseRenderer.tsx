import React from 'react';

import { ShimmerText } from './ShimmerText';
import { ActionResponsePayload } from '@/store/agentConnection/responseProcessors/actionResponseProcessor';
import { CustomMessage } from '@/store/messages/types';

export type ActionResponseMessage = CustomMessage<
	'action',
	ActionResponsePayload
>;

interface ActionResponseRendererProps {
	message: ActionResponseMessage;
}

const ActionResponseRenderer: React.FC<ActionResponseRendererProps> = ({
	message,
}) => {
	// Build a simple human readable text if not provided
	const defaultText = `Executing action ${message.setterKey ?? ''}`;
	const text = message.content || defaultText;

	return (
		<div className='my-1'>
			<ShimmerText text={text} state='thinking' />
		</div>
	);
};

export default ActionResponseRenderer;

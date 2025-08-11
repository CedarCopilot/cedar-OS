import React from 'react';

import { CustomMessage, ActionResponsePayload } from 'cedar-os';
import { ShimmerText } from '../../text/ShimmerText';

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

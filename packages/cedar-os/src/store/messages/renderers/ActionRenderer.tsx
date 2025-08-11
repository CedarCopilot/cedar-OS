import React from 'react';

import { ShimmerText } from './ShimmerText';
import { ActionMessage } from '@/store/messages/renderers/createMessageRenderer';

interface ActionRendererProps {
	message: ActionMessage;
}

const ActionRenderer: React.FC<ActionRendererProps> = ({ message }) => {
	// Build a simple human readable text if not provided
	const defaultText = `Executing action ${message.setterKey ?? ''}`;
	const text = message.content || defaultText;

	return (
		<div className='my-1'>
			<ShimmerText text={text} state='thinking' />
		</div>
	);
};

export default ActionRenderer;

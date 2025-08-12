import React from 'react';

import { ShimmerText } from './ShimmerText';
import { ActionMessage } from '@/store/messages/renderers/createMessageRenderer';

interface ActionRendererProps {
	message: ActionMessage;
}

const ActionRenderer: React.FC<ActionRendererProps> = ({ message }) => {
	// Build a simple human readable text if not provided
	const defaultText = `Executed action ${message.setterKey ?? ''}`;
	const text = message.content || defaultText;

	return <ShimmerText text={text} state='complete' />;
};

export default ActionRenderer;

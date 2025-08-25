import React from 'react';

import { ShimmerText } from './ShimmerText';
import { SetStateMessage } from '@/store/messages/renderers/createMessageRenderer';

interface SetStateRendererProps {
	message: SetStateMessage;
}

const SetStateRenderer: React.FC<SetStateRendererProps> = ({ message }) => {
	// Build a simple human readable text if not provided
	const defaultText = `Executed setState ${message.setterKey ?? ''}`;
	const text = message.content || defaultText;

	return <ShimmerText text={text} state='complete' />;
};

export default SetStateRenderer;

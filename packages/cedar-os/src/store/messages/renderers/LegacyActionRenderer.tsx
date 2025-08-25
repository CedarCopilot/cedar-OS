import React from 'react';

import { ShimmerText } from './ShimmerText';
import { SetStateMessage } from '@/store/messages/renderers/createMessageRenderer';

interface LegacyActionRendererProps {
	message: SetStateMessage;
}

// Legacy action renderer - backwards compatibility for 'action' type messages
// This handles the old 'action' type the same way as 'setState' for backwards compatibility
const LegacyActionRenderer: React.FC<LegacyActionRendererProps> = ({
	message,
}) => {
	// Build a simple human readable text if not provided
	const defaultText = `Executed action ${message.setterKey ?? ''}`;
	const text = message.content || defaultText;

	return <ShimmerText text={text} state='complete' />;
};

export default LegacyActionRenderer;

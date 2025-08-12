import {
	MastraStreamedResponse,
	MastraStreamedResponseType,
} from '@/store/agentConnection/providers/mastra';
import { CustomMessage } from '@/store/messages/types';
import React from 'react';
import { ShimmerText } from './ShimmerText';

export type CustomMastraMessage<T extends MastraStreamedResponseType> =
	CustomMessage<T, MastraStreamedResponse<T>>;

interface MastraEventRendererProps {
	message: CustomMastraMessage<MastraStreamedResponseType>;
}

const MastraEventRenderer: React.FC<MastraEventRendererProps> = ({
	message,
}) => {
	const { type, runId, payload } = message;

	const formatEventType = (eventType: string) => {
		return eventType
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	// Create the display text
	const text = message.content || `Mastra ${formatEventType(type)}`;

	// Create payload object including runId
	const displayPayload = {
		runId,
		...(payload || {}),
	};

	return (
		<ShimmerText
			text={text}
			state='eventWithPayload'
			payload={displayPayload}
		/>
	);
};

export default MastraEventRenderer;

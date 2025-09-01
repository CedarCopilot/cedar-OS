import React from 'react';
import {
	CustomMessage,
	Message,
	MessageRenderer,
} from '@/store/messages/MessageTypes';
import { ShimmerText } from './ShimmerText';
import { FrontendToolResponse } from '@/store/agentConnection/responseProcessors/frontendToolResponseProcessor';

// Type for frontend tool messages
export type FrontendToolMessage = CustomMessage<
	'frontendTool',
	FrontendToolResponse
>;

// Simple default message renderer for frontendTool type (similar to tool but with different treatment)
export const defaultFrontendToolMessageRenderer: MessageRenderer<Message> = {
	type: 'frontendTool',
	render: (message) => (
		<ShimmerText
			text={message.content}
			state='eventWithPayload'
			payload={{
				toolName: (message as FrontendToolMessage).toolName,
				args: (message as FrontendToolMessage).args,
			}}
		/>
	),
	namespace: 'default',
	validateMessage: (message): message is Message => {
		return message.type === 'frontendTool';
	},
};

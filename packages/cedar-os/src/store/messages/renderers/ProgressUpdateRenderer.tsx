import React from 'react';
import { ShimmerText } from './ShimmerText';
import { ProgressUpdateResponse } from '@/store/agentConnection/responseProcessors/progressUpdateResponseProcessor';
import { CustomMessage } from '@/store/messages/types';

/**
 * Message shape for progress updates stored in the chat history.
 * Extends BaseMessage with the extra `state` field supplied by the processor.
 */
export type ProgressUpdateMessage = CustomMessage<
	'progress_update',
	ProgressUpdateResponse
>;

interface ProgressUpdateRendererProps {
	message: ProgressUpdateMessage;
}

/**
 * Renders a progress-update chat message using the animated ShimmerText component.
 */
const ProgressUpdateRenderer: React.FC<ProgressUpdateRendererProps> = ({
	message,
}) => {
	return <ShimmerText text={message.text} state={message.state} />;
};

export default ProgressUpdateRenderer;

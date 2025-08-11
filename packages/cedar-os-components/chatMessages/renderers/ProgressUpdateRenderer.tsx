import React from 'react';
import { CustomMessage, ProgressUpdateResponse } from 'cedar-os';
import { ShimmerText } from '../../text/ShimmerText';

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
	return (
		<div className='my-1'>
			<ShimmerText text={message.text} state={message.state} />
		</div>
	);
};

export default ProgressUpdateRenderer;

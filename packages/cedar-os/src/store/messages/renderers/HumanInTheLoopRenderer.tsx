import React, { useState } from 'react';
import { MessageRenderer } from '@/store/messages/MessageTypes';
import { HumanInTheLoopMessage } from '@/store/agentConnection/responseProcessors/humanInTheLoopTypes';
import type { Message } from '@/store/messages/MessageTypes';
import { ShimmerText } from './ShimmerText';
import { useCedarStore } from '@/store/CedarStore';

interface HumanInTheLoopRendererProps {
	message: HumanInTheLoopMessage;
}

/**
 * React component for rendering human-in-the-loop workflow messages
 */
export const HumanInTheLoopRenderer: React.FC<HumanInTheLoopRendererProps> = ({
	message,
}) => {
	const [isProcessing, setIsProcessing] = useState(false);

	const handleResume = async (data: Record<string, unknown>) => {
		if (!message.resumeCallback) return;

		setIsProcessing(true);
		try {
			await message.resumeCallback(data);
		} catch (error) {
			console.error('Failed to resume workflow:', error);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleCancel = async () => {
		if (!message.cancelCallback) return;

		setIsProcessing(true);
		try {
			await message.cancelCallback();
		} catch (error) {
			console.error('Failed to cancel workflow:', error);
		} finally {
			setIsProcessing(false);
		}
	};

	// Is this message the latest one
	const messages = useCedarStore.getState().messages;
	const isLatestMessage = messages[messages.length - 1].id === message.id;

	// Different UI based on state
	switch (message.state) {
		case 'suspended':
			return (
				<div className='human-in-the-loop-suspended'>
					<ShimmerText
						text={message.content}
						state='eventWithPayload'
						payload={message.suspendPayload}
					/>
					{isLatestMessage && (
						<div className='actions flex gap-2 mt-3 ml-5'>
							<button
								onClick={() =>
									handleResume({
										approved: true,
									})
								}
								disabled={isProcessing}
								className='py-1 px-2 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer hover:bg-blue-800'>
								{isProcessing ? 'Processing...' : 'Continue'}
							</button>
							<button
								onClick={handleCancel}
								disabled={isProcessing}
								className='py-1 text-gray-500 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer hover:text-gray-700'>
								{isProcessing ? 'Processing...' : 'Cancel'}
							</button>
						</div>
					)}
				</div>
			);

		case 'resumed':
			return (
				<div className='human-in-the-loop-resumed'>
					<ShimmerText
						text={message.content}
						state='complete'
						payload={message.resumeData}
					/>
				</div>
			);

		case 'cancelled':
			return (
				<div className='human-in-the-loop-cancelled'>
					<ShimmerText
						text={message.content}
						state='error'
						payload={{ cancelledAt: message.cancelledAt }}
					/>
				</div>
			);

		case 'timeout':
			return (
				<div className='human-in-the-loop-timeout'>
					<ShimmerText
						text={message.content}
						state='error'
						payload={{
							reason: 'Workflow timed out and was automatically cancelled',
							timeoutAt: new Date().toISOString(),
						}}
					/>
				</div>
			);

		default:
			return (
				<div className='human-in-the-loop-unknown'>
					<ShimmerText
						text={`Unknown workflow state: ${message.state}`}
						state='error'
						payload={{
							state: message.state,
							content: message.content,
							runId: message.runId,
						}}
					/>
				</div>
			);
	}
};

/**
 * Message renderer configuration for human-in-the-loop workflow messages
 */
export const humanInTheLoopMessageRenderer: MessageRenderer<Message> = {
	type: 'humanInTheLoop',
	namespace: 'default',
	render: (message) => (
		<HumanInTheLoopRenderer message={message as HumanInTheLoopMessage} />
	),
	validateMessage: (msg): msg is HumanInTheLoopMessage =>
		msg.type === 'humanInTheLoop',
};

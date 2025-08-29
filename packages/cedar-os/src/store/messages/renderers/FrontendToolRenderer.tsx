import React from 'react';
import {
	BaseMessage,
	Message,
	MessageRenderer,
} from '@/store/messages/MessageTypes';
import { ShimmerText } from './ShimmerText';

// Type for frontend tool messages
export interface FrontendToolMessage extends BaseMessage {
	type: 'frontendTool';
	toolName: string;
	args?: unknown;
	result?: unknown;
	status?: 'success' | 'error' | 'pending';
	error?: string;
}

// Component for rendering frontend tool messages
export const FrontendToolRenderer: React.FC<{
	message: FrontendToolMessage;
}> = ({ message }) => {
	const {
		toolName,
		args,
		result,
		status = 'success',
		error,
		content,
	} = message;

	const statusColors = {
		success: 'bg-green-50 border-green-200 text-green-800',
		error: 'bg-red-50 border-red-200 text-red-800',
		pending: 'bg-yellow-50 border-yellow-200 text-yellow-800',
	};

	const statusIcons = {
		success: '✓',
		error: '✗',
		pending: '⏳',
	};

	return (
		<div className={`rounded-lg border p-4 ${statusColors[status]}`}>
			<div className='flex items-start space-x-2'>
				<span className='text-lg'>{statusIcons[status]}</span>
				<div className='flex-1'>
					<div className='font-semibold mb-1'>Tool: {toolName}</div>

					{content && <div className='text-sm opacity-90 mb-2'>{content}</div>}

					{args !== undefined && (
						<details className='mb-2'>
							<summary className='cursor-pointer text-sm font-medium'>
								Arguments
							</summary>
							<pre className='mt-1 text-xs bg-white bg-opacity-50 rounded p-2 overflow-x-auto'>
								<code>{JSON.stringify(args, null, 2)}</code>
							</pre>
						</details>
					)}

					{status === 'success' && result !== undefined && (
						<details className='mb-2'>
							<summary className='cursor-pointer text-sm font-medium'>
								Result
							</summary>
							<pre className='mt-1 text-xs bg-white bg-opacity-50 rounded p-2 overflow-x-auto'>
								{typeof result === 'string'
									? result
									: JSON.stringify(result, null, 2)}
							</pre>
						</details>
					)}

					{status === 'error' && error && (
						<div className='text-sm mt-2 font-mono'>Error: {error}</div>
					)}
				</div>
			</div>
		</div>
	);
};

// Message renderer configuration
export const frontendToolMessageRenderer: MessageRenderer<Message> = {
	type: 'frontendTool',
	render: (message) => (
		<FrontendToolRenderer message={message as FrontendToolMessage} />
	),
	namespace: 'default',
	validateMessage: (message): message is FrontendToolMessage => {
		return message.type === 'frontendTool' && 'toolName' in message;
	},
};

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
				result: (message as FrontendToolMessage).result,
				status: (message as FrontendToolMessage).status || 'success',
			}}
		/>
	),
	namespace: 'default',
	validateMessage: (message): message is Message => {
		return message.type === 'frontendTool';
	},
};

// Factory function for creating custom frontend tool renderers
export function createFrontendToolMessageRenderer<
	T extends FrontendToolMessage
>(
	config: {
		toolName?: string;
		render?: (message: T) => React.ReactNode;
		className?: string;
		namespace?: string;
	} = {}
): MessageRenderer<T> {
	return {
		type: 'frontendTool',
		namespace: config.namespace || 'default',
		render: (message) => {
			if (config.render) {
				return config.render(message);
			}

			return (
				<div className={config.className || ''}>
					<FrontendToolRenderer message={message} />
				</div>
			);
		},
		validateMessage: (message): message is T => {
			if (message.type !== 'frontendTool') return false;
			if (config.toolName && 'toolName' in message) {
				return (message as FrontendToolMessage).toolName === config.toolName;
			}
			return true;
		},
	};
}

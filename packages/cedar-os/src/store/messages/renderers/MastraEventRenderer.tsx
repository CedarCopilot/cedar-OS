import {
	MastraStreamedResponse,
	MastraStreamedResponseType,
} from '@/store/agentConnection/providers/mastra';
import { CustomMessage } from '@/store/messages/types';
import { cn } from '@/styles/stylingUtils';
import React from 'react';

export type CustomMastraMessage<T extends MastraStreamedResponseType> =
	CustomMessage<T, MastraStreamedResponse<T>>;

interface MastraEventRendererProps {
	message: CustomMastraMessage<MastraStreamedResponseType>;
}

const MastraEventRenderer: React.FC<MastraEventRendererProps> = ({
	message,
}) => {
	const { type, runId, from, payload } = message;

	const getEventIcon = (eventType: string) => {
		switch (eventType) {
			case 'start':
				return '🚀';
			case 'step-start':
				return '▶️';
			case 'tool-call':
				return '🛠️';
			case 'tool-result':
				return '🔧';
			case 'step-finish':
				return '✅';
			case 'tool-output':
				return '📤';
			case 'step-result':
				return '📊';
			case 'step-output':
				return '📋';
			case 'finish':
				return '🏁';
			default:
				return '📡';
		}
	};

	const getEventColor = (eventType: string) => {
		switch (eventType) {
			case 'start':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'finish':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'tool-call':
			case 'tool-result':
			case 'tool-output':
				return 'text-purple-600 bg-purple-50 border-purple-200';
			case 'step-start':
			case 'step-finish':
			case 'step-result':
			case 'step-output':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			default:
				return 'text-gray-600 bg-gray-50 border-gray-200';
		}
	};

	const formatEventType = (eventType: string) => {
		return eventType
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	};

	return (
		<div className={cn('rounded-lg border p-3 mb-2', getEventColor(type))}>
			<div className='flex items-center gap-2 mb-2'>
				<span className='text-lg'>{getEventIcon(type)}</span>
				<span className='font-semibold'>Mastra {formatEventType(type)}</span>
				<span className='text-xs text-gray-500'>from {from}</span>
			</div>

			{message.content && <p className='text-sm mb-2'>{message.content}</p>}

			<div className='text-xs text-gray-500 mb-2'>Run ID: {runId}</div>

			{payload && Object.keys(payload).length > 0 && (
				<details>
					<summary className='text-xs font-medium cursor-pointer hover:text-gray-700'>
						Event Payload
					</summary>
					<pre className='text-xs bg-gray-100 rounded p-2 mt-1 overflow-x-auto'>
						{JSON.stringify(payload, null, 2)}
					</pre>
				</details>
			)}
		</div>
	);
};

export default MastraEventRenderer;

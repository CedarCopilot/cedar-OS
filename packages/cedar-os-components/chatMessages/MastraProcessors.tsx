'use client';

import React from 'react';
import type {
	MastraEventType,
	MastraMessage,
	MessageProcessor,
} from 'cedar-os';

const GenericMastraRenderer: React.FC<{
	message: MastraMessage<MastraEventType>;
}> = ({ message }) => {
	return (
		<div
			style={{
				borderLeft: '4px solid #6366f1',
				paddingLeft: 8,
				margin: '4px 0',
				fontSize: '0.8rem',
			}}>
			<strong style={{ textTransform: 'uppercase' }}>{message.type}</strong>
			<pre style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>
				{JSON.stringify(message.payload, null, 2)}
			</pre>
		</div>
	);
};

// ============================================================================
// MESSAGE PROCESSOR SYSTEM - Mastra processors
// ============================================================================

const buildProcessor = (
	type: MastraEventType
): MessageProcessor<MastraMessage<MastraEventType>> => ({
	type,
	namespace: 'mastra',
	priority: 0,
	render: ({ message }) => {
		return (
			<GenericMastraRenderer
				message={message as MastraMessage<MastraEventType>}
			/>
		);
	},
	// Processor-specific validation not required here
});

export const mastraProcessors: MessageProcessor<
	MastraMessage<MastraEventType>
>[] = [
	buildProcessor('start'),
	buildProcessor('step-start'),
	buildProcessor('tool-call'),
	buildProcessor('tool-result'),
	buildProcessor('step-finish'),
	buildProcessor('tool-output'),
	buildProcessor('step-result'),
	buildProcessor('step-output'),
	buildProcessor('finish'),
];

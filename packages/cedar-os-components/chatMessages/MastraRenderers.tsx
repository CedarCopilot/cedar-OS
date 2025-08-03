'use client';

import React from 'react';
import type {
	MessageRendererEntry,
	BaseMessage,
	MastraEventType,
	MastraMessage,
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

const buildEntry = <T extends MastraEventType>(
	type: T
): MessageRendererEntry => ({
	type,
	renderer: (msg) => (
		<GenericMastraRenderer message={msg as MastraMessage<MastraEventType>} />
	),
	validateMessage: (msg: BaseMessage): msg is MastraMessage<T> =>
		msg.type === type,
});

export const mastraRendererEntries: Record<
	MastraEventType,
	MessageRendererEntry
> = {
	start: buildEntry('start'),
	'step-start': buildEntry('step-start'),
	'tool-call': buildEntry('tool-call'),
	'tool-result': buildEntry('tool-result'),
	'step-finish': buildEntry('step-finish'),
	'tool-output': buildEntry('tool-output'),
	'step-result': buildEntry('step-result'),
	'step-output': buildEntry('step-output'),
	finish: buildEntry('finish'),
};

// src/app/examples/product-roadmap/cedarPlugins.tsx
'use client';

import { useEffect } from 'react';
import { useCedarStore } from 'cedar-os';
import { MastraMessage } from 'cedar-os';

/* 1 — all default Mastra renderers (UI only) */
import { mastraRendererEntries } from '@/chatMessages/MastraRenderers';

/* 2 — optionally add / override your own  ------------------ */

import type { MessageRendererEntry } from 'cedar-os';

/* custom renderer that prettifies the ‘tool-call’ entry        */
const ToolCallRenderer: MessageRendererEntry['renderer'] = (msg) => {
	const toolMsg = msg as MastraMessage<'tool-call'>;
	const { toolName, args } = toolMsg.payload as {
		toolName?: string;
		args?: unknown;
	};
	return (
		<div className='border-l-4 pl-2 my-1 text-xs'>
			<strong>🔧 {toolName ?? 'tool'}</strong>
			<pre className='whitespace-pre-wrap'>{JSON.stringify(args, null, 2)}</pre>
		</div>
	);
};

/* ---------------------------------------------------------------------------
 * Example of a completely custom message type (not Mastra-related)
 * This message is emitted with `{ type: 'alert', level: 'info' | 'warning' | 'error', text: string }`
 * --------------------------------------------------------------------------*/

import type { CustomMessage } from 'cedar-os';

type AlertLevel = 'info' | 'warning' | 'error';
type AlertMessage = CustomMessage<'alert', { level: AlertLevel; text: string }>;

const AlertRendererComponent: React.FC<{ message: AlertMessage }> = ({
	message,
}) => {
	const colour =
		message.level === 'error'
			? 'border-red-500 text-red-600'
			: message.level === 'warning'
			? 'border-yellow-500 text-yellow-600'
			: 'border-blue-500 text-blue-600';
	return (
		<div className={`border-l-4 pl-2 my-1 text-xs ${colour}`}>
			{message.text}
		</div>
	);
};

const alertRendererEntry: MessageRendererEntry = {
	type: 'alert',
	renderer: (msg) => <AlertRendererComponent message={msg as AlertMessage} />,
	validateMessage: (msg): msg is AlertMessage =>
		msg.type === 'alert' && 'text' in msg,
};

/* ---------------------------------------------------------- */

export function ProductRoadmapMessageRenderers() {
	const registerRenderers = useCedarStore((s) => s.registerMessageRenderers);
	const registerHandlers = useCedarStore((s) => s.registerMessageHandlers);
	const unregisterRenderer = useCedarStore((s) => s.unregisterMessageRenderer);

	useEffect(() => {
		registerRenderers({
			// Add all built-in Mastra renderers
			...mastraRendererEntries,
			// Override the ‘tool-call’ renderer
			'tool-call': {
				...mastraRendererEntries['tool-call'],
				renderer: ToolCallRenderer,
			},
			// Add custom alert renderer
			alert: alertRendererEntry,
		});

		return () => {
			/* tidy up on unmount (hot-reload etc.) */
			Object.keys(mastraRendererEntries).forEach(unregisterRenderer);
			unregisterRenderer('tool-call');
			unregisterRenderer('alert');
		};
	}, [registerRenderers, registerHandlers, unregisterRenderer]);

	return null; // this component only performs registration
}

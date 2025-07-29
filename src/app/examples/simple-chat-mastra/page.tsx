'use client';

import React from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow';
import { CedarCaptionChat } from '@/chatComponents/CedarCaptionChat';
import 'reactflow/dist/style.css';

export default function SimpleChatMastraPage() {
	const nodes = React.useMemo(() => [], []);
	const edges = React.useMemo(() => [], []);

	return (
		<ReactFlowProvider>
			<CedarCaptionChat />
			<div style={{ width: '100%', height: '100vh' }}>
				<ReactFlow nodes={nodes} edges={edges} fitView>
					<Background />
					<Controls />
				</ReactFlow>
			</div>
		</ReactFlowProvider>
	);
}

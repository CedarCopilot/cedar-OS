'use client';

import React from 'react';
import ReactFlow, {
	addEdge,
	Background,
	Connection,
	ConnectionLineType,
	Controls,
	Edge,
	MarkerType,
	Node,
	NodeChange,
	NodeTypes,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useOnSelectionChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import {
	FeatureNode,
	FeatureNodeData,
} from '@/app/examples/product-roadmap/components/FeatureNode';
import { FloatingMenu } from '@/app/examples/product-roadmap/components/FloatingMenu';
import {
	getEdges,
	saveEdges,
} from '@/app/examples/product-roadmap/supabase/edges';
import {
	deleteNode,
	getNodes,
	saveNodes,
} from '@/app/examples/product-roadmap/supabase/nodes';
import { CedarCaptionChat } from '@/chatComponents/CedarCaptionChat';
import { FloatingCedarChat } from '@/chatComponents/FloatingCedarChat';
import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import {
	ActivationMode,
	Hotkey,
	MouseEvent as SpellMouseEvent,
	useRegisterState,
	useStateBasedMentionProvider,
	useSubscribeInputContext,
	type CedarStore,
} from 'cedar-os';
import {
	ArrowRight,
	Box,
	CheckCircle,
	Copy,
	Download,
	Loader,
	Share2,
	Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { TooltipMenu } from '@/inputs/TooltipMenu';
import RadialMenuSpell from '@/spells/RadialMenuSpell';

// -----------------------------------------------------------------------------
// NodeTypes map (defined once to avoid React Flow error 002)
// -----------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
	featureNode: FeatureNode,
};

// -----------------------------------------------------------------------------
// Flow Canvas component (previous logic)
// -----------------------------------------------------------------------------

function FlowCanvas() {
	// Controlled state for nodes & edges - start with empty arrays
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	// Saving/loading state
	const [isSaving, setIsSaving] = React.useState(false);
	const [hasSaved, setHasSaved] = React.useState(false);
	const initialMount = React.useRef(true);
	const saveTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

	// Register states using the hook version that handles useEffect internally
	useRegisterState({
		value: nodes,
		setValue: setNodes,
		key: 'nodes',
		description: 'Product roadmap nodes',
		customSetters: {
			addNode: {
				name: 'addNode',
				description: 'Add a new node to the roadmap',
				parameters: [
					{
						name: 'node',
						type: 'Node<FeatureNodeData>',
						description: 'The node to add',
					},
				],
				execute: (currentNodes, node) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];
					const nodeData = node as Node<FeatureNodeData>;
					const newNode: Node<FeatureNodeData> = {
						...nodeData,
						type: 'featureNode',
						position: { x: Math.random() * 400, y: Math.random() * 400 },
						id: nodeData.id || uuidv4(),
						data: {
							...nodeData.data,
							nodeType: nodeData.data.nodeType || 'feature',
							status: nodeData.data.status || 'planned',
							upvotes: nodeData.data.upvotes || 0,
							comments: nodeData.data.comments || [],
							diff: 'added' as const,
						},
					};
					setNodes([...nodes, newNode]);
				},
			},
			removeNode: {
				name: 'removeNode',
				description: 'Remove a node from the roadmap',
				parameters: [
					{
						name: 'id',
						type: 'string',
						description: 'The ID of the node to remove',
					},
				],
				execute: async (currentNodes, id) => {
					const nodeId = id as string;
					const nodes = currentNodes as Node<FeatureNodeData>[];
					// Instead of removing, mark as removed with diff
					setNodes(
						nodes.map((node) =>
							node.id === nodeId
								? { ...node, data: { ...node.data, diff: 'removed' as const } }
								: node
						)
					);
				},
			},
			changeNode: {
				name: 'changeNode',
				description: 'Update an existing node in the roadmap',
				parameters: [
					{
						name: 'newNode',
						type: 'Node<FeatureNodeData>',
						description: 'The updated node data',
					},
				],
				execute: (currentNodes, newNode) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];
					const updatedNode = newNode as Node<FeatureNodeData>;
					setNodes(
						nodes.map((node) =>
							node.id === updatedNode.id
								? {
										...updatedNode,
										data: { ...updatedNode.data, diff: 'changed' as const },
								  }
								: node
						)
					);
				},
			},
			acceptDiff: {
				name: 'acceptDiff',
				description: 'Accept a diff for a node',
				parameters: [
					{
						name: 'nodeId',
						type: 'string',
						description: 'The ID of the node to accept the diff for',
					},
				],
				execute: async (currentNodes, nodeId) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];
					const nodeIdStr = nodeId as string;
					const node = nodes.find((n) => n.id === nodeIdStr);

					if (!node || !node.data.diff) return;

					if (node.data.diff === 'removed') {
						// Actually remove the node
						await deleteNode(nodeIdStr);
						setNodes(nodes.filter((n) => n.id !== nodeIdStr));
						// Also remove any edges connected to this node
						setEdges((edges) =>
							edges.filter(
								(edge) => edge.source !== nodeIdStr && edge.target !== nodeIdStr
							)
						);
					} else {
						// Remove diff property for added/changed nodes
						setNodes(
							nodes.map((n) =>
								n.id === nodeIdStr
									? { ...n, data: { ...n.data, diff: undefined } }
									: n
							)
						);
					}
				},
			},
			rejectDiff: {
				name: 'rejectDiff',
				description: 'Reject a diff for a node',
				parameters: [
					{
						name: 'nodeId',
						type: 'string',
						description: 'The ID of the node to reject the diff for',
					},
				],
				execute: (currentNodes, nodeId) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];
					const node = nodes.find((n) => n.id === nodeId);

					if (!node || !node.data.diff) return;

					if (node.data.diff === 'added') {
						// Remove newly added nodes
						setNodes(nodes.filter((n) => n.id !== nodeId));
					} else {
						// Just remove diff property for removed/changed nodes
						setNodes(
							nodes.map((n) =>
								n.id === nodeId
									? { ...n, data: { ...n.data, diff: undefined } }
									: n
							)
						);
					}
				},
			},
			acceptAllDiffs: {
				name: 'acceptAllDiffs',
				description: 'Accept all pending diffs',
				parameters: [],
				execute: async (currentNodes) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];
					const nodesWithDiffs = nodes.filter((n) => n.data.diff);

					// Process removals first
					const removedNodeIds = nodesWithDiffs
						.filter((n) => n.data.diff === 'removed')
						.map((n) => n.id);

					for (const nodeId of removedNodeIds) {
						await deleteNode(nodeId);
					}

					// Update nodes
					const remainingNodes = nodes.filter(
						(n) => !removedNodeIds.includes(n.id)
					);
					setNodes(
						remainingNodes.map((n) => ({
							...n,
							data: { ...n.data, diff: undefined },
						}))
					);

					// Remove edges for deleted nodes
					if (removedNodeIds.length > 0) {
						setEdges((edges) =>
							edges.filter(
								(edge) =>
									!removedNodeIds.includes(edge.source) &&
									!removedNodeIds.includes(edge.target)
							)
						);
					}
				},
			},
			rejectAllDiffs: {
				name: 'rejectAllDiffs',
				description: 'Reject all pending diffs',
				parameters: [],
				execute: (currentNodes) => {
					const nodes = currentNodes as Node<FeatureNodeData>[];

					// Remove added nodes and clear diffs from others
					const filteredNodes = nodes.filter((n) => n.data.diff !== 'added');
					setNodes(
						filteredNodes.map((n) => ({
							...n,
							data: { ...n.data, diff: undefined },
						}))
					);
				},
			},
		},
	});

	useRegisterState({
		key: 'edges',
		value: edges,
		setValue: setEdges,
		description: 'Product roadmap edges',
	});

	// Register mention provider for nodes
	useStateBasedMentionProvider({
		stateKey: 'nodes',
		trigger: '@',
		labelField: (node: Node<FeatureNodeData>) => node.data.title,
		searchFields: ['data.description'],
		description: 'Product roadmap features',
		icon: <Box />,
		color: '#3B82F6', // Blue color
		order: 10, // Features appear after selected nodes
	});

	// Register mention provider for edges
	useStateBasedMentionProvider({
		stateKey: 'edges',
		trigger: '@',
		labelField: (edge: Edge) => {
			const sourceNode = nodes.find((n) => n.id === edge.source);
			const targetNode = nodes.find((n) => n.id === edge.target);
			const sourceTitle = sourceNode?.data.title || edge.source;
			const targetTitle = targetNode?.data.title || edge.target;
			return `${sourceTitle} → ${targetTitle}`;
		},
		description: 'Product roadmap connections',
		icon: <ArrowRight />,
		color: '#10B981', // Green color
		order: 20, // Edges appear last
	});

	// Fetch initial data
	React.useEffect(() => {
		getNodes().then(setNodes);
		getEdges().then(setEdges);
	}, [setNodes, setEdges]);

	// Custom handler for node changes that intercepts deletions
	const handleNodesChange = React.useCallback(
		async (changes: NodeChange[]) => {
			// Check if any changes are deletions
			const deletions = changes.filter((change) => change.type === 'remove');

			if (deletions.length > 0) {
				// Perform soft delete for each deleted node
				for (const deletion of deletions) {
					await deleteNode(deletion.id);
				}

				// Remove edges connected to deleted nodes
				setEdges((edges) => {
					const deletedIds = deletions.map((d) => d.id);
					return edges.filter(
						(edge) =>
							!deletedIds.includes(edge.source) &&
							!deletedIds.includes(edge.target)
					);
				});
			}

			// Apply all changes (including deletions) to local state
			onNodesChange(changes);
		},
		[onNodesChange, setEdges]
	);

	// Persist changes with loading/saved indicator (debounced)
	React.useEffect(() => {
		if (initialMount.current) {
			initialMount.current = false;
			return;
		}
		if (saveTimeout.current) {
			clearTimeout(saveTimeout.current);
		}
		saveTimeout.current = setTimeout(() => {
			setIsSaving(true);
			Promise.all([saveNodes(nodes), saveEdges(edges)])
				.then(() => {
					setIsSaving(false);
					setHasSaved(true);
				})
				.catch(() => setIsSaving(false));
		}, 1000);
		return () => {
			if (saveTimeout.current) {
				clearTimeout(saveTimeout.current);
			}
		};
	}, [nodes, edges]);

	const onConnect = React.useCallback(
		(params: Connection) => {
			setEdges((eds) =>
				addEdge({ ...params, type: 'simplebezier', animated: true }, eds)
			);
		},
		[setEdges]
	);

	// Prevent node drag/pan selection interfering (optional)
	const onNodeClick = React.useCallback(
		(_event: React.MouseEvent, node: Node) => {
			console.log('📌 Node clicked', node);
		},
		[]
	);

	// Edge context menu state
	const [edgeMenu, setEdgeMenu] = React.useState<{
		x: number;
		y: number;
		edge: Edge;
	} | null>(null);

	// Function to open edit label prompt
	const openEditLabel = React.useCallback(
		(edgeToEdit: Edge) => {
			const newLabel = window.prompt(
				'Enter edge label',
				String(edgeToEdit.label ?? '')
			);
			if (newLabel !== null) {
				setEdges((eds) =>
					eds.map((e) =>
						e.id === edgeToEdit.id ? { ...e, label: newLabel } : e
					)
				);
			}
			setEdgeMenu(null);
		},
		[setEdges]
	);

	// Handler for edge click to open context menu
	const onEdgeClick = React.useCallback(
		(event: React.MouseEvent, edge: Edge) => {
			event.preventDefault();
			setEdgeMenu({ x: event.clientX, y: event.clientY, edge });
		},
		[]
	);

	// Handler for edge double click to immediately open edit
	const onEdgeDoubleClick = React.useCallback(
		(event: React.MouseEvent, edge: Edge) => {
			event.preventDefault();
			openEditLabel(edge);
		},
		[openEditLabel]
	);

	// Function to delete selected edge
	const onDeleteEdge = React.useCallback(() => {
		if (edgeMenu) {
			setEdges((eds) => eds.filter((e) => e.id !== edgeMenu.edge.id));
			setEdgeMenu(null);
		}
	}, [edgeMenu, setEdges]);

	// Function to reverse edge direction
	const onDirectionChange = React.useCallback(() => {
		if (edgeMenu) {
			setEdges((eds) =>
				eds.map((e) =>
					e.id !== edgeMenu.edge.id
						? e
						: {
								...e,
								source: e.target,
								target: e.source,
								sourceHandle: e.targetHandle,
								targetHandle: e.sourceHandle,
						  }
				)
			);
			setEdgeMenu(null);
		}
	}, [edgeMenu, setEdges]);

	useOnSelectionChange({
		onChange: ({ edges: selectedEdges }) => {
			if (edgeMenu && !selectedEdges.some((e) => e.id === edgeMenu.edge.id)) {
				setEdgeMenu(null);
			}
		},
	});

	return (
		<div className='h-full w-full relative'>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onNodeClick={onNodeClick}
				onEdgeClick={onEdgeClick}
				onEdgeDoubleClick={onEdgeDoubleClick}
				connectionLineType={ConnectionLineType.SmoothStep}
				defaultEdgeOptions={{
					type: 'simplebezier',
					animated: true,
					markerEnd: { type: MarkerType.ArrowClosed },
				}}
				fitView>
				<Background gap={16} size={1} />
				<Controls />
			</ReactFlow>
			{edgeMenu && (
				<TooltipMenu
					position={{ x: edgeMenu.x, y: edgeMenu.y }}
					onDelete={onDeleteEdge}
					onReverse={onDirectionChange}
					onEdit={() => openEditLabel(edgeMenu.edge)}
					onClose={() => setEdgeMenu(null)}
				/>
			)}
			<div className='absolute top-4 right-4 z-20'>
				{isSaving ? (
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
						<Loader size={20} className='text-gray-500' />
					</motion.div>
				) : hasSaved ? (
					<CheckCircle size={20} className='text-green-500' />
				) : null}
			</div>
		</div>
	);
}

// -----------------------------------------------------------------------------
// Selected Nodes panel (shows titles of selected nodes)
// -----------------------------------------------------------------------------

function SelectedNodesPanel() {
	const [selected, setSelected] = React.useState<Node<FeatureNodeData>[]>([]);

	// First subscription - for numSelectedNodes (order: 1)
	useSubscribeInputContext(
		selected,
		(nodes) => ({
			numSelectedNodes: nodes.length,
		}),
		{
			icon: <Box />,
			color: '#8B5CF6', // Purple color for selected nodes
			labelField: (item) => item.toString(),
			order: 2, // This will appear first
		}
	);

	// Second subscription - for selectedNodes (order: 2)
	useSubscribeInputContext(
		selected,
		(nodes) => ({
			selectedNodes: nodes,
		}),
		{
			icon: <Box />,
			color: '#8B5CF6', // Purple color for selected nodes
			labelField: (item) => item.data.title,
			order: 1, // This will appear second
		}
	);

	useOnSelectionChange({
		onChange: ({ nodes }: { nodes: Node<FeatureNodeData>[] }) =>
			setSelected(nodes),
	});

	return (
		<div className='absolute right-4 top-4 rounded-lg p-3 shadow-md backdrop-blur'>
			<h4 className='mb-2 text-sm font-semibold'>Selected Nodes</h4>
			{selected.length ? (
				<ul className='space-y-1 text-xs'>
					{selected.map((n) => (
						<li key={n.id}>{n.data.title || n.id}</li>
					))}
				</ul>
			) : (
				<p className='text-[11px] text-gray-500'>No selection</p>
			)}
		</div>
	);
}

// -----------------------------------------------------------------------------
// Page component with provider wrapper
// -----------------------------------------------------------------------------

export default function ProductMapPage() {
	const [chatMode, setChatMode] = React.useState<
		'floating' | 'sidepanel' | 'caption'
	>('caption');

	const renderContent = () => (
		<ReactFlowProvider>
			<div className='relative h-screen w-full'>
				<FlowCanvas />
				<SelectedNodesPanel />
				<FloatingMenu
					onChatModeChange={setChatMode}
					currentChatMode={chatMode}
				/>
				{chatMode === 'caption' && <CedarCaptionChat stream={false} />}
				{chatMode === 'floating' && (
					<FloatingCedarChat
						stream={false}
						side='right'
						title='Product Roadmap Assistant'
						collapsedLabel='Need help with your roadmap?'
					/>
				)}

				{/* Radial Menu Spell */}
				<RadialMenuSpell
					spellId='product-roadmap-radial-menu'
					items={[
						{
							title: 'Copy',
							icon: Copy,
							onInvoke: (store: CedarStore) => {
								console.log('Copy action triggered', store);
								// Get selected nodes from the store
								const nodes = store.getCedarState?.('nodes');
								if (Array.isArray(nodes)) {
									const selectedNodes = nodes.filter(
										(n: Node<FeatureNodeData>) => n.selected
									);
									if (selectedNodes.length > 0) {
										const nodeData = JSON.stringify(selectedNodes, null, 2);
										navigator.clipboard.writeText(nodeData);
										console.log('Copied selected nodes to clipboard');
									} else {
										console.log('No nodes selected to copy');
									}
								}
							},
						},
						{
							title: 'Improve',
							icon: Sparkles,
							onInvoke: (store: CedarStore) => {
								console.log('Improve action triggered', store);
								// In a real implementation, this would:
								// 1. Get selected nodes
								// 2. Send to AI for improvement
								// 3. Update the nodes with better descriptions
								alert(
									'AI Improvement - Coming soon! This will enhance node descriptions.'
								);
							},
						},
						{
							title: 'Share',
							icon: Share2,
							onInvoke: (store: CedarStore) => {
								console.log('Share action triggered', store);
								// Generate a shareable link or export
								const currentUrl = window.location.href;
								navigator.clipboard.writeText(currentUrl);
								alert('Link copied to clipboard!');
							},
						},
						{
							title: 'Export',
							icon: Download,
							onInvoke: (store: CedarStore) => {
								console.log('Export action triggered', store);
								// Export the roadmap as JSON
								const nodes = store.getCedarState?.('nodes') || [];
								const edges = store.getCedarState?.('edges') || [];
								const exportData = {
									nodes,
									edges,
									timestamp: new Date().toISOString(),
								};
								const blob = new Blob([JSON.stringify(exportData, null, 2)], {
									type: 'application/json',
								});
								const url = URL.createObjectURL(blob);
								const a = document.createElement('a');
								a.href = url;
								a.download = `roadmap-${Date.now()}.json`;
								a.click();
								URL.revokeObjectURL(url);
								console.log('Exported roadmap data');
							},
						},
					]}
					activationConditions={{
						events: [SpellMouseEvent.RIGHT_CLICK, Hotkey.R],
						mode: ActivationMode.HOLD, // Hold mode for radial menu
					}}
				/>
			</div>
		</ReactFlowProvider>
	);

	if (chatMode === 'sidepanel') {
		return (
			<SidePanelCedarChat
				side='right'
				title='Product Roadmap Assistant'
				collapsedLabel='Need help with your roadmap?'
				showCollapsedButton={true}
				stream={false}>
				{renderContent()}
			</SidePanelCedarChat>
		);
	}

	return renderContent();
}

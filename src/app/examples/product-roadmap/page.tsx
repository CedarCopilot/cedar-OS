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
import { ProductRoadmapChat } from '@/app/examples/product-roadmap/components/ProductRoadmapChat';
import {
	getEdges,
	saveEdges,
} from '@/app/examples/product-roadmap/supabase/edges';
import {
	deleteNode,
	getNodes,
	saveNodes,
} from '@/app/examples/product-roadmap/supabase/nodes';
import { FloatingCedarChat } from '@/chatComponents/FloatingCedarChat';
import { SidePanelCedarChat } from '@/chatComponents/SidePanelCedarChat';
import { TooltipMenu } from '@/inputs/TooltipMenu';
import RadialMenuSpell from '@/spells/RadialMenuSpell';
import { CommandBarChat } from '@/app/examples/product-roadmap/components/CommandBarChat';
import {
	ActivationMode,
	addDiffToArrayObjs,
	Hotkey,
	useDiffStateHelpers,
	useRegisterDiffState,
	useCedarState,
	HumanInTheLoopState,
	useRegisterState,
	useStateBasedMentionProvider,
	useSubscribeStateToAgentContext,
	useRegisterFrontendTool,
	type CedarStore,
	type Setter,
} from 'cedar-os';
import { isSupabaseAvailable } from '@/app/examples/product-roadmap/supabase/client';
import { z } from 'zod';
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

	// Get diff state operations and computed nodes
	const {
		computedValue: computedNodes,
		undo,
		redo,
	} = useDiffStateHelpers<Node<FeatureNodeData>[]>('nodes');

	// Add keyboard listeners for undo/redo
	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Undo: Ctrl+Z (or Cmd+Z on Mac)
			if (
				(event.ctrlKey || event.metaKey) &&
				event.key === 'z' &&
				!event.shiftKey
			) {
				event.preventDefault();
				if (undo()) {
					console.log('Undo performed on nodes');
				}
			}
			// Redo: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y or Cmd+Shift+Z on Mac)
			else if (
				((event.ctrlKey || event.metaKey) && event.key === 'y') ||
				((event.ctrlKey || event.metaKey) &&
					event.shiftKey &&
					event.key === 'z')
			) {
				event.preventDefault();
				if (redo()) {
					console.log('Redo performed on nodes');
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [undo, redo]);

	// Register states using the diff-aware hook
	useRegisterDiffState({
		value: nodes,
		setValue: setNodes,
		key: 'nodes',
		description: 'Product roadmap nodes',
		computeState: (oldState, newState) =>
			addDiffToArrayObjs(oldState, newState, 'id', '/data', {
				type: 'listen',
				fields: ['/data', '/position'],
			}),
		stateSetters: {
			addNode: (() => {
				const addNodeArgsSchema = z.object({
					node: z.object({
						id: z.string().optional(),
						data: z.object({
							title: z.string().describe('Feature title'),
							description: z.string().describe('Detailed feature description'),
							status: z
								.enum(['done', 'planned', 'backlog', 'in progress'])
								.describe('Current development status'),
							nodeType: z
								.enum(['feature', 'bug', 'improvement'])
								.default('feature')
								.describe('Type of node'),
							upvotes: z.number().default(0).describe('Number of upvotes'),
							comments: z
								.array(
									z.object({
										id: z.string(),
										author: z.string(),
										text: z.string(),
									})
								)
								.default([])
								.describe('Array of comments'),
						}),
					}),
				});

				const setter: Setter<
					Node<FeatureNodeData>[],
					typeof addNodeArgsSchema
				> = {
					name: 'addNode',
					description: 'Add a new node to the roadmap',
					argsSchema: addNodeArgsSchema,
					execute: (currentNodes, setValue, args) => {
						// args is fully typed as { node: { id?: string, data: { ... } } }
						const newNode: Node<FeatureNodeData> = {
							...args.node,
							type: 'featureNode',
							position: { x: Math.random() * 400, y: Math.random() * 400 },
							id: args.node.id || uuidv4(),
							data: {
								...args.node.data,
								nodeType: args.node.data.nodeType || 'feature',
								status: args.node.data.status || 'planned',
								upvotes: args.node.data.upvotes || 0,
								comments: args.node.data.comments || [],
							},
						};
						setValue([...currentNodes, newNode]);
					},
				};
				return setter;
			})(),
			removeNode: {
				name: 'removeNode',
				description: 'Remove a node from the roadmap',
				argsSchema: z.object({
					id: z.string().describe('The ID of the node to remove'),
				}),
				execute: async (currentNodes, setValue, args) => {
					setValue(currentNodes.filter((node) => node.id !== args.id));
				},
			},
			changeNode: (() => {
				const changeNodeArgsSchema = z.object({
					newNode: z.object({
						id: z.string().describe('The ID of the node to update'),
						data: z.object({
							title: z.string().describe('Updated feature title'),
							description: z.string().describe('Updated feature description'),
							status: z
								.enum(['done', 'planned', 'backlog', 'in progress'])
								.describe('Updated development status'),
							nodeType: z
								.literal('feature')
								.default('feature')
								.describe('Type of node'),
							upvotes: z.number().default(0).describe('Number of upvotes'),
							comments: z
								.array(
									z.object({
										id: z.string(),
										author: z.string(),
										text: z.string(),
									})
								)
								.default([])
								.describe('Array of comments'),
						}),
					}),
				});

				const setter: Setter<
					Node<FeatureNodeData>[],
					typeof changeNodeArgsSchema
				> = {
					name: 'changeNode',
					description: 'Update an existing node in the roadmap',
					argsSchema: changeNodeArgsSchema,
					execute: (currentNodes, setValue, args) => {
						// args is typed as { newNode: { id: string, data: { ... } } }
						setValue(
							currentNodes.map((node) =>
								node.id === args.newNode.id
									? {
											...args.newNode,
											type: 'featureNode',
											position: node.position, // Keep existing position
											data: { ...args.newNode.data },
									  }
									: node
							)
						);
					},
				};
				return setter;
			})(),
			acceptDiff: (() => {
				const acceptDiffArgsSchema = z.object({
					nodeId: z
						.string()
						.describe('The ID of the node to accept the diff for'),
				});

				const setter: Setter<
					Node<FeatureNodeData>[],
					typeof acceptDiffArgsSchema
				> = {
					name: 'acceptDiff',
					description: 'Accept a diff for a node',
					argsSchema: acceptDiffArgsSchema,
					execute: async (currentNodes, setValue, args) => {
						// args is typed as { nodeId: string }
						const node = currentNodes.find((n) => n.id === args.nodeId);

						if (!node || !node.data.diff) return;

						if (node.data.diff === 'removed') {
							// Actually remove the node
							await deleteNode(args.nodeId);
							setValue(currentNodes.filter((n) => n.id !== args.nodeId));
							// Also remove any edges connected to this node
							setEdges((edges) =>
								edges.filter(
									(edge) =>
										edge.source !== args.nodeId && edge.target !== args.nodeId
								)
							);
						} else {
							// Remove diff property for added/changed nodes
							setNodes(
								currentNodes.map((n) =>
									n.id === args.nodeId ? { ...n, data: { ...n.data } } : n
								)
							);
						}
					},
				};
				return setter;
			})(),
			rejectDiff: (() => {
				const rejectDiffArgsSchema = z.object({
					nodeId: z
						.string()
						.describe('The ID of the node to reject the diff for'),
				});

				const setter: Setter<
					Node<FeatureNodeData>[],
					typeof rejectDiffArgsSchema
				> = {
					name: 'rejectDiff',
					description: 'Reject a diff for a node',
					argsSchema: rejectDiffArgsSchema,
					execute: (currentNodes, setValue, args) => {
						// args is typed as { nodeId: string }
						const node = currentNodes.find((n) => n.id === args.nodeId);

						if (!node || !node.data.diff) return;

						if (node.data.diff === 'added') {
							// Remove newly added nodes
							setValue(currentNodes.filter((n) => n.id !== args.nodeId));
						} else {
							// Just remove diff property for removed/changed nodes
							setValue(
								currentNodes.map((n) =>
									n.id === args.nodeId ? { ...n, data: { ...n.data } } : n
								)
							);
						}
					},
				};
				return setter;
			})(),
		},
	});

	useSubscribeStateToAgentContext(
		'nodes',
		(nodes) => ({
			nodes,
		}),
		{ showInChat: false }
	);

	useRegisterState({
		key: 'edges',
		value: edges,
		setValue: setEdges,
		description: 'Product roadmap edges',
	});

	// Example 1: Simple notification tool
	useRegisterFrontendTool({
		name: 'showNotification',
		description: 'Show a notification to the user',
		argsSchema: z.object({
			message: z.string().describe('The notification message'),
			type: z
				.enum(['success', 'error', 'info', 'warning'])
				.describe('Notification type'),
			duration: z.number().optional().describe('Duration in ms (optional)'),
		}),
		// ✅ SIMPLE: Just receive typed args directly
		execute: async (args) => {
			// args is fully typed as { message: string; type: 'success' | 'error' | 'info' | 'warning'; duration?: number }
			console.log(`Showing ${args.type} notification: ${args.message}`);

			// In a real app, you'd use a toast library
			alert(`${args.type.toUpperCase()}: ${args.message}`);
		},
	});

	// Register mention provider for nodes
	useStateBasedMentionProvider<Node<FeatureNodeData>>({
		stateKey: 'nodes',
		trigger: '@',
		labelField: (node) => node.data.title,
		searchFields: ['data.description'],
		description: 'Product roadmap features',
		icon: <Box />,
		color: '#3B82F6', // Blue color
		order: 10, // Features appear after selected nodes
	});

	// Register mention provider for edges
	useStateBasedMentionProvider<Edge>({
		stateKey: 'edges',
		trigger: '@',
		labelField: (edge) => {
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

	// Fetch initial data (only on mount)
	React.useEffect(() => {
		getNodes().then(setNodes);
		getEdges().then(setEdges);
	}, []); // Empty dependency array - only run on mount

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
				nodes={computedNodes}
				edges={edges}
				nodeTypes={nodeTypes}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
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
					items={[
						{
							title: 'Edit Label',
							icon: '✏️',
							onInvoke: () => openEditLabel(edgeMenu.edge),
						},
						{
							title: 'Reverse Direction',
							icon: '🔄',
							onInvoke: onDirectionChange,
						},
						{
							title: 'Delete Edge',
							icon: '🗑️',
							onInvoke: onDeleteEdge,
						},
					]}
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
	const [selected, setSelected] = useCedarState<Node<FeatureNodeData>[]>({
		key: 'selectedNodes',
		initialValue: [],
		description: 'Selected nodes',
	});

	// Enhanced subscription with dynamic icons and filtering - no manual memoization needed!
	useSubscribeStateToAgentContext<Node<FeatureNodeData>[]>(
		'selectedNodes',
		(selectedNodes: Node<FeatureNodeData>[]) => ({
			selectedNodes,
		}),
		{
			// Dynamic icons based on node status
			icon: (item: Node<FeatureNodeData>) => {
				const status = item?.data?.status;
				switch (status) {
					case 'done':
						return '✅';
					case 'in progress':
						return '🔄';
					case 'planned':
						return '📋';
					case 'backlog':
						return '📝';
					default:
						return <Box />;
				}
			},
			color: '#8B5CF6', // Purple color for selected nodes
			labelField: (item: Node<FeatureNodeData>) => item?.data?.title,
			// Only show nodes that are not in backlog status in chat context
			showInChat: (entry: { data: unknown }) => {
				const node = entry.data as Node<FeatureNodeData>;
				return node?.data?.status !== 'backlog';
			},
			order: 2,
		}
	);

	useOnSelectionChange({
		onChange: ({ nodes }: { nodes: Node<FeatureNodeData>[] }) =>
			setSelected(nodes),
	});

	useSubscribeStateToAgentContext<HumanInTheLoopState>(
		'humanInTheLoop',
		(state) => ({
			humanInTheLoop: state,
		}),
		{
			showInChat: false,
		}
	);

	return (
		<div className='absolute right-4 top-4 rounded-lg p-3 shadow-md backdrop-blur'>
			<div className='flex items-center justify-between mb-2'>
				<h4 className='text-sm font-semibold'>Selected Nodes</h4>
				<div className='text-xs text-gray-500 dark:text-gray-400 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800'>
					{isSupabaseAvailable ? '🗄️ Supabase' : '💾 localStorage'}
				</div>
			</div>
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
		'floating' | 'sidepanel' | 'caption' | 'command'
	>('command');

	const renderContent = () => (
		<ReactFlowProvider>
			<div className='relative h-screen w-full'>
				<FlowCanvas />
				<SelectedNodesPanel />
				<FloatingMenu
					onChatModeChange={setChatMode}
					currentChatMode={chatMode}
				/>
				{chatMode === 'command' && <CommandBarChat open={true} />}
				{chatMode === 'caption' && <ProductRoadmapChat stream={false} />}
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
						events: [Hotkey.R],
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
				stream={true}>
				{renderContent()}
			</SidePanelCedarChat>
		);
	}

	return renderContent();
}

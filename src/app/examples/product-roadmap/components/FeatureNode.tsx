'use client';

import { memo, useState, useEffect, useRef } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position, useReactFlow } from 'reactflow';
import {
	saveNodes,
	deleteNode,
} from '@/app/examples/product-roadmap/supabase/nodes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	ChevronDown,
	ChevronUp,
	Package,
	Bug,
	Lightbulb,
	Component,
	Wrench,
	Bot,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DiffContainer } from '@//diffs';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type Comment = {
	id: string;
	author: string;
	text: string;
};

export type FeatureStatus = 'done' | 'planned' | 'backlog' | 'in progress';
export type NodeType =
	| 'feature'
	| 'bug'
	| 'improvement'
	| 'component'
	| 'utils'
	| 'agent helper';
export type DiffType = 'added' | 'removed' | 'changed';

import { z } from 'zod';

export const FeatureNodeDataSchema = z.object({
	title: z.string(),
	description: z.string(),
	upvotes: z.number(),
	comments: z.array(
		z.object({
			id: z.string(),
			author: z.string(),
			text: z.string(),
		})
	),
	status: z.enum(['done', 'planned', 'backlog', 'in progress']),
	nodeType: z
		.enum([
			'feature',
			'bug',
			'improvement',
			'component',
			'utils',
			'agent helper',
		])
		.default('feature'),
	width: z.number().optional(),
	height: z.number().optional(),
	packageVersion: z.string().optional(),
	diff: z.enum(['added', 'removed', 'changed']).optional(),
}) satisfies z.ZodType<FeatureNodeData>;

export interface FeatureNodeData {
	title: string;
	description: string;
	upvotes: number;
	comments: Comment[];
	status: FeatureStatus;
	nodeType?: NodeType;
	handleLabels?: Record<string, string>;
	details?: string;
	width?: number;
	height?: number;
	packageVersion?: string;
	diff?: DiffType;
}

/**
 * FeatureNode – custom node component used in the product roadmap flow.
 * Shows status, description, and basic metrics. Highlights with a thick border
 * when it is currently selected in the flow.
 */
function FeatureNodeComponent({
	id,
	data,
	selected,
}: NodeProps<FeatureNodeData>) {
	const {
		title,
		description,
		upvotes,
		comments,
		status,
		nodeType = 'feature',
		width = 320,
		height,
		packageVersion,
		diff,
	} = data;

	// Inline editing state
	const [editingTitle, setEditingTitle] = useState(false);
	const [titleValue, setTitleValue] = useState(title);
	const [editingDescription, setEditingDescription] = useState(false);
	const [descriptionValue, setDescriptionValue] = useState(description);
	const { setNodes, getZoom, getNodes } = useReactFlow();

	// Resizing state
	const [isResizing, setIsResizing] = useState(false);
	const [nodeSize, setNodeSize] = useState({ width, height: height || 'auto' });
	const currentSizeRef = useRef({ width, height: height || 'auto' });
	const handleLabelDoubleClick = (handleId: string) => {
		const newLabel = window.prompt('Enter label for handle');
		if (newLabel !== null) {
			setNodes((nds) => {
				const updated = nds.map((n) =>
					n.id === id
						? {
								...n,
								data: {
									...n.data,
									handleLabels: {
										...n.data.handleLabels,
										[handleId]: newLabel,
									},
								},
						  }
						: n
				);
				saveNodes(updated);
				return updated;
			});
		}
	};

	const [showComments, setShowComments] = useState(false);
	const [commentValue, setCommentValue] = useState('');
	const toggleComments = () => setShowComments((prev) => !prev);
	const [expanded, setExpanded] = useState(false);
	const toggleExpanded = () => setExpanded((prev) => !prev);
	const handleUpvote = () => {
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id
					? { ...n, data: { ...n.data, upvotes: n.data.upvotes + 1 } }
					: n
			);
			saveNodes(updated);
			return updated;
		});
	};
	const handleAddComment = () => {
		const trimmed = commentValue.trim();
		if (!trimmed) return;
		const newComment: Comment = {
			id: uuidv4(),
			author: 'Anonymous',
			text: trimmed,
		};
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id
					? {
							...n,
							data: { ...n.data, comments: [...n.data.comments, newComment] },
					  }
					: n
			);
			saveNodes(updated);
			return updated;
		});
		setCommentValue('');
	};

	useEffect(() => {
		if (!editingTitle) setTitleValue(data.title);
	}, [data.title, editingTitle]);

	useEffect(() => {
		if (!editingDescription) setDescriptionValue(data.description);
	}, [data.description, editingDescription]);

	// Sync node size with data
	useEffect(() => {
		if (data.width !== undefined || data.height !== undefined) {
			setNodeSize({
				width: data.width || 320,
				height: data.height || 'auto',
			});
			currentSizeRef.current = {
				width: data.width || 320,
				height: data.height || 'auto',
			};
		}
	}, [data.width, data.height]);

	const commitTitle = () => {
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id ? { ...n, data: { ...n.data, title: titleValue } } : n
			);
			saveNodes(updated);
			return updated;
		});
	};

	const commitDescription = () => {
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id
					? { ...n, data: { ...n.data, description: descriptionValue } }
					: n
			);
			saveNodes(updated);
			return updated;
		});
	};

	// Handle resize
	const handleResize = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsResizing(true);

		const zoom = getZoom();
		const startX = e.clientX;
		const startY = e.clientY;
		const startWidth = nodeSize.width;
		const startHeight =
			typeof nodeSize.height === 'number' ? nodeSize.height : 200;

		const handleMouseMove = (e: MouseEvent) => {
			// Account for zoom level when calculating delta
			const deltaX = (e.clientX - startX) / zoom;
			const deltaY = (e.clientY - startY) / zoom;

			const newWidth = Math.max(200, startWidth + deltaX);
			const newHeight = Math.max(150, startHeight + deltaY);
			setNodeSize({ width: newWidth, height: newHeight });
			currentSizeRef.current = { width: newWidth, height: newHeight };

			// Update node data in real-time
			setNodes((nds) =>
				nds.map((n) =>
					n.id === id
						? { ...n, data: { ...n.data, width: newWidth, height: newHeight } }
						: n
				)
			);
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);

			// Save the final size using the ref
			const finalWidth = currentSizeRef.current.width;
			const finalHeight = currentSizeRef.current.height;

			setNodes((nds) => {
				const updated = nds.map((n) =>
					n.id === id
						? {
								...n,
								data: {
									...n.data,
									width: finalWidth,
									height: finalHeight,
								},
						  }
						: n
				);
				saveNodes(updated);
				return updated;
			});
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	// Handle status change
	const handleStatusChange = (newStatus: FeatureStatus) => {
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id ? { ...n, data: { ...n.data, status: newStatus } } : n
			);
			saveNodes(updated);
			return updated;
		});
	};

	// Handle node type change
	const handleNodeTypeChange = (newNodeType: NodeType) => {
		setNodes((nds) => {
			const updated = nds.map((n) =>
				n.id === id ? { ...n, data: { ...n.data, nodeType: newNodeType } } : n
			);
			saveNodes(updated);
			return updated;
		});
	};

	const statusColor: Record<FeatureStatus, string> = {
		done: 'bg-green-400/70',
		planned: 'bg-yellow-400/70',
		backlog: 'bg-gray-400/70',
		'in progress': 'bg-blue-400/70',
	};

	const nodeTypeColor: Record<NodeType, string> = {
		feature: 'bg-purple-400/70',
		bug: 'bg-red-400/70',
		improvement: 'bg-cyan-400/70',
		component: 'bg-blue-400/70',
		utils: 'bg-orange-400/70',
		'agent helper': 'bg-emerald-400/70',
	};

	// Icon mapping for node types
	const nodeTypeIcon: Record<NodeType, React.ReactNode> = {
		feature: <Lightbulb className='h-3 w-3' />,
		bug: <Bug className='h-3 w-3' />,
		improvement: <Package className='h-3 w-3' />,
		component: <Component className='h-3 w-3' />,
		utils: <Wrench className='h-3 w-3' />,
		'agent helper': <Bot className='h-3 w-3' />,
	};

	// Soft background colors for status
	const statusBackgroundColor: Record<FeatureStatus, string> = {
		done: 'bg-green-50 dark:bg-green-900/20',
		planned: 'bg-yellow-50 dark:bg-yellow-900/20',
		backlog: 'bg-gray-50 dark:bg-gray-800/50',
		'in progress': 'bg-blue-50 dark:bg-blue-900/20',
	};

	// All available statuses
	const allStatuses: FeatureStatus[] = [
		'done',
		'planned',
		'backlog',
		'in progress',
	];

	// All available node types
	const allNodeTypes: NodeType[] = [
		'feature',
		'bug',
		'improvement',
		'component',
		'utils',
		'agent helper',
	];

	// Handle diff actions
	const handleAcceptDiff = async () => {
		const nodes = getNodes();
		const node = nodes.find((n) => n.id === id);
		if (!node || !node.data.diff) return;

		if (node.data.diff === 'removed') {
			// Actually remove the node
			await deleteNode(id);
			setNodes((currentNodes) => currentNodes.filter((n) => n.id !== id));
		} else {
			// Remove diff property for added/changed nodes
			setNodes((nds) =>
				nds.map((n) =>
					n.id === id ? { ...n, data: { ...n.data, diff: undefined } } : n
				)
			);
		}
	};

	const handleRejectDiff = () => {
		setNodes((nds) => {
			const node = nds.find((n) => n.id === id);
			if (!node || !node.data.diff) return nds;

			if (node.data.diff === 'added') {
				// Remove newly added nodes
				return nds.filter((n) => n.id !== id);
			} else {
				// Just remove diff property for removed/changed nodes
				return nds.map((n) =>
					n.id === id ? { ...n, data: { ...n.data, diff: undefined } } : n
				);
			}
		});
	};

	// When selected, add an outer ring highlight without affecting inner layout
	const borderClass = selected
		? 'border border-gray-200 dark:border-gray-700 ring-4 ring-indigo-600 dark:ring-indigo-400'
		: 'border border-gray-200 dark:border-gray-700';

	return (
		<DiffContainer
			showDiffActions={!!diff}
			onAccept={handleAcceptDiff}
			onReject={handleRejectDiff}
			diffType={diff || 'neutral'}>
			<div
				className={`relative rounded-lg p-4 shadow-sm dark:shadow-gray-900/50 ${borderClass} ${
					statusBackgroundColor[status] ? statusBackgroundColor[status] : ''
				} ${isResizing ? 'select-none' : ''} flex flex-col`}
				style={{
					width: `${nodeSize.width}px`,
					height: nodeSize.height === 'auto' ? 'auto' : `${nodeSize.height}px`,
					minWidth: '200px',
					minHeight: '150px',
				}}>
				{/* All content wrapped in a div with relative positioning */}
				<div className='relative' style={{ zIndex: 1 }}>
					<div className='mb-2 flex-none'>
						<div className='flex items-center justify-between gap-2 mb-1'>
							{editingTitle ? (
								<input
									autoFocus
									value={titleValue}
									onChange={(e) => setTitleValue(e.target.value)}
									onBlur={() => {
										commitTitle();
										setEditingTitle(false);
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											commitTitle();
											setEditingTitle(false);
											e.currentTarget.blur();
										}
										if (e.key === 'Escape') {
											setTitleValue(data.title);
											setEditingTitle(false);
										}
									}}
									className='w-full text-sm font-semibold text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded p-1'
								/>
							) : (
								<h3
									className='text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1'
									onDoubleClick={() => setEditingTitle(true)}
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === 'Enter') setEditingTitle(true);
									}}
									aria-label='Edit title'>
									{title}
								</h3>
							)}
							<Button
								variant='ghost'
								size='icon'
								className='h-6 w-6'
								onClick={toggleExpanded}
								aria-label={expanded ? 'Collapse details' : 'Expand details'}>
								{expanded ? (
									<ChevronUp className='h-4 w-4' />
								) : (
									<ChevronDown className='h-4 w-4' />
								)}
							</Button>
						</div>
						<div className='flex items-center gap-1'>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Badge
										className={`${nodeTypeColor[nodeType]} cursor-pointer hover:opacity-80`}
										variant='secondary'
										tabIndex={0}
										role='button'
										aria-label='Change node type'>
										<span className='flex items-center gap-1'>
											{nodeTypeIcon[nodeType]}
											{nodeType}
										</span>
									</Badge>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start'>
									{allNodeTypes.map((nodeTypeOption) => (
										<DropdownMenuItem
											key={nodeTypeOption}
											onClick={() => handleNodeTypeChange(nodeTypeOption)}
											className='cursor-pointer'>
											<Badge
												className={`${nodeTypeColor[nodeTypeOption]} mr-2`}
												variant='secondary'>
												<span className='flex items-center gap-1'>
													{nodeTypeIcon[nodeTypeOption]}
													{nodeTypeOption}
												</span>
											</Badge>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Badge
										className={`${statusColor[status]} cursor-pointer hover:opacity-80`}
										variant='secondary'
										tabIndex={0}
										role='button'
										aria-label='Change status'>
										{status}
									</Badge>
								</DropdownMenuTrigger>
								<DropdownMenuContent align='start'>
									{allStatuses.map((statusOption) => (
										<DropdownMenuItem
											key={statusOption}
											onClick={() => handleStatusChange(statusOption)}
											className='cursor-pointer'>
											<Badge
												className={`${statusColor[statusOption]} mr-2`}
												variant='secondary'>
												{statusOption}
											</Badge>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
							{status === 'done' && packageVersion && (
								<Badge variant='outline' className='text-xs'>
									v{packageVersion}
								</Badge>
							)}
						</div>
					</div>
					{editingDescription ? (
						<textarea
							autoFocus
							value={descriptionValue}
							onChange={(e) => setDescriptionValue(e.target.value)}
							onBlur={() => {
								commitDescription();
								setEditingDescription(false);
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									commitDescription();
									setEditingDescription(false);
								}
								if (e.key === 'Escape') {
									setDescriptionValue(data.description);
									setEditingDescription(false);
								}
							}}
							className='w-full h-full text-xs text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 rounded p-1 flex-1 resize-none'
							style={{ minHeight: '60px' }}
						/>
					) : (
						<p
							className='mb-3 text-xs text-gray-600 dark:text-gray-300 flex-1 overflow-y-auto whitespace-pre-wrap'
							onDoubleClick={() => setEditingDescription(true)}
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === 'Enter') setEditingDescription(true);
							}}
							aria-label='Edit description'>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{description}
							</ReactMarkdown>
						</p>
					)}
					<div className='flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 flex-none'>
						<div className='flex items-center gap-2'>
							<button
								onClick={handleUpvote}
								className='flex items-center gap-1'
								aria-label='Upvote feature'
								title='Upvote'>
								👍 {upvotes}
							</button>
							<button
								onClick={toggleComments}
								className='flex items-center gap-1'
								aria-label='Toggle comments'
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleComments();
									}
								}}>
								💬 {comments.length}
							</button>
						</div>
					</div>
					{expanded && (
						<div className='mt-2 text-xs text-gray-700 dark:text-gray-300 flex-none overflow-y-auto'>
							<ReactMarkdown remarkPlugins={[remarkGfm]}>
								{data.details || 'No details provided.'}
							</ReactMarkdown>
						</div>
					)}
					{showComments && (
						<div className='mt-2 space-y-1 flex-none'>
							{comments.map((c) => (
								<div
									key={c.id}
									className='text-xs text-gray-700 dark:text-gray-300'>
									<strong>{c.author}:</strong> {c.text}
								</div>
							))}
							<div className='mt-1 flex'>
								<input
									type='text'
									placeholder='Add a comment'
									value={commentValue}
									onChange={(e) => setCommentValue(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											handleAddComment();
										}
									}}
									className='w-full text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded p-1'
									aria-label='New comment'
								/>
								<button
									onClick={handleAddComment}
									className='ml-2 text-xs text-blue-500 dark:text-blue-400'>
									Post
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Connection handles - outside content wrapper so not affected by overlay */}
				<Handle
					id='left'
					type='target'
					position={Position.Left}
					className='w-3 !bg-indigo-500 relative flex items-center justify-center'
					style={{ zIndex: 20 }}
					onDoubleClick={() => handleLabelDoubleClick('left')}
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleLabelDoubleClick('left');
					}}>
					{data.handleLabels?.['left'] && (
						<span className='absolute -left-8 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-1 rounded'>
							{data.handleLabels['left']}
						</span>
					)}
				</Handle>
				<Handle
					id='right'
					type='source'
					position={Position.Right}
					className='w-3 !bg-indigo-500 relative flex items-center justify-center'
					style={{ zIndex: 20 }}
					onDoubleClick={() => handleLabelDoubleClick('right')}
					tabIndex={0}
					onKeyDown={(e) => {
						if (e.key === 'Enter') handleLabelDoubleClick('right');
					}}>
					{data.handleLabels?.['right'] && (
						<span className='absolute -right-8 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 px-1 rounded'>
							{data.handleLabels['right']}
						</span>
					)}
				</Handle>

				{/* Resize handle - outside content wrapper */}
				<div
					className='absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-gray-200 dark:hover:bg-gray-600 rounded-br-lg nodrag dark:[background:linear-gradient(135deg,transparent_50%,#4b5563_50%)]'
					onMouseDown={handleResize}
					style={{
						background: 'linear-gradient(135deg, transparent 50%, #e5e7eb 50%)',
						zIndex: 20,
					}}
					aria-label='Resize node'
				/>
			</div>
		</DiffContainer>
	);
}

export const FeatureNode = memo(FeatureNodeComponent);

export default FeatureNode;

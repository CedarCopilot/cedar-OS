import { supabase, isSupabaseAvailable } from './client';
import type { Node } from 'reactflow';
import type {
	FeatureNodeData,
	Comment,
	FeatureStatus,
	NodeType,
} from '@/app/examples/product-roadmap/components/FeatureNode';

type NodeRow = {
	id: string;
	type: string;
	position_x: number;
	position_y: number;
	title: string;
	description: string;
	upvotes: number;
	comments: Comment[];
	status: FeatureStatus;
	node_type?: NodeType;
	package_version?: string;
	width?: number;
	height?: number;
	handle_labels?: Record<string, string>;
	details?: string;
	deleted?: boolean;
};

// localStorage storage functions
const NODES_STORAGE_KEY = 'product-roadmap-nodes';

// Default sample data for localStorage
const getDefaultNodes = (): Node<FeatureNodeData>[] => [
	{
		id: 'sample-1',
		type: 'featureNode',
		position: { x: 100, y: 100 },
		data: {
			title: 'Welcome to Product Roadmap',
			description:
				'This is a sample feature node. Double-click to edit the title or description. You can drag nodes around, connect them with edges, and manage your product roadmap.',
			upvotes: 5,
			comments: [
				{
					id: 'comment-1',
					author: 'System',
					text: 'Welcome! This roadmap is using localStorage since no Supabase configuration was found.',
				},
			],
			status: 'planned',
			nodeType: 'feature',
		},
	},
	{
		id: 'sample-2',
		type: 'featureNode',
		position: { x: 450, y: 200 },
		data: {
			title: 'AI Assistant Integration',
			description:
				'Add an AI assistant to help with roadmap planning and feature prioritization.',
			upvotes: 12,
			comments: [],
			status: 'in progress',
			nodeType: 'feature',
		},
	},
	{
		id: 'sample-3',
		type: 'featureNode',
		position: { x: 200, y: 350 },
		data: {
			title: 'Export Functionality',
			description:
				'Allow users to export their roadmap as JSON, CSV, or PDF formats.',
			upvotes: 8,
			comments: [],
			status: 'backlog',
			nodeType: 'feature',
		},
	},
];

function getNodesFromLocalStorage(): Node<FeatureNodeData>[] {
	if (typeof window === 'undefined') return [];

	try {
		const stored = localStorage.getItem(NODES_STORAGE_KEY);
		if (!stored) {
			// Return default sample data if no nodes exist
			const defaultNodes = getDefaultNodes();
			saveNodesToLocalStorage(defaultNodes);
			return defaultNodes;
		}

		const nodes = JSON.parse(stored) as Node<FeatureNodeData>[];
		// Filter out deleted nodes
		return nodes.filter(
			(node) => !node.data.diff || node.data.diff !== 'removed'
		);
	} catch (error) {
		console.error('Error reading nodes from localStorage:', error);
		// Return default sample data on error
		const defaultNodes = getDefaultNodes();
		saveNodesToLocalStorage(defaultNodes);
		return defaultNodes;
	}
}

function saveNodesToLocalStorage(nodes: Node<FeatureNodeData>[]): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(nodes));
	} catch (error) {
		console.error('Error saving nodes to localStorage:', error);
	}
}

function deleteNodeFromLocalStorage(nodeId: string): void {
	if (typeof window === 'undefined') return;

	const nodes = getNodesFromLocalStorage();
	const updatedNodes = nodes.filter((node) => node.id !== nodeId);
	saveNodesToLocalStorage(updatedNodes);
}

// Supabase storage functions (existing)
async function getNodesFromSupabase(): Promise<Node<FeatureNodeData>[]> {
	if (!supabase) throw new Error('Supabase client not available');

	// Only fetch nodes that are not deleted
	const { data, error } = await supabase
		.from('nodes')
		.select('*')
		.eq('deleted', false);

	if (error) throw error;

	// Return empty array if no data (instead of using default nodes)
	if (!data || data.length === 0) {
		return [];
	}

	const rows = data as NodeRow[];
	return rows.map((row) => ({
		id: row.id,
		type: row.type,
		position: { x: row.position_x, y: row.position_y },
		data: {
			title: row.title,
			description: row.description,
			upvotes: row.upvotes,
			comments: row.comments,
			status: row.status,
			nodeType: row.node_type || 'feature',
			packageVersion: row.package_version,
			width: row.width,
			height: row.height,
			handleLabels: row.handle_labels,
			details: row.details,
		},
	}));
}

async function saveNodesToSupabase(
	nodes: Node<FeatureNodeData>[]
): Promise<void> {
	if (!supabase) throw new Error('Supabase client not available');

	const rows: NodeRow[] = nodes.map((n) => ({
		id: n.id,
		type: n.type!,
		position_x: n.position.x,
		position_y: n.position.y,
		title: n.data.title,
		description: n.data.description,
		upvotes: n.data.upvotes,
		comments: n.data.comments,
		status: n.data.status,
		node_type: n.data.nodeType,
		package_version: n.data.packageVersion,
		width: n.data.width,
		height: n.data.height,
		handle_labels: n.data.handleLabels,
		details: n.data.details,
		deleted: false, // Ensure saved nodes are not marked as deleted
	}));

	const { error } = await supabase.from('nodes').upsert(rows);
	if (error) throw error;
}

async function deleteNodeFromSupabase(nodeId: string): Promise<void> {
	if (!supabase) throw new Error('Supabase client not available');

	const { error } = await supabase
		.from('nodes')
		.update({ deleted: true })
		.eq('id', nodeId);

	if (error) throw error;
}

// Public API functions that choose storage based on availability
export async function getNodes(): Promise<Node<FeatureNodeData>[]> {
	if (isSupabaseAvailable) {
		return await getNodesFromSupabase();
	} else {
		return getNodesFromLocalStorage();
	}
}

export async function saveNodes(nodes: Node<FeatureNodeData>[]): Promise<void> {
	if (isSupabaseAvailable) {
		await saveNodesToSupabase(nodes);
	} else {
		saveNodesToLocalStorage(nodes);
	}
}

// Soft delete a node by marking it as deleted
export async function deleteNode(nodeId: string): Promise<void> {
	if (isSupabaseAvailable) {
		await deleteNodeFromSupabase(nodeId);
	} else {
		deleteNodeFromLocalStorage(nodeId);
	}
}

// Soft delete multiple nodes
export async function deleteNodes(nodeIds: string[]): Promise<void> {
	if (isSupabaseAvailable) {
		if (!supabase) throw new Error('Supabase client not available');

		const { error } = await supabase
			.from('nodes')
			.update({ deleted: true })
			.in('id', nodeIds);

		if (error) throw error;
	} else {
		// For localStorage, delete each node individually
		for (const nodeId of nodeIds) {
			deleteNodeFromLocalStorage(nodeId);
		}
	}
}

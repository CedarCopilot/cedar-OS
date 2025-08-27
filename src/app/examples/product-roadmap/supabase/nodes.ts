import { supabase } from './client';
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

export async function getNodes(): Promise<Node<FeatureNodeData>[]> {
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

export async function saveNodes(nodes: Node<FeatureNodeData>[]) {
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

// Soft delete a node by marking it as deleted
export async function deleteNode(nodeId: string) {
	const { error } = await supabase
		.from('nodes')
		.update({ deleted: true })
		.eq('id', nodeId);

	if (error) throw error;
}

// Soft delete multiple nodes
export async function deleteNodes(nodeIds: string[]) {
	const { error } = await supabase
		.from('nodes')
		.update({ deleted: true })
		.in('id', nodeIds);

	if (error) throw error;
}

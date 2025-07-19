import { supabase } from './client';
import type { Node } from 'reactflow';
import type {
	FeatureNodeData,
	Comment,
	FeatureStatus,
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
};

export async function getNodes(): Promise<Node<FeatureNodeData>[]> {
	const { data, error } = await supabase.from('nodes').select('*');
	if (error) throw error;
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
	}));

	const { error } = await supabase.from('nodes').upsert(rows);
	if (error) throw error;
}

// Add deleteNodes to support deleting nodes by their IDs
export async function deleteNodes(ids: string[]) {
	const { error } = await supabase.from('nodes').delete().in('id', ids);
	if (error) throw error;
}

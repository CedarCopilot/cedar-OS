import { supabase, isSupabaseAvailable } from './client';
import type { Edge, EdgeMarkerType } from 'reactflow';
import { MarkerType } from 'reactflow';

// Defines how edges are stored in the database
type EdgeRow = {
	id: string;
	source: string;
	source_handle: string | null;
	target: string;
	target_handle: string | null;
	type: string;
	animated: boolean;
	marker_end: EdgeMarkerType;
};

// localStorage storage functions
const EDGES_STORAGE_KEY = 'product-roadmap-edges';
const NODES_STORAGE_KEY = 'product-roadmap-nodes';

// Default sample edges for localStorage
const getDefaultEdges = (): Edge[] => [
	{
		id: 'edge-1',
		source: 'sample-1',
		target: 'sample-2',
		type: 'simplebezier',
		animated: true,
		markerEnd: { type: MarkerType.ArrowClosed },
	},
	{
		id: 'edge-2',
		source: 'sample-1',
		target: 'sample-3',
		type: 'simplebezier',
		animated: true,
		markerEnd: { type: MarkerType.ArrowClosed },
	},
];

function getEdgesFromLocalStorage(): Edge[] {
	if (typeof window === 'undefined') return [];

	try {
		const storedEdges = localStorage.getItem(EDGES_STORAGE_KEY);
		const storedNodes = localStorage.getItem(NODES_STORAGE_KEY);

		if (!storedEdges) {
			// Return default sample edges if no edges exist
			const defaultEdges = getDefaultEdges();
			saveEdgesToLocalStorage(defaultEdges);
			return defaultEdges;
		}

		const edges = JSON.parse(storedEdges) as Edge[];

		// If we have nodes data, filter edges to only include those connecting active nodes
		if (storedNodes) {
			const nodes = JSON.parse(storedNodes);
			const activeNodeIds = nodes
				.filter(
					(node: { data: { diff?: string } }) =>
						!node.data.diff || node.data.diff !== 'removed'
				)
				.map((node: { id: string }) => node.id);

			return edges.filter(
				(edge) =>
					activeNodeIds.includes(edge.source) &&
					activeNodeIds.includes(edge.target)
			);
		}

		return edges;
	} catch (error) {
		console.error('Error reading edges from localStorage:', error);
		// Return default sample edges on error
		const defaultEdges = getDefaultEdges();
		saveEdgesToLocalStorage(defaultEdges);
		return defaultEdges;
	}
}

function saveEdgesToLocalStorage(edges: Edge[]): void {
	if (typeof window === 'undefined') return;

	try {
		localStorage.setItem(EDGES_STORAGE_KEY, JSON.stringify(edges));
	} catch (error) {
		console.error('Error saving edges to localStorage:', error);
	}
}

// Supabase storage functions (existing)
async function getEdgesFromSupabase(): Promise<Edge[]> {
	if (!supabase) throw new Error('Supabase client not available');

	// First get all non-deleted node IDs
	const { data: activeNodes, error: nodesError } = await supabase
		.from('nodes')
		.select('id')
		.eq('deleted', false);

	if (nodesError) throw nodesError;

	if (!activeNodes || activeNodes.length === 0) {
		return [];
	}

	const activeNodeIds = activeNodes.map((node) => node.id);

	// Get all edges
	const { data, error } = await supabase.from('edges').select('*');
	if (error) throw error;

	// Filter edges to only include those connecting active nodes
	const rows = (data as EdgeRow[]).filter(
		(edge) =>
			activeNodeIds.includes(edge.source) && activeNodeIds.includes(edge.target)
	);

	return rows.map((row) => ({
		id: row.id,
		source: row.source,
		sourceHandle: row.source_handle,
		target: row.target,
		targetHandle: row.target_handle,
		type: row.type,
		animated: row.animated,
		markerEnd: row.marker_end as EdgeMarkerType,
	}));
}

async function saveEdgesToSupabase(edges: Edge[]): Promise<void> {
	if (!supabase) throw new Error('Supabase client not available');

	const rows: EdgeRow[] = edges.map((e) => ({
		id: e.id,
		source: e.source,
		source_handle: e.sourceHandle ?? null,
		target: e.target,
		target_handle: e.targetHandle ?? null,
		type: e.type!,
		animated: e.animated!,
		marker_end: e.markerEnd as EdgeMarkerType,
	}));
	const { error } = await supabase.from('edges').upsert(rows);
	if (error) throw error;
}

// Public API functions that choose storage based on availability
export async function getEdges(): Promise<Edge[]> {
	if (isSupabaseAvailable) {
		return await getEdgesFromSupabase();
	} else {
		return getEdgesFromLocalStorage();
	}
}

export async function saveEdges(edges: Edge[]): Promise<void> {
	if (isSupabaseAvailable) {
		await saveEdgesToSupabase(edges);
	} else {
		saveEdgesToLocalStorage(edges);
	}
}

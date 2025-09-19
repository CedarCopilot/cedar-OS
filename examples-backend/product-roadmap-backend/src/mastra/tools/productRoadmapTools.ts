import { z } from 'zod';
import { createMastraToolForStateSetter } from '@cedar-os/backend';
import { streamJSONEvent } from '../../utils/streamUtils';

// Import the schemas from the workflow types
const FeatureNodeDataSchema = z.object({
	title: z.string().describe('Title of the feature'),
	description: z.string().describe('Detailed description of the feature'),
	status: z
		.enum(['done', 'planned', 'backlog', 'in progress'])
		.default('planned')
		.describe('Current development status'),
	nodeType: z.literal('feature').default('feature').describe('Type of node'),
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
});

const NodeSchema = z.object({
	id: z
		.string()
		.optional()
		.describe('Optional node ID (will be generated if not provided)'),
	position: z
		.object({
			x: z.number(),
			y: z.number(),
		})
		.optional()
		.describe('Optional position coordinates'),
	data: FeatureNodeDataSchema,
});

// Create individual tools for each state setter action
export const addNodeTool = createMastraToolForStateSetter(
	'nodes',
	'addNode',
	z.object({
		nodes: z.array(NodeSchema).describe('Array of nodes to add to the roadmap'),
	}),
	{
		description: 'Add new feature nodes to the product roadmap',
		toolId: 'add-roadmap-node',
		streamEventFn: streamJSONEvent,
	}
);

export const removeNodeTool = createMastraToolForStateSetter(
	'nodes',
	'removeNode',
	z.object({
		nodeIds: z
			.array(z.string())
			.describe('Array of node IDs to remove from the roadmap'),
	}),
	{
		description: 'Remove feature nodes from the product roadmap by ID',
		toolId: 'remove-roadmap-node',
		streamEventFn: streamJSONEvent,
	}
);

export const changeNodeTool = createMastraToolForStateSetter(
	'nodes',
	'changeNode',
	z.object({
		nodes: z
			.array(
				NodeSchema.extend({
					id: z
						.string()
						.describe('ID of the node to update (required for updates)'),
				})
			)
			.describe('Array of nodes with updated data'),
	}),
	{
		description: 'Update existing feature nodes in the product roadmap',
		toolId: 'change-roadmap-node',
		streamEventFn: streamJSONEvent,
	}
);

// Export all tools as an object for easy access
export const productRoadmapTools = {
	addNode: addNodeTool,
	removeNode: removeNodeTool,
	changeNode: changeNodeTool,
};

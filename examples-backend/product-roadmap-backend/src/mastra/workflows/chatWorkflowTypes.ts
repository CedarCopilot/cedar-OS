import { z } from 'zod';

// Define schemas for product roadmap actions
const FeatureNodeDataSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.enum(['done', 'planned', 'backlog', 'in progress']).default('planned'),
  nodeType: z.literal('feature').default('feature'),
  upvotes: z.number().default(0),
  comments: z
    .array(
      z.object({
        id: z.string(),
        author: z.string(),
        text: z.string(),
      }),
    )
    .default([]),
});

const NodeSchema = z.object({
  id: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  data: FeatureNodeDataSchema,
});

// Action schemas
const AddNodeActionSchema = z.object({
  type: z.literal('setState'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('addNode'),
  args: z.array(NodeSchema),
});

const RemoveNodeActionSchema = z.object({
  type: z.literal('setState'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('removeNode'),
  args: z.array(z.string()), // Just the node ID
});

const ChangeNodeActionSchema = z.object({
  type: z.literal('setState'),
  stateKey: z.literal('nodes'),
  setterKey: z.literal('changeNode'),
  args: z.array(NodeSchema),
});

// Union of all action responses
export const ActionResponseSchema = z.union([
  AddNodeActionSchema,
  RemoveNodeActionSchema,
  ChangeNodeActionSchema,
]);

// Final agent response shape – either a plain chat message (content only)
// or a chat message accompanied by an action.
export const ExecuteFunctionResponseSchema = z.object({
  content: z.string(),
  object: ActionResponseSchema.optional(),
});

import { registerApiRoute } from '@mastra/core/server';
import {
	ChatInputSchema,
	ChatOutput,
	chatWorkflow,
} from './workflows/chatWorkflow';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createSSEStream, streamJSONEvent } from '../utils/streamUtils';

export const ChatThreadSchema = z.object({
	id: z.string(),
	title: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type ChatThread = z.infer<typeof ChatThreadSchema>;

export const ChatMessageSchema = z.object({
	id: z.string(),
	threadId: z.string(),
	role: z.enum(['user', 'assistant']),
	content: z.string(),
	createdAt: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Request body for saving messages
export const SaveMessagesBodySchema = z.object({
	messages: z.array(ChatMessageSchema),
});

// Helper function to convert Zod schema to OpenAPI schema
function toOpenApiSchema(schema: Parameters<typeof zodToJsonSchema>[0]) {
	return zodToJsonSchema(schema) as Record<string, unknown>;
}

export const apiRoutes = [
	registerApiRoute('/chat', {
		method: 'POST',
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: toOpenApiSchema(ChatInputSchema),
					},
				},
			},
		},
		handler: async (c) => {
			try {
				const body = await c.req.json();
				const {
					prompt,
					additionalContext,
					temperature,
					maxTokens,
					systemPrompt,
					resourceId,
					threadId,
				} = ChatInputSchema.parse(body);

				const run = await chatWorkflow.createRunAsync();
				const result = await run.start({
					inputData: {
						prompt,
						additionalContext,
						temperature,
						maxTokens,
						systemPrompt,
						resourceId,
						threadId,
					},
				});

				if (result.status === 'success') {
					// Simply forward the workflow response to the frontend
					console.log(
						'Sending response',
						JSON.stringify(result.result, null, 2)
					);
					return c.json<ChatOutput>(result.result);
				} else {
					return c.json({ error: `Workflow failed: ${result.status}` }, 500);
				}
			} catch (error) {
				console.error(error);
				return c.json(
					{ error: error instanceof Error ? error.message : 'Internal error' },
					500
				);
			}
		},
	}),
	registerApiRoute('/chat/stream', {
		method: 'POST',
		openapi: {
			requestBody: {
				content: {
					'application/json': {
						schema: toOpenApiSchema(ChatInputSchema),
					},
				},
			},
		},
		handler: async (c) => {
			try {
				const body = await c.req.json();
				const {
					prompt,
					additionalContext,
					temperature,
					maxTokens,
					systemPrompt,
					resourceId,
					threadId,
				} = ChatInputSchema.parse(body);

				return createSSEStream(async (controller) => {
					const run = await chatWorkflow.createRunAsync();
					const result = await run.start({
						inputData: {
							prompt,
							additionalContext,
							temperature,
							maxTokens,
							systemPrompt,
							streamController: controller,
							resourceId,
							threadId,
						},
					});

					if (result.status !== 'success') {
						streamJSONEvent(controller, 'error', {
							type: 'error',
							message: `Workflow failed: ${result.status}`,
						});
						controller.close();
						return;
					}
				});
			} catch (error) {
				console.error(error);
				return c.json(
					{ error: error instanceof Error ? error.message : 'Internal error' },
					500
				);
			}
		},
	}),

	// -------------------- Threads & Messages API --------------------

	// GET /threads – list threads
	registerApiRoute('/threads', {
		method: 'GET',
		openapi: {
			parameters: [
				{
					name: 'userId',
					in: 'query',
					required: false,
					schema: { type: 'string' },
				},
			],
			responses: {
				200: {
					description: 'List of threads',
					content: {
						'application/json': {
							schema: {
								type: 'array',
								items: toOpenApiSchema(ChatThreadSchema),
							},
						},
					},
				},
			},
		},
		handler: async (c) => {
			const mastra = c.get('mastra');
			const storage = mastra.getStorage();

			if (!storage)
				return c.json({ error: 'Storage subsystem not available' }, 500);

			const userId = c.req.query('userId');

			if (!userId) {
				return c.json({ error: 'userId is required' }, 400);
			}

			const threads = await storage.getThreadsByResourceId({
				resourceId: userId,
			});
			const response = threads.map((thread) => ({
				id: thread.id,
				title: thread.title,
				createdAt: thread.createdAt,
				updatedAt: thread.updatedAt,
			}));

			return c.json(response);
		},
	}),

	// GET /threads/:threadId – fetch messages
	registerApiRoute('/threads/:threadId', {
		method: 'GET',
		openapi: {
			parameters: [
				{
					name: 'userId',
					in: 'query',
					required: false,
					schema: { type: 'string' },
				},
			],
			responses: {
				200: {
					description: 'Thread messages',
					content: {
						'application/json': {
							schema: {
								type: 'array',
								items: toOpenApiSchema(ChatMessageSchema),
							},
						},
					},
				},
			},
		},
		handler: async (c) => {
			const mastra = c.get('mastra');
			const memory = mastra.getStorage();

			if (!memory)
				return c.json({ error: 'Memory subsystem not available' }, 500);

			const threadId = c.req.param('threadId');

			if (!threadId) {
				return c.json({ error: 'threadId is required' }, 400);
			}

			try {
				const thread = await memory.getThreadById({ threadId });
				if (!thread) {
					return c.json([]);
				}
				const messages = await mastra.getStorage()?.getMessagesPaginated({
					format: 'v2',
					threadId,
					selectBy: {
						last: 20,
					},
				});

				if (!messages) {
					return c.json([]);
				}

				const response = messages.messages.map((message) => ({
					id: message.id,
					threadId: message.threadId,
					role: message.role,
					content: message.content,
					createdAt: message.createdAt,
				}));

				return c.json(response);
			} catch (err) {
				console.error('Error fetching messages', err);
				return c.json({ error: 'Thread not found' }, 404);
			}
		},
	}),
];

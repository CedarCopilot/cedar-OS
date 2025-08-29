import { ResponseProcessor } from '@/store/agentConnection/AgentConnectionTypes';
import { MessageInput } from '@/store/messages/MessageTypes';
import { CedarStore } from '@/store/CedarOSTypes';
import { z } from 'zod';

// Schema for frontend tool response
export const FrontendToolResponseSchema = z.object({
	type: z.literal('frontendTool'),
	toolName: z.string(),
	args: z.unknown(), // Will be validated by the tool's own schema
});

export type FrontendToolResponse = z.infer<typeof FrontendToolResponseSchema>;

// Frontend tool response processor - executes registered frontend tools
export const frontendToolResponseProcessor: ResponseProcessor<FrontendToolResponse> =
	{
		type: 'frontendTool' as const,
		namespace: 'default',
		execute: async (obj, store) => {
			const { toolName, args } = obj;

			try {
				// Execute the tool
				await store.executeTool(toolName, args);

				// Create a message to show the tool execution
				const toolMessage: MessageInput = {
					type: 'frontendTool',
					role: 'assistant',
					content: `Executed tool: ${toolName}`,
					toolName,
					args,
					status: 'success',
					timestamp: new Date().toISOString(),
				};

				// Add the message to the chat
				store.addMessage(toolMessage);
			} catch (error) {
				console.error(`Error executing frontend tool "${toolName}":`, error);

				// Add an error message
				const errorMessage: MessageInput = {
					type: 'frontendTool',
					role: 'assistant',
					content: `Failed to execute tool: ${toolName}`,
					toolName,
					args,
					error: error instanceof Error ? error.message : String(error),
					status: 'error',
					timestamp: new Date().toISOString(),
				};

				store.addMessage(errorMessage);
			}
		},
		validate: (obj): obj is FrontendToolResponse => {
			try {
				FrontendToolResponseSchema.parse(obj);
				return true;
			} catch {
				return false;
			}
		},
	};

// Helper type for creating typed frontend tool responses
export type FrontendToolResponseFor<ToolName extends string, Args = unknown> = {
	type: 'frontendTool';
	toolName: ToolName;
	args: Args;
};

// Factory function for creating typed frontend tool response processors
export function createFrontendToolResponseProcessor<
	T extends FrontendToolResponse
>(config: {
	namespace?: string;
	toolName?: string;
	beforeExecute?: (obj: T, store: CedarStore) => Promise<void> | void;
	afterExecute?: (obj: T, store: CedarStore) => Promise<void> | void;
}): ResponseProcessor<T> {
	return {
		type: 'frontendTool' as const,
		namespace: config.namespace || 'default',
		execute: async (obj, store) => {
			// Run before hook if provided
			if (config.beforeExecute) {
				await config.beforeExecute(obj as T, store);
			}

			try {
				// Execute the tool
				await store.executeTool(obj.toolName, obj.args);
			} catch {
				const toolMessage: MessageInput = {
					...obj,
					type: 'frontendTool',
					role: 'assistant',
					content: `Failed to execute tool: ${obj.toolName}`,
					status: 'error',
				};

				store.addMessage(toolMessage);
			}

			// Run after hook if provided
			if (config.afterExecute) {
				await config.afterExecute(obj as T, store);
			}

			// Add message
			const toolMessage: MessageInput = {
				...obj,
				type: 'frontendTool',
				role: 'assistant',
				content: `Executed tool: ${obj.toolName}`,
				status: 'success',
				timestamp: new Date().toISOString(),
			};

			store.addMessage(toolMessage);
		},
		validate: (obj): obj is T => {
			// Basic validation
			if (obj.type !== 'frontendTool') return false;
			if (typeof (obj as FrontendToolResponse).toolName !== 'string')
				return false;

			// Additional validation for specific tool if configured
			if (
				config.toolName &&
				(obj as FrontendToolResponse).toolName !== config.toolName
			) {
				return false;
			}

			return true;
		},
	};
}

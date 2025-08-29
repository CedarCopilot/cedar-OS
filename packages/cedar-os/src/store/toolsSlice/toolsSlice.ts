import { z } from 'zod';
import { StateCreator } from 'zustand';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type {
	ToolRegistrationConfig,
	ToolsSlice,
	RegisteredToolBase,
} from './ToolsTypes';

export const createToolsSlice: StateCreator<ToolsSlice> = (set, get) => ({
	// Initial state
	registeredTools: new Map(),

	// Register a new tool
	registerTool: <TArgs>(config: ToolRegistrationConfig<TArgs>) => {
		set((state) => {
			const newTools = new Map(state.registeredTools);
			const toolEntry = {
				execute: config.execute as (args: unknown) => void | Promise<void>,
				argsSchema: config.argsSchema as z.ZodSchema<unknown>,
				description: config.description,
			} as RegisteredToolBase<unknown>;
			newTools.set(config.name, toolEntry);
			return { registeredTools: newTools };
		});
	},

	// Unregister a tool
	unregisterTool: (name: string) => {
		set((state) => {
			const newTools = new Map(state.registeredTools);
			newTools.delete(name);
			return { registeredTools: newTools };
		});
	},

	// Execute a tool with validated arguments
	executeTool: async <TArgs>(name: string, args: TArgs): Promise<void> => {
		const tool = get().registeredTools.get(name);

		if (!tool) {
			console.error(`Tool "${name}" not found`);
			return;
		}

		try {
			// Validate arguments against schema
			const validatedArgs = tool.argsSchema.parse(args);
			await tool.execute(validatedArgs);
		} catch (error) {
			if (error instanceof z.ZodError) {
				console.error(`Validation error for tool "${name}":`, error.errors);
			} else {
				console.error(`Error executing tool "${name}":`, error);
			}
		}
	},

	// Get all registered tools for agent
	getRegisteredTools: () => {
		const tools = get().registeredTools;
		const toolsObject: Record<
			string,
			{
				name: string;
				description?: string;
				argsSchema: Record<string, unknown>;
			}
		> = {};

		tools.forEach((tool, name) => {
			toolsObject[name] = {
				name,
				description: tool.description,
				// Convert Zod schema to JSON schema using zod-to-json-schema library
				argsSchema: zodToJsonSchema(tool.argsSchema, name) as Record<
					string,
					unknown
				>,
			};
		});

		return toolsObject;
	},

	// Clear all tools
	clearTools: () => {
		set({ registeredTools: new Map() });
	},
});

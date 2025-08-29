import { z } from 'zod';
import { StateCreator } from 'zustand';
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
				// Convert Zod schema to JSON schema for agent compatibility
				argsSchema: zodToJsonSchema(tool.argsSchema),
			};
		});

		return toolsObject;
	},

	// Clear all tools
	clearTools: () => {
		set({ registeredTools: new Map() });
	},
});

// Helper function to convert Zod schema to a simplified JSON schema
// This is a basic implementation - you might want to use a library like zod-to-json-schema
function zodToJsonSchema(schema: z.ZodSchema): Record<string, unknown> {
	// This is a simplified version - in production, consider using zod-to-json-schema package
	try {
		// Get the shape if it's an object
		if (schema instanceof z.ZodObject) {
			const shape = schema.shape;
			const properties: Record<string, Record<string, unknown>> = {};

			for (const [key, value] of Object.entries(shape)) {
				properties[key] = {
					type: getZodType(value as z.ZodSchema),
					required: !(value as z.ZodSchema).isOptional(),
				};
			}

			return {
				type: 'object',
				properties,
			};
		}

		// For other types, return a simple type descriptor
		return {
			type: getZodType(schema),
		};
	} catch {
		// Fallback to a generic descriptor
		return { type: 'unknown' };
	}
}

function getZodType(schema: z.ZodSchema): string {
	if (schema instanceof z.ZodString) return 'string';
	if (schema instanceof z.ZodNumber) return 'number';
	if (schema instanceof z.ZodBoolean) return 'boolean';
	if (schema instanceof z.ZodArray) return 'array';
	if (schema instanceof z.ZodObject) return 'object';
	if (schema instanceof z.ZodNull) return 'null';
	if (schema instanceof z.ZodUndefined) return 'undefined';
	return 'unknown';
}

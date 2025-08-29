import { z } from 'zod';

// Type for a frontend tool function
export type ToolFunction<TArgs> = (args: TArgs) => void | Promise<void>;

// Base interface for registered tools - type-erased for storage
export interface RegisteredToolBase<TArgs> {
	// The actual function to execute - accepts unknown args for runtime flexibility
	execute: (args: TArgs) => void | Promise<void>;
	// Zod schema for validating arguments - can validate unknown type
	argsSchema: z.ZodSchema<TArgs>;
	// Optional metadata
	description?: string;
}

// Structure of a registered tool - properly generic for compile-time safety
export interface RegisteredTool<TArgs> {
	// The actual function to execute
	execute: ToolFunction<TArgs>;
	// Zod schema for validating arguments
	argsSchema: z.ZodSchema<TArgs>;
	// Optional metadata
	description?: string;
}

// Map of all registered tools - uses base type for storage flexibility
export type ToolsMap = Map<string, RegisteredToolBase<unknown>>;

// Configuration for registering a tool
export interface ToolRegistrationConfig<TArgs> {
	name: string;
	execute: ToolFunction<TArgs>;
	argsSchema: z.ZodSchema<TArgs>;
	description?: string;
}

// State shape for tools
export interface ToolsState {
	registeredTools: ToolsMap;
}

// Actions for tools
export interface ToolsActions {
	// Register a new tool
	registerTool: <TArgs>(config: ToolRegistrationConfig<TArgs>) => void;
	// Unregister a tool
	unregisterTool: (name: string) => void;
	// Execute a tool with validated arguments
	executeTool: <TArgs>(name: string, args: TArgs) => Promise<void>;
	// Get all registered tools (for passing to agent)
	getRegisteredTools: () => Record<
		string,
		{
			name: string;
			description?: string;
			argsSchema: Record<string, unknown>; // Will be serialized for agent
		}
	>;
	// Clear all tools
	clearTools: () => void;
}

// Combined slice type
export type ToolsSlice = ToolsState & ToolsActions;

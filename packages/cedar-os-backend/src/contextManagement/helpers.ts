import { AdditionalContextParam, BackendContextEntry } from '@/types';
import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

// Export all types and functions for TypeScript module resolution

// ================= CONTEXT MANAGEMENT UTILITIES =================

/**
 * Interface for context key definitions
 * Defines how context keys are described and formatted
 */
export interface ContextKeyDefinition {
	key: string;
	description: string;
	formatter: (data: BackendContextEntry<any>[]) => string;
}

/**
 * Generate context keys with manual override support
 * Manual definitions take precedence over auto-generated ones
 */
export function generateContextKeysFromAdditionalContext(
	additionalContext?: AdditionalContextParam<any>,
	manualOverrides: Record<string, ContextKeyDefinition> = {}
): Record<string, ContextKeyDefinition> {
	// Start with manual definitions (existing overrides)
	const contextKeys: Record<string, ContextKeyDefinition> = {
		...manualOverrides,
	};

	if (!additionalContext) {
		return contextKeys;
	}

	// Auto-generate missing context keys from available data
	Object.keys(additionalContext).forEach((key) => {
		// Skip internal Cedar-OS fields
		if (['frontendTools', 'stateSetters', 'schemas'].includes(key)) {
			return;
		}

		// Only auto-generate if not manually defined
		if (!contextKeys[key] && Array.isArray(additionalContext[key])) {
			// Get description from schema if available, otherwise use key name
			const schema = additionalContext.schemas?.[key];
			const description =
				schema &&
				typeof schema === 'object' &&
				'description' in schema &&
				typeof schema.description === 'string'
					? schema.description
					: `Context data for ${key}`;

			contextKeys[key] = {
				key,
				description,
				formatter: generateFormatterForContextKey(key),
			};
		}
	});

	return contextKeys;
}

/**
 * Generate simple formatter function for context data
 * Just stringifies the context key data directly
 */
function generateFormatterForContextKey(
	contextKey: string
): (data: BackendContextEntry<any>[]) => string {
	return (data: BackendContextEntry<any>[]) => {
		if (!data || data.length === 0) {
			return `No ${contextKey} available in current context.`;
		}

		return `${contextKey}:\n${JSON.stringify(data, null, 2)}`;
	};
}

/**
 * Generate context summary for agent instructions
 * If no additionalContext is provided, uses static manualOverrides for backward compatibility
 */
export function generateContextKeysSummary(
	additionalContext?: AdditionalContextParam<any>,
	manualOverrides: Record<string, ContextKeyDefinition> = {}
): string {
	const contextKeys = generateContextKeysFromAdditionalContext(
		additionalContext,
		manualOverrides
	);

	const keyDescriptions = Object.entries(contextKeys)
		.map(([key, info]) => `- ${key}: ${info.description}`)
		.join('\n');

	return `Available context keys (use requestAdditionalContextTool to access):
${keyDescriptions}

Note: Context is only retrieved when you explicitly request it to keep responses efficient.
Use the requestAdditionalContextTool when you need specific context to complete a task.`;
}

// ================= TOOL GENERATION UTILITIES =================

/**
 * Helper function to create a backend tool for a frontend tool
 * Users can call this for each frontend tool they want to support
 */
export function createMastraToolForFrontendTool(
	frontendToolName: string,
	inputSchema: z.ZodTypeAny,
	options: {
		description?: string;
		toolId?: string;
		streamEventFn: (controller: any, event: string, data: any) => void;
		errorSchema?: z.ZodTypeAny;
	}
): ReturnType<typeof createTool> {
	const toolId = options.toolId || `${kebabCase(frontendToolName)}-tool`;

	// Default error schema if not provided
	const defaultErrorSchema = z.object({
		error: z.string(),
		recommendedAction: z.string().optional(),
	});

	const errorSchema = options.errorSchema || defaultErrorSchema;

	return createTool({
		id: toolId,
		description:
			options.description || `Execute ${frontendToolName} on the frontend`,

		inputSchema,

		outputSchema: z
			.object({
				success: z.boolean(),
				message: z.string(),
				toolName: z.string(),
			})
			.or(errorSchema),

		execute: async ({ context, runtimeContext }) => {
			const streamController = runtimeContext?.get('streamController') as
				| ReadableStreamDefaultController<Uint8Array>
				| undefined;

			// Stream to frontend with exact tool name and arguments
			if (streamController) {
				options.streamEventFn(streamController, 'frontendTool', {
					type: 'frontendTool',
					toolName: frontendToolName, // Must match frontend tool name exactly
					args: context, // Pass through all arguments
				});
			}

			return {
				success: true,
				message: `Successfully executed ${frontendToolName}`,
				toolName: frontendToolName,
			};
		},
	});
}

/**
 * Utility function to convert camelCase to kebab-case
 */
export function kebabCase(str: string): string {
	return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// ================= TOOL REGISTRY UTILITIES =================

/**
 * Get all registered tool IDs from all categories in a registry
 */
export function getRegisteredToolIds(
	toolRegistry: Record<string, Record<string, any>>
): string[] {
	const toolIds: string[] = [];
	Object.values(toolRegistry).forEach((category) => {
		toolIds.push(...Object.keys(category));
	});
	return toolIds;
}

/**
 * Get all tools as a flat object for agent usage
 */
export function getAllTools(
	toolRegistry: Record<string, Record<string, any>>
): Record<string, any> {
	const allTools: Record<string, any> = {};
	Object.values(toolRegistry).forEach((category) => {
		Object.assign(allTools, category);
	});
	return allTools;
}

/**
 * Generate tool descriptions for agent instructions
 */
export function generateToolDescriptions(
	toolRegistry: Record<string, Record<string, any>>,
	toolIds?: string[]
): string {
	const allTools = getAllTools(toolRegistry);
	const toolsToDescribe = toolIds || Object.keys(allTools);

	const descriptions = toolsToDescribe
		.filter((toolId) => allTools[toolId]) // Only include registered tools
		.map((toolId) => {
			const tool = allTools[toolId];
			return `- ${toolId}: ${tool.description || 'No description available'}`;
		});

	return descriptions.join('\n');
}

/**
 * Generate categorized tool descriptions directly from registry structure
 */
export function generateCategorizedToolDescriptions(
	toolRegistry: Record<string, Record<string, any>>,
	categoryNames: Record<string, string> = {}
): string {
	const sections: string[] = [];

	// Generate sections for each category
	Object.entries(toolRegistry).forEach(([categoryKey, tools]) => {
		const categoryName = categoryNames[categoryKey] || categoryKey;
		const toolDescriptions = Object.entries(tools).map(([toolId, tool]) => {
			return `- ${toolId}: ${tool.description || 'No description available'}`;
		});

		if (toolDescriptions.length > 0) {
			sections.push(`${categoryName}:\n${toolDescriptions.join('\n')}`);
		}
	});

	return sections.join('\n\n');
}

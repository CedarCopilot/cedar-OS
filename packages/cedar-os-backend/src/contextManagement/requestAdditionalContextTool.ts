import { z } from 'zod';

import { createTool } from '@mastra/core/tools';
import { AdditionalContextParam } from '@/types';
import {
	generateContextKeysFromAdditionalContext,
	ContextKeyDefinition,
} from '@/contextManagement/helpers';
import { BackendContextEntry } from '@/types';

// Partial context key definition with optional formatter
export interface PartialContextKeyDefinition {
	key: string;
	description: string;
	formatter?: (data: BackendContextEntry<unknown>[]) => string;
}

// Flexible key configuration options
export interface AvailableKeysConfig {
	include?: string[]; // Only include these keys from additionalContext
	exclude?: string[]; // Exclude these keys from additionalContext
	overrides?: Record<string, PartialContextKeyDefinition>; // Custom definitions for specific keys
}

// Configuration interface for customizable tool creation
export interface RequestAdditionalContextConfig {
	toolId?: string;
	toolDescription?: string;
	availableKeys?: AvailableKeysConfig;
	inputSchema?: z.ZodTypeAny;
	outputSchema?: z.ZodTypeAny;
}

// Helper function to create default formatter
function createDefaultFormatter(
	contextKey: string
): (data: BackendContextEntry<unknown>[]) => string {
	return (data: BackendContextEntry<unknown>[]) => {
		if (!data || data.length === 0) {
			return `No ${contextKey} available in current context.`;
		}
		return `${contextKey}:\n${JSON.stringify(data, null, 2)}`;
	};
}

// Helper function to ensure all context keys have formatters
function ensureFormatters(
	partialKeys: Record<string, PartialContextKeyDefinition>
): Record<string, ContextKeyDefinition> {
	const completeKeys: Record<string, ContextKeyDefinition> = {};

	for (const [key, definition] of Object.entries(partialKeys)) {
		completeKeys[key] = {
			...definition,
			formatter: definition.formatter || createDefaultFormatter(key),
		};
	}

	return completeKeys;
}

// Helper function to process available keys configuration
function processAvailableKeysConfig(
	keysConfig: AvailableKeysConfig,
	additionalContext?: AdditionalContextParam<Record<string, z.ZodTypeAny>>
): Record<string, ContextKeyDefinition> {
	// Start with auto-generated keys from context
	const autoKeys = generateContextKeysFromAdditionalContext(additionalContext);
	let resultKeys: Record<string, ContextKeyDefinition> = {};

	if (keysConfig.include) {
		// Only include specified keys
		for (const key of keysConfig.include) {
			if (autoKeys[key]) {
				resultKeys[key] = autoKeys[key];
			}
		}
	} else {
		// Include all auto-generated keys
		resultKeys = { ...autoKeys };
	}

	if (keysConfig.exclude) {
		// Remove excluded keys
		for (const key of keysConfig.exclude) {
			delete resultKeys[key];
		}
	}

	if (keysConfig.overrides) {
		// Apply overrides (with default formatters if needed)
		const processedOverrides = ensureFormatters(keysConfig.overrides);
		resultKeys = { ...resultKeys, ...processedOverrides };
	}

	return resultKeys;
}

// Default schemas (can be overridden)
export const RequestAdditionalContextInputSchema = z.object({
	contextKey: z.string().describe('Context key to retrieve and format'),
	reason: z
		.string()
		.optional()
		.describe('Optional reason for requesting this context (for logging)'),
});

export const RequestAdditionalContextOutputSchema = z.object({
	success: z.boolean(),
	contextData: z
		.string()
		.describe('Formatted context data for the requested key'),
	contextKey: z.string().describe('The context key that was requested'),
	availableKeys: z.array(z.string()).describe('All available context keys'),
	message: z.string().describe('Summary of what context was retrieved'),
	error: z.string().optional().describe('Error message if the request failed'),
	recommendedAction: z
		.string()
		.optional()
		.describe('Recommended action if the request failed'),
});

// Factory function to create customizable request additional context tool
export function createRequestAdditionalContextTool(
	config: RequestAdditionalContextConfig = {}
): ReturnType<typeof createTool> {
	const {
		toolId = 'request-additional-context',
		toolDescription = 'Request and format specific context data from Cedar-OS (library items, diagram state, selections, etc.)',
		availableKeys: customAvailableKeys,
		inputSchema,
		outputSchema = RequestAdditionalContextOutputSchema,
	} = config;

	// Generate enum schema if possible, otherwise use default
	const finalInputSchema =
		inputSchema ||
		(customAvailableKeys
			? createEnumSchemaFromConfig(customAvailableKeys)
			: null) ||
		RequestAdditionalContextInputSchema;

	return createTool({
		id: toolId,
		description: toolDescription,
		inputSchema: finalInputSchema,
		outputSchema,

		execute: async ({ context, runtimeContext }) => {
			const { contextKey, reason } = context;

			const additionalContext = runtimeContext?.get(
				'additionalContext'
			) as AdditionalContextParam<Record<string, z.ZodTypeAny>>;

			// Process available keys based on configuration
			const availableKeys = customAvailableKeys
				? processAvailableKeysConfig(customAvailableKeys, additionalContext)
				: generateContextKeysFromAdditionalContext(additionalContext);

			if (!additionalContext) {
				return {
					success: false,
					contextData: 'No additional context available from Cedar-OS',
					contextKey,
					availableKeys: Object.keys(availableKeys),
					message: 'No additional context available from Cedar-OS',
				};
			}

			// Validate requested context key exists
			if (!availableKeys[contextKey]) {
				return {
					success: false,
					contextData: '',
					contextKey,
					availableKeys: Object.keys(availableKeys),
					message: `Context key '${contextKey}' not available`,
					error: `Context key '${contextKey}' not available`,
					recommendedAction: `Use one of the available context keys: ${Object.keys(
						availableKeys
					).join(', ')}`,
				};
			}

			// Use formatter from available keys
			try {
				const rawData = additionalContext[contextKey];
				const dataArray = Array.isArray(rawData)
					? rawData
					: rawData
					? [rawData]
					: [];
				const contextData = availableKeys[contextKey].formatter(dataArray);

				return {
					success: true,
					contextData,
					contextKey,
					availableKeys: Object.keys(availableKeys),
					message: `Retrieved and formatted context for: ${contextKey}${
						reason ? ` (Reason: ${reason})` : ''
					}`,
				};
			} catch (error) {
				return {
					success: false,
					contextData: '',
					contextKey,
					availableKeys: Object.keys(availableKeys),
					message: `Error formatting ${contextKey}`,
					error: `Error formatting ${contextKey}: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`,
					recommendedAction:
						'Try requesting a different context key or check the data format',
				};
			}
		},
	});
}

// Helper function to create enum schema from static key configuration
function createEnumSchemaFromConfig(
	keysConfig: AvailableKeysConfig
): z.ZodTypeAny | null {
	// We can only create enum schema if we have explicit include list or overrides
	// (exclude alone doesn't tell us what keys will be available)
	const explicitKeys: string[] = [];
	const descriptions: Record<string, string> = {};

	if (keysConfig.include) {
		explicitKeys.push(...keysConfig.include);
	}

	if (keysConfig.overrides) {
		explicitKeys.push(...Object.keys(keysConfig.overrides));
		// Add descriptions from overrides
		Object.entries(keysConfig.overrides).forEach(([key, def]) => {
			descriptions[key] = def.description;
		});
	}

	// Remove duplicates and excluded keys
	const uniqueKeys = [...new Set(explicitKeys)];
	const finalKeys = keysConfig.exclude
		? uniqueKeys.filter((key) => !keysConfig.exclude!.includes(key))
		: uniqueKeys;

	if (finalKeys.length === 0) {
		return null; // Can't create enum schema
	}

	// Create description text
	const keyDescriptions = finalKeys
		.map((key) => `${key}: ${descriptions[key] || `Context data for ${key}`}`)
		.join(', ');

	return z.object({
		contextKey: z
			.enum(finalKeys as [string, ...string[]])
			.describe(`Context key to retrieve. Available keys: ${keyDescriptions}`),
		reason: z
			.string()
			.optional()
			.describe('Optional reason for requesting this context (for logging)'),
	});
}

// Default export using factory with no customization
export const requestAdditionalContextTool =
	createRequestAdditionalContextTool();

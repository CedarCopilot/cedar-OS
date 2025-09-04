import { z } from 'zod';

import { createTool, type Tool } from '@mastra/core/tools';
import { AdditionalContextParam } from '@/types';
import { generateContextKeysFromAdditionalContext } from '@/contextManagement/helpers';

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

export const requestAdditionalContextTool: ReturnType<typeof createTool> = createTool({
	id: 'request-additional-context',
	description:
		'Request and format specific context data from Cedar-OS (library items, diagram state, selections, etc.)',

	inputSchema: RequestAdditionalContextInputSchema,
	outputSchema: RequestAdditionalContextOutputSchema,

	execute: async ({ context, runtimeContext }) => {
		const { contextKey, reason } = context;

		const additionalContext = runtimeContext?.get(
			'additionalContext'
		) as AdditionalContextParam<any>;

		// Get available context keys (auto-generated only, no overrides)
		const availableKeys =
			generateContextKeysFromAdditionalContext(additionalContext);

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

		// Use auto-generated formatter
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

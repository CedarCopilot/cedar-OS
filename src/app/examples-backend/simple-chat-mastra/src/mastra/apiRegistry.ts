import { registerApiRoute } from '@mastra/core/server';
import { chatAgent } from './agents';
import { z } from 'zod';

// Basic chat schema
const ChatRequestSchema = z.object({
	prompt: z.string(),
	temperature: z.number().optional(),
	maxTokens: z.number().optional(),
	systemPrompt: z.string().optional(),
});

export const apiRoutes = [
	registerApiRoute('/chat/execute-function', {
		method: 'POST',
		handler: async (c) => {
			try {
				const body = await c.req.json();
				const { prompt, temperature, maxTokens, systemPrompt } =
					ChatRequestSchema.parse(body);

				const messages = [
					...(systemPrompt
						? [{ role: 'system', content: systemPrompt } as const]
						: []),
					{ role: 'user' as const, content: prompt },
				];

				const response = await chatAgent.generate(messages, {
					temperature,
					maxTokens,
				});

				return c.json({ text: response.text, usage: response.usage });
			} catch (error) {
				console.error(error);
				return c.json(
					{ error: error instanceof Error ? error.message : 'Internal error' },
					500
				);
			}
		},
	}),
];

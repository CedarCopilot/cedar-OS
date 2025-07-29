import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';

// Minimal chat agent using OpenAI
export const chatAgent = new Agent({
	name: 'Simple Chat Agent',
	// @ts-expect-error - MastraLanguageModel is not typed
	model: openai.chat('gpt-4o'),
	instructions: 'You are a helpful assistant.',
});

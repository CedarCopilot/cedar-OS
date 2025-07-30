// Enhanced stream parser that handles both text chunks and JSON objects
// Separates parsing logic from application handler logic

import type { StreamHandler } from './types';

export interface StreamHandlers {
	handleChunk: (chunk: string) => void;
	handleObject: (obj: object) => void;
	handleComplete: (completedItems: (string | object)[]) => void;
}

// Process raw content chunks (handle newlines, encoding, etc.)
const processContentChunk = (rawChunk: string): string => {
	// Handle newline replacement - convert escaped newlines and actual newlines to proper newlines
	return rawChunk.replace(/(\\n|\n)/g, '\n');
};

// Common default stream handlers factory for providers
export const createDefaultStreamHandlers = (
	handler: StreamHandler,
	providerName: string = 'unknown'
): StreamHandlers => ({
	handleChunk: (chunk: string) => {
		// Pass through to original handler
		handler({ type: 'chunk', content: chunk });
	},

	handleObject: (obj: object) => {
		// Call the handler with object type
		handler({ type: 'object', object: obj });

		// Handle message type objects for backward compatibility (primarily for Mastra)
		if (
			obj &&
			typeof obj === 'object' &&
			'type' in obj &&
			obj.type === 'message'
		) {
			const messageContent =
				'content' in obj && typeof obj.content === 'string'
					? obj.content
					: JSON.stringify(obj);
			handler({ type: 'chunk', content: messageContent });
		}
	},

	handleComplete: (completedItems: (string | object)[]) => {
		// Call the original done handler
		handler({ type: 'done' });

		// Log completed messages for debugging
		console.log(`${providerName} stream completed with items:`, completedItems);
	},
});

export async function handleEventStream(
	response: Response,
	handlers: StreamHandlers
): Promise<void> {
	if (!response.ok || !response.body) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const completedItems: (string | object)[] = [];
	let currentTextMessage = '';

	const parseSSEEvent = (raw: string) => {
		let eventType = 'message';
		let data = '';

		for (const line of raw.split('\n')) {
			if (line.startsWith('event:')) {
				eventType = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				data += line.slice(5);
			}
		}

		return { eventType, data };
	};

	const processDataContent = (data: string) => {
		console.log('data', data, data.length);
		// Handle special completion markers
		if (data.trim() === '[DONE]' || data.trim() === 'done') {
			return;
		}

		// Try to parse as JSON first
		try {
			const parsed = JSON.parse(data);

			// Handle OpenAI format: {"choices": [{"delta": {...}}]}
			if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
				const delta = parsed.choices[0].delta;

				// Handle text content
				if (delta.content) {
					const processedContent = processContentChunk(delta.content);
					currentTextMessage += processedContent;
					handlers.handleChunk(processedContent);
				}

				// Handle structured data (tool calls, function calls) - but skip role-only deltas
				if (delta.tool_calls || delta.function_call) {
					// Finalize current text message before object
					if (currentTextMessage.trim()) {
						completedItems.push(currentTextMessage.trim());
						currentTextMessage = '';
					}
					handlers.handleObject(delta);
					completedItems.push(delta);
				}

				// Handle empty delta (completion)
				if (Object.keys(delta).length === 0) {
					return;
				}
			}
			// Handle Mastra/custom format: {"type": "...", "data": {...}}
			else if (parsed.type) {
				// Finalize current text message before object
				if (currentTextMessage.trim()) {
					completedItems.push(currentTextMessage.trim());
					currentTextMessage = '';
				}
				handlers.handleObject(parsed);
				completedItems.push(parsed);
			}
			// Handle direct content format: {"content": "..."}
			else if (parsed.content) {
				const processedContent = processContentChunk(parsed.content);
				currentTextMessage += processedContent;
				handlers.handleChunk(processedContent);
			}
			// Handle any other JSON object
			else {
				// Finalize current text message before object
				if (currentTextMessage.trim()) {
					completedItems.push(currentTextMessage.trim());
					currentTextMessage = '';
				}
				handlers.handleObject(parsed);
				completedItems.push(parsed);
			}
		} catch {
			// Not JSON, treat as plain text - but skip completion markers
			if (data.trim() && data !== '[DONE]' && data !== 'done') {
				const processedContent = processContentChunk(data);
				currentTextMessage += processedContent;
				handlers.handleChunk(processedContent);
			}
		}
	};

	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });

			// Process complete SSE events (delimited by \n\n)
			let eventBoundary: number;
			while ((eventBoundary = buffer.indexOf('\n\n')) !== -1) {
				const rawEvent = buffer.slice(0, eventBoundary);
				buffer = buffer.slice(eventBoundary + 2);

				if (!rawEvent.trim()) continue;

				const { eventType, data } = parseSSEEvent(rawEvent);

				if (eventType.trim() === 'done' || data.trim() === '[DONE]') {
					// Stream completion
					break;
				} else {
					processDataContent(data);
				}
			}
		}

		// Add any final accumulated text message
		if (currentTextMessage.trim()) {
			completedItems.push(currentTextMessage.trim());
		}

		// Call completion handler with the completed items array
		handlers.handleComplete(completedItems);
	} catch (error) {
		console.error('Error in handleEventStream:', error);
		throw error;
	}
}

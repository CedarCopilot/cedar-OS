/**
 * Enhanced Server-Sent Events (SSE) stream parser
 *
 * This function handles parsing of streaming responses from various LLM providers:
 * - OpenAI: Uses delta format with choices array
 * - Mastra: Uses custom object types
 * - Raw text: Plain text chunks
 *
 * Key responsibilities:
 * 1. Parse SSE format (data: content\n\n)
 * 2. Handle mixed text/JSON content streams
 * 3. Accumulate text messages and track completed items
 * 4. Call handler immediately for real-time processing
 * 5. Provide completion summary with all items
 */

import type { StreamHandler } from './types';

/**
 * Process raw content chunks to handle encoding and newlines
 * Converts escaped newlines (\n) and actual newlines to proper line breaks
 */
const processContentChunk = (rawChunk: string): string => {
	return rawChunk.replace(/(\\n|\n)/g, '\n');
};

/**
 * Main SSE stream handler - processes Server-Sent Events from LLM providers
 *
 * @param response - HTTP Response object with streaming body
 * @param handler - StreamHandler to call for each parsed event (chunk, object, done, error)
 */
export async function handleEventStream(
	response: Response,
	handler: StreamHandler
): Promise<void> {
	if (!response.ok || !response.body) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	// Set up streaming infrastructure
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';
	const completedItems: (string | object)[] = []; // Track all processed items for completion logging
	let currentTextMessage = ''; // Accumulate text chunks into messages

	/**
	 * Parse Server-Sent Event format
	 * Standard SSE format: "event: type\ndata: content\n\n"
	 * Most providers only use the data field
	 */
	const parseSSEEvent = (raw: string) => {
		let eventType = 'message';
		let data = '';

		for (const line of raw.split('\n')) {
			if (line.startsWith('event:')) {
				eventType = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				data += line.slice(5); // Note: preserves leading space after 'data:'
			}
		}

		return { eventType, data };
	};

	/**
	 * Process the data content from SSE events
	 * Handles multiple content formats:
	 * 1. OpenAI delta format: {"choices": [{"delta": {"content": "text"}}]}
	 * 2. Custom object format: {"type": "action", "data": {...}}
	 * 3. Direct content: {"content": "text"}
	 * 4. Plain text: raw string content
	 */
	const processDataContent = (data: string) => {
		// Skip completion markers that signal end of stream
		if (data.trim() === '[DONE]' || data.trim() === 'done') {
			return;
		}

		// Attempt JSON parsing first (most common case)
		try {
			const parsed = JSON.parse(data);

			// OpenAI format: {"choices": [{"delta": {...}}]}
			if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
				const delta = parsed.choices[0].delta;

				// Process text content from delta
				if (delta.content) {
					const processedContent = processContentChunk(delta.content);
					currentTextMessage += processedContent;
					handler({ type: 'chunk', content: processedContent });
				}

				// Process structured data (tool calls, function calls)
				// Skip role-only deltas which don't contain actual content
				if (delta.tool_calls || delta.function_call) {
					// Save any accumulated text before processing object
					if (currentTextMessage.trim()) {
						completedItems.push(currentTextMessage.trim());
						currentTextMessage = '';
					}
					handler({ type: 'object', object: delta });
					completedItems.push(delta);
				}

				// Empty delta indicates completion for some providers
				if (Object.keys(delta).length === 0) {
					return;
				}
			}
			// Mastra/custom format: {"type": "action", "data": {...}}
			else if (parsed.type) {
				// Save accumulated text before processing object
				if (currentTextMessage.trim()) {
					completedItems.push(currentTextMessage.trim());
					currentTextMessage = '';
				}
				handler({ type: 'object', object: parsed });
				completedItems.push(parsed);
			}
			// Direct content format: {"content": "text content"}
			else if (parsed.content) {
				const processedContent = processContentChunk(parsed.content);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
			}
			// Generic JSON object (fallback)
			else {
				// Save accumulated text before processing object
				if (currentTextMessage.trim()) {
					completedItems.push(currentTextMessage.trim());
					currentTextMessage = '';
				}
				handler({ type: 'object', object: parsed });
				completedItems.push(parsed);
			}
		} catch {
			// Not valid JSON, treat as plain text content
			if (data.trim() && data !== '[DONE]' && data !== 'done') {
				const processedContent = processContentChunk(data);
				currentTextMessage += processedContent;
				handler({ type: 'chunk', content: processedContent });
			}
		}
	};

	try {
		// Main streaming loop - read and process SSE events
		while (true) {
			const { value, done } = await reader.read();
			if (done) break;

			// Decode bytes to string and add to buffer
			buffer += decoder.decode(value, { stream: true });

			// Process complete SSE events (delimited by \n\n)
			let eventBoundary: number;
			while ((eventBoundary = buffer.indexOf('\n\n')) !== -1) {
				const rawEvent = buffer.slice(0, eventBoundary);
				buffer = buffer.slice(eventBoundary + 2);

				if (!rawEvent.trim()) continue; // Skip empty events

				const { eventType, data } = parseSSEEvent(rawEvent);

				// Check for stream completion signals
				if (eventType.trim() === 'done' || data.trim() === '[DONE]') {
					break;
				} else {
					processDataContent(data);
				}
			}
		}

		// Finalize any remaining accumulated text
		if (currentTextMessage.trim()) {
			completedItems.push(currentTextMessage.trim());
		}

		// Signal completion with summary of all processed items
		handler({ type: 'done', completedItems });
	} catch (error) {
		handler({ type: 'error', error: error as Error });
		throw error;
	}
}

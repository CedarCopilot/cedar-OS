// It reads from the response body and dispatches parsed events to the provided handlers.
// Shared helper to process an SSE response
// The helper is used by any function that needs to consume a text/event-stream response.

type StreamHandlers = {
	onMessage: (chunk: string) => void;
	// onSuggestions: (s: ChatSuggestion[]) => void;
	onDone: () => void;
	onDebug?: (payload: unknown) => void;
};

async function handleEventStream(
	response: Response,
	handlers: StreamHandlers
): Promise<void> {
	if (!response.ok || !response.body) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	const parseEvent = (raw: string) => {
		let eventType = 'message';
		let data = '';
		for (const line of raw.split('\n')) {
			if (line.startsWith('event:')) {
				eventType = line.slice(6).trim();
			} else if (line.startsWith('data:')) {
				data +=
					eventType === 'suggestion' ? line.slice(5) + ' ' : line.slice(5);
			}
		}
		return { eventType, data } as { eventType: string; data: string };
	};

	while (true) {
		const { value, done } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		let idx: number;
		while ((idx = buffer.indexOf('\n\n')) !== -1) {
			const rawEvent = buffer.slice(0, idx);
			buffer = buffer.slice(idx + 2);
			if (!rawEvent.trim()) continue;
			const { eventType, data } = parseEvent(rawEvent);

			if (eventType === 'done') {
				await handlers.onDone();
				return;
			} else {
				handlers.onMessage(data);
			}
		}
	}
}

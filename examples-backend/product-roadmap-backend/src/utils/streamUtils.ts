// ------------------- Functions for Data-Only SSE Format -------------------

/**
 * Uses SSE data-only format.
 * Only uses 'event: done' with empty data for completion.
 * All other content goes through 'data:' field only.
 */
export function createSSEStream(
	cb: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>
): Response {
	const encoder = new TextEncoder();

	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			try {
				await cb(controller);
				// Signal completion with empty data
				controller.enqueue(encoder.encode('event: done\n'));
				controller.enqueue(encoder.encode('data:\n\n'));
			} catch (err) {
				console.error('Error during SSE stream', err);

				const message = err instanceof Error ? err.message : 'Internal error';
				controller.enqueue(encoder.encode('data: '));
				controller.enqueue(
					encoder.encode(`${JSON.stringify({ type: 'error', message })}\n\n`)
				);
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
}

/**
 * Emit any JSON object as a data event.
 * Used for actions, tool responses, custom events, etc.
 */
export function streamJSONEvent<T>(
	controller: ReadableStreamDefaultController<Uint8Array>,
	eventName: string,
	eventData: T
) {
	const encoder = new TextEncoder();
	controller.enqueue(encoder.encode('data: '));
	controller.enqueue(encoder.encode(`${JSON.stringify(eventData)}\n\n`));
}

/**
 * Handles streaming of text chunks to SSE controller for Mastra's streamVNext compatibility
 *
 * @param streamResult - The StreamTextResult from an AI agent
 * @param streamController - Optional SSE stream controller
 * @returns Promise<string> - The complete response text
 */
export async function handleTextStreamV2(
	chunk: string,
	streamController: ReadableStreamDefaultController<Uint8Array>
): Promise<string> {
	const encoder = new TextEncoder();

	// Escape literal newlines for SSE compliance
	const escaped = chunk.replace(/\n/g, '\\n');
	streamController.enqueue(encoder.encode(`data:${escaped}\n\n`));

	return chunk;
}

// ------------------- Voice-Specific Event Types -------------------

/**
 * Voice transcription result event.
 * Sent at the beginning of voice streams to show what was heard.
 */
export interface TranscriptionEvent {
	type: 'transcription';
	transcription: string;
}

/**
 * Audio output event.
 * Contains base64-encoded audio data for voice responses.
 */
export interface AudioEvent {
	type: 'audio';
	audioData: string; // base64 encoded
	audioFormat: 'audio/mpeg';
	content: string; // original text that was spoken
}

/**
 * Generate audio from provided text using a speak function and emit an 'audio' event via SSE.
 * The speak function should return a NodeJS.ReadableStream of audio data.
 */
export async function streamAudioFromText(
	controller: ReadableStreamDefaultController<Uint8Array>,
	// Accept either Node.js Readable or Web ReadableStream for broader compatibility
	speakFn: (
		text: string,
		options?: Record<string, unknown>
	) => Promise<NodeJS.ReadableStream | ReadableStream>,
	text: string,
	options: { voice?: string; speed?: number; eventType?: string } = {}
) {
	const { voice = 'alloy', speed = 1.0, eventType = 'audio' } = options;
	const speechStream = await speakFn(text, { voice, speed });

	// Convert stream to buffer for response (support Web ReadableStream and Node Readable)
	let audioResponse: Buffer;
	if (typeof (speechStream as ReadableStream).getReader === 'function') {
		// Web ReadableStream
		const reader = (speechStream as ReadableStream).getReader();
		const parts: Uint8Array[] = [];
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			if (value) parts.push(value);
		}
		audioResponse = Buffer.concat(parts.map((u8) => Buffer.from(u8)));
	} else {
		// Node Readable
		const chunks: Buffer[] = [];
		for await (const chunk of speechStream as unknown as NodeJS.ReadableStream) {
			chunks.push(Buffer.from(chunk as Buffer));
		}
		audioResponse = Buffer.concat(chunks);
	}

	streamJSONEvent(controller, eventType, {
		type: eventType as 'audio',
		audioData: audioResponse.toString('base64'),
		audioFormat: 'audio/mpeg',
		content: text,
	});
}

import { OpenAIVoice } from '@mastra/voice-openai';
import { streamAudioFromText } from '../utils/streamUtils';

export const voiceProvider = new OpenAIVoice({
	speechModel: { apiKey: process.env.OPENAI_API_KEY!, name: 'tts-1' },
	listeningModel: {
		apiKey: process.env.OPENAI_API_KEY!,
		name: 'whisper-1',
	},
});

export function createSpeakFunction() {
	return (t: string, options?: Record<string, unknown>) =>
		voiceProvider.speak(
			t,
			options as { speaker?: string; speed?: number }
		) as unknown as Promise<ReadableStream>;
}

export async function handleVoiceOutput(
	streamController: ReadableStreamDefaultController<Uint8Array>,
	pendingText: string,
	options: { voice?: string; speed?: number; eventType?: string } = {}
) {
	if (!pendingText) return;

	const speakFn = createSpeakFunction();
	await streamAudioFromText(streamController, speakFn, pendingText, {
		voice: 'alloy',
		speed: 1.0,
		eventType: 'audio',
		...options,
	});
}

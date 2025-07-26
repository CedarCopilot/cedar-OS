import { StateCreator } from 'zustand';
import type { CedarStore } from '../types';

export interface VoiceState {
	// Voice state
	isVoiceEnabled: boolean;
	isListening: boolean;
	isSpeaking: boolean;
	voiceEndpoint: string;
	voicePermissionStatus: 'granted' | 'denied' | 'prompt' | 'not-supported';
	audioStream: MediaStream | null;
	audioContext: AudioContext | null;
	mediaRecorder: MediaRecorder | null;
	voiceError: string | null;

	// Voice settings
	voiceSettings: {
		language: string;
		voiceId?: string;
		pitch?: number;
		rate?: number;
		volume?: number;
		useBrowserTTS?: boolean;
		autoAddToMessages?: boolean; // New setting to control message integration
	};
}

export interface VoiceActions {
	// Permission management
	requestVoicePermission: () => Promise<void>;
	checkVoiceSupport: () => boolean;

	// Voice control
	startListening: () => Promise<void>;
	stopListening: () => void;
	toggleVoice: () => void;

	// Audio streaming
	streamAudioToEndpoint: (audioData: Blob) => Promise<void>;
	playAudioResponse: (audioUrl: string | ArrayBuffer) => Promise<void>;

	// Settings
	setVoiceEndpoint: (endpoint: string) => void;
	updateVoiceSettings: (settings: Partial<VoiceState['voiceSettings']>) => void;

	// State management
	setVoiceError: (error: string | null) => void;
	resetVoiceState: () => void;
}

export type VoiceSlice = VoiceState & VoiceActions;

const initialVoiceState: VoiceState = {
	isVoiceEnabled: false,
	isListening: false,
	isSpeaking: false,
	voiceEndpoint: 'http://localhost:4111/chat/voice-execute', // Default endpoint
	voicePermissionStatus: 'prompt',
	audioStream: null,
	audioContext: null,
	mediaRecorder: null,
	voiceError: null,
	voiceSettings: {
		language: 'en-US',
		pitch: 1.0,
		rate: 1.0,
		volume: 1.0,
		useBrowserTTS: false,
		autoAddToMessages: true, // Default to true for automatic message integration
	},
};

export const createVoiceSlice: StateCreator<CedarStore, [], [], VoiceSlice> = (
	set,
	get
) => ({
	...initialVoiceState,

	checkVoiceSupport: () => {
		if (typeof window === 'undefined') return false;
		return !!(
			navigator.mediaDevices &&
			typeof navigator.mediaDevices.getUserMedia === 'function' &&
			window.MediaRecorder &&
			window.AudioContext
		);
	},

	requestVoicePermission: async () => {
		try {
			if (!get().checkVoiceSupport()) {
				set({
					voicePermissionStatus: 'not-supported',
					voiceError: 'Voice features are not supported in this browser',
				});
				return;
			}

			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Create audio context for processing
			const audioContext = new AudioContext();

			set({
				audioStream: stream,
				audioContext,
				voicePermissionStatus: 'granted',
				voiceError: null,
			});
		} catch (error) {
			set({
				voicePermissionStatus: 'denied',
				voiceError:
					error instanceof Error
						? error.message
						: 'Failed to get microphone permission',
			});
		}
	},

	startListening: async () => {
		const state = get();

		if (state.voicePermissionStatus !== 'granted') {
			await get().requestVoicePermission();
			if (get().voicePermissionStatus !== 'granted') {
				return;
			}
		}

		if (!state.audioStream) {
			set({ voiceError: 'No audio stream available' });
			return;
		}

		try {
			const mediaRecorder = new MediaRecorder(state.audioStream, {
				mimeType: 'audio/webm;codecs=opus',
			});

			const audioChunks: Blob[] = [];

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					audioChunks.push(event.data);
				}
			};

			mediaRecorder.onstop = async () => {
				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
				await get().streamAudioToEndpoint(audioBlob);
			};

			mediaRecorder.start();
			set({
				mediaRecorder,
				isListening: true,
				voiceError: null,
			});
		} catch (error) {
			set({
				voiceError:
					error instanceof Error ? error.message : 'Failed to start recording',
			});
		}
	},

	stopListening: () => {
		const { mediaRecorder } = get();

		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		set({ isListening: false });
	},

	toggleVoice: () => {
		const { isListening } = get();

		if (isListening) {
			get().stopListening();
		} else {
			get().startListening();
		}
	},

	streamAudioToEndpoint: async (audioData: Blob) => {
		const { voiceEndpoint, voiceSettings } = get();

		try {
			set({ isSpeaking: false });

			// Get the stringified additional context from the store
			const contextString = get().stringifyAdditionalContext();

			const formData = new FormData();
			formData.append('audio', audioData, 'recording.webm');
			formData.append('settings', JSON.stringify(voiceSettings));
			// Add the additional context to the form data
			formData.append('context', contextString);

			const response = await fetch(voiceEndpoint, {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				throw new Error(`Voice endpoint returned ${response.status}`);
			}

			// Handle different response types
			const contentType = response.headers.get('content-type');

			if (contentType?.includes('audio')) {
				// Audio response - play it
				const audioData = await response.arrayBuffer();
				await get().playAudioResponse(audioData);
			} else if (contentType?.includes('application/json')) {
				// JSON response - check for audio URL or text
				const data = await response.json();

				// Add messages to the messages store if enabled
				if (
					voiceSettings.autoAddToMessages &&
					(data.transcription || data.text)
				) {
					// Access the messages slice directly from the store
					const { addMessage } = get();

					// Add user message (transcription)
					if (data.transcription) {
						addMessage({
							type: 'text',
							role: 'user',
							content: data.transcription,
							metadata: {
								source: 'voice',
								timestamp: new Date().toISOString(),
							},
						});
					}

					// Add assistant message (response)
					if (data.text) {
						addMessage({
							type: 'text',
							role: 'assistant',
							content: data.text,
							metadata: {
								source: 'voice',
								usage: data.usage,
								timestamp: new Date().toISOString(),
							},
						});
					}
				}

				// Handle structured object response (similar to handleLLMResult)
				if (data.object && typeof data.object === 'object') {
					const structuredResponse = data.object;

					// Handle based on the type field in the structured response
					if (structuredResponse.type) {
						switch (structuredResponse.type) {
							case 'action': {
								// Execute the custom setter with the provided parameters
								if (
									structuredResponse.stateKey &&
									structuredResponse.setterKey
								) {
									const args = structuredResponse.args || [];
									// Access executeCustomSetter from the state slice
									const { executeCustomSetter } = get();
									executeCustomSetter(
										structuredResponse.stateKey,
										structuredResponse.setterKey,
										...args
									);
								}
								break;
							}
							// Message type is already handled above in the messages section
						}
					}
				}

				// Handle audio playback from different sources
				if (data.audioData && data.audioFormat) {
					// Base64 audio data
					const binaryString = atob(data.audioData);
					const bytes = new Uint8Array(binaryString.length);
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}
					const audioBuffer = bytes.buffer;
					await get().playAudioResponse(audioBuffer);
				} else if (data.audioUrl) {
					// Play audio from URL
					await get().playAudioResponse(data.audioUrl);
				} else if (data.text && voiceSettings.useBrowserTTS) {
					// Text-only response - use browser TTS if enabled
					if ('speechSynthesis' in window) {
						const utterance = new SpeechSynthesisUtterance(data.text);
						utterance.lang = voiceSettings.language;
						utterance.rate = voiceSettings.rate || 1;
						utterance.pitch = voiceSettings.pitch || 1;
						utterance.volume = voiceSettings.volume || 1;

						set({ isSpeaking: true });
						utterance.onend = () => set({ isSpeaking: false });

						speechSynthesis.speak(utterance);
					}
				}
			}
		} catch (error) {
			set({
				voiceError:
					error instanceof Error ? error.message : 'Failed to process voice',
			});
		}
	},

	playAudioResponse: async (audioData: string | ArrayBuffer) => {
		try {
			set({ isSpeaking: true });

			const audio = new Audio();

			if (typeof audioData === 'string') {
				audio.src = audioData;
			} else {
				const blob = new Blob([audioData], { type: 'audio/mpeg' });
				audio.src = URL.createObjectURL(blob);
			}

			audio.onended = () => {
				set({ isSpeaking: false });
				if (typeof audioData !== 'string') {
					URL.revokeObjectURL(audio.src);
				}
			};

			await audio.play();
		} catch (error) {
			set({
				isSpeaking: false,
				voiceError:
					error instanceof Error ? error.message : 'Failed to play audio',
			});
		}
	},

	setVoiceEndpoint: (endpoint: string) => {
		set({ voiceEndpoint: endpoint });
	},

	updateVoiceSettings: (settings: Partial<VoiceState['voiceSettings']>) => {
		set((state) => ({
			voiceSettings: {
				...state.voiceSettings,
				...settings,
			},
		}));
	},

	setVoiceError: (error: string | null) => {
		set({ voiceError: error });
	},

	resetVoiceState: () => {
		const { audioStream, audioContext, mediaRecorder } = get();

		// Clean up resources
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}

		if (audioStream) {
			audioStream.getTracks().forEach((track) => track.stop());
		}

		if (audioContext && audioContext.state !== 'closed') {
			audioContext.close();
		}

		set(initialVoiceState);
	},
});

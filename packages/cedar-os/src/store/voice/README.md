# Cedar Voice Extension

The Voice Extension for Cedar enables voice-based interactions with AI agents through the Cedar store. It provides a complete solution for capturing audio input, streaming to backend services, and playing audio responses.

## Features

- 🎤 **Voice Capture**: Browser-based audio recording with permission management
- 🔊 **Audio Playback**: Automatic playback of audio responses from agents
- 🌐 **Streaming Support**: Real-time audio streaming to configurable endpoints
- 🔧 **Flexible Configuration**: Customizable voice settings (language, pitch, rate, volume)
- 🎯 **State Management**: Full integration with Cedar's Zustand-based store
- 🛡️ **Error Handling**: Comprehensive error states and recovery

## Installation

The voice extension is included in the Cedar package. To use it, you need to create a store with voice capabilities:

```typescript
import { createCedarStoreWithVoice } from '@/store/CedarStore';

// Create a store instance with voice capabilities
const useCedarStoreWithVoice = createCedarStoreWithVoice();
```

## Basic Usage

### 1. Setting Up Voice in a Component

```typescript
import { useVoiceFromStore } from '@/store/CedarStore';

function VoiceChat() {
	const voice = useVoiceFromStore(useCedarStoreWithVoice);

	useEffect(() => {
		// Configure the voice endpoint
		voice.setVoiceEndpoint('http://localhost:3456/api/chat/voice');

		// Cleanup on unmount
		return () => {
			voice.resetVoiceState();
		};
	}, []);

	// ... rest of component
}
```

### 2. Requesting Microphone Permission

```typescript
const handleEnableVoice = async () => {
	if (!voice.checkVoiceSupport()) {
		alert('Voice features are not supported in your browser');
		return;
	}

	await voice.requestVoicePermission();

	if (voice.voicePermissionStatus === 'granted') {
		console.log('Voice enabled!');
	}
};
```

### 3. Starting/Stopping Voice Recording

```typescript
const handleVoiceToggle = () => {
	if (voice.isListening) {
		voice.stopListening();
	} else {
		voice.startListening();
	}
};
```

## Voice State

The voice slice manages the following state:

```typescript
interface VoiceState {
	// Core state
	isVoiceEnabled: boolean;
	isListening: boolean;
	isSpeaking: boolean;
	voiceEndpoint: string;
	voicePermissionStatus: 'granted' | 'denied' | 'prompt' | 'not-supported';
	voiceError: string | null;

	// Voice settings
	voiceSettings: {
		language: string; // e.g., 'en-US'
		voiceId?: string; // Optional voice ID for TTS
		pitch?: number; // 0.5 to 2.0
		rate?: number; // 0.5 to 2.0
		volume?: number; // 0.0 to 1.0
		useBrowserTTS?: boolean; // Use browser TTS instead of backend
		autoAddToMessages?: boolean; // Automatically add voice interactions to messages
	};
}
```

## Message Integration

The voice extension can automatically add transcribed messages and responses to the Cedar messages store. This creates a seamless chat history that includes both text and voice interactions.

### Automatic Message Addition

When `autoAddToMessages` is enabled (default: true), voice interactions are automatically added to the messages store:

1. **User messages**: Transcribed speech is added as a user message
2. **Assistant messages**: Agent responses are added as assistant messages

Both messages include metadata indicating they came from voice:

```typescript
{
  type: 'text',
  role: 'user',
  content: 'Show me all features',
  metadata: {
    source: 'voice',
    timestamp: '2024-01-01T12:00:00Z'
  }
}
```

### Disabling Message Integration

To disable automatic message addition:

```typescript
voice.updateVoiceSettings({
	autoAddToMessages: false,
});
```

### Custom Message Handling

You can also provide a custom message handler:

```typescript
voice.setMessageHandler((message) => {
	// Custom logic for handling messages
	console.log('Voice message:', message);

	// Optionally add to your own store
	myCustomStore.addMessage(message);
});
```

## Voice Actions

### Permission Management

- `checkVoiceSupport()`: Check if browser supports voice features
- `requestVoicePermission()`: Request microphone access

### Voice Control

- `startListening()`: Start recording audio
- `stopListening()`: Stop recording and send to endpoint
- `toggleVoice()`: Toggle between listening and idle states

### Configuration

- `setVoiceEndpoint(endpoint)`: Set the backend endpoint URL
- `updateVoiceSettings(settings)`: Update voice configuration
- `setVoiceError(error)`: Set error message
- `resetVoiceState()`: Clean up and reset all voice state

## Backend Integration

The voice extension expects a backend endpoint that can handle multipart form data with audio files. Here's what the extension sends:

```typescript
// POST request to voiceEndpoint
FormData {
  audio: Blob (WebM format with Opus codec)
  settings: JSON string of voice settings
}
```

### Expected Response Formats

1. **Audio Response** (Content-Type: audio/mpeg)

   ```typescript
   // Direct audio data as ArrayBuffer
   ```

2. **JSON Response with Audio URL**
   ```typescript
   {
     "audioUrl": "https://example.com/response.mp3",
     "text": "Optional text transcript"
   }
   ```

## Mastra Agent Integration

To integrate with a Mastra agent, implement a voice endpoint:

```typescript
async function handleVoiceMessage(c: Context) {
	const formData = await c.req.formData();
	const audioFile = formData.get('audio') as File;
	const settings = JSON.parse(formData.get('settings') as string);

	// 1. Convert audio to text (use OpenAI Whisper, etc.)
	const text = await speechToText(audioFile);

	// 2. Process with agent
	const response = await agent.generate([{ role: 'user', content: text }]);

	// 3. Convert response to speech
	const audioResponse = await textToSpeech(response.text, settings);

	// 4. Return audio
	return new Response(audioResponse, {
		headers: { 'Content-Type': 'audio/mpeg' },
	});
}
```

## Browser Compatibility

The voice extension requires:

- `navigator.mediaDevices.getUserMedia`
- `MediaRecorder` API
- `AudioContext` API

Supported browsers:

- Chrome/Edge 47+
- Firefox 25+
- Safari 11+
- Opera 34+

## Error Handling

The extension provides detailed error states:

```typescript
if (voice.voiceError) {
	switch (voice.voicePermissionStatus) {
		case 'denied':
			console.log('User denied microphone access');
			break;
		case 'not-supported':
			console.log('Browser does not support voice features');
			break;
		default:
			console.log('Error:', voice.voiceError);
	}
}
```

## Advanced Usage

### Custom Audio Processing

You can extend the voice slice to add custom audio processing:

```typescript
const processAudioBeforeSending = async (audioBlob: Blob) => {
	// Add noise reduction, compression, etc.
	const processed = await customAudioProcessor(audioBlob);
	return processed;
};
```

### Multiple Language Support

```typescript
voice.updateVoiceSettings({
	language: 'es-ES',
	voiceId: 'spanish-voice-1',
	rate: 1.1,
});
```

### Voice Activity Detection

Implement voice activity detection to automatically stop recording:

```typescript
// In your custom implementation
const detectSilence = (audioData: Float32Array) => {
	const average =
		audioData.reduce((a, b) => Math.abs(a) + Math.abs(b)) / audioData.length;
	return average < SILENCE_THRESHOLD;
};
```

## Security Considerations

1. **HTTPS Required**: Microphone access requires HTTPS in production
2. **CORS**: Ensure your backend allows CORS for the frontend domain
3. **Audio Format**: WebM with Opus codec is used for efficiency
4. **Permission Persistence**: Browser may remember permission grants

## Troubleshooting

### Common Issues

1. **"Voice not supported"**

   - Check browser compatibility
   - Ensure HTTPS is used (except localhost)

2. **"Failed to get microphone permission"**

   - User may have blocked microphone access
   - Check browser settings

3. **"Failed to process voice"**
   - Check backend endpoint is running
   - Verify CORS configuration
   - Check network connectivity

### Debug Mode

Enable debug logging:

```typescript
// In your component
useEffect(() => {
	if (voice.isListening) {
		console.log('Recording started');
	}
	if (voice.isSpeaking) {
		console.log('Playing response');
	}
}, [voice.isListening, voice.isSpeaking]);
```

## Future Enhancements

Planned features for future releases:

- [ ] WebRTC support for real-time streaming
- [ ] Voice activity detection
- [ ] Noise cancellation
- [ ] Multiple voice profiles
- [ ] Offline speech recognition
- [ ] Voice commands for UI control
- [ ] Audio visualization components

## Contributing

To contribute to the voice extension:

1. Fork the Cedar repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

The voice extension is part of Cedar and follows the same license terms.

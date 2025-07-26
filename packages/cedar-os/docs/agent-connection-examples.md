# Cedar Agent Connection Examples

## Basic Usage

### OpenAI Provider

```typescript
import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';

function App() {
	const openAIConfig: ProviderConfig = {
		provider: 'openai',
		apiKey: 'sk-your-api-key',
	};

	return (
		<CedarCopilot llmProvider={openAIConfig}>{/* Your app */}</CedarCopilot>
	);
}
```

### Mastra Provider

```typescript
import { CedarCopilot, useCedarStore } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';

function App() {
	const mastraConfig: ProviderConfig = {
		provider: 'mastra',
		apiKey: 'your-mastra-key', // Optional
		baseURL: 'https://api.mastra.ai',
	};

	return (
		<CedarCopilot llmProvider={mastraConfig}>
			<MyComponent />
		</CedarCopilot>
	);
}

// Inside your component
function MyComponent() {
	const { callLLM } = useCedarStore();

	const handleClick = async () => {
		// With Mastra, route is a required parameter
		const response = await callLLM({
			prompt: 'Hello, world!',
			route: '/chat/completions',
			temperature: 0.7,
		});

		console.log(response.content);
	};
}
```

### AI SDK Provider with Multiple Models

```typescript
import { CedarCopilot } from 'cedar-os';
import type { ProviderConfig } from 'cedar-os';

function App() {
	const aiSDKConfig: ProviderConfig = {
		provider: 'ai-sdk',
		models: {
			'gpt-4': {
				provider: 'openai',
				apiKey: 'sk-openai-key',
			},
			'claude-3': {
				provider: 'anthropic',
				apiKey: 'sk-anthropic-key',
			},
			'gemini-pro': {
				provider: 'google',
				apiKey: 'google-api-key',
			},
		},
	};

	return (
		<CedarCopilot llmProvider={aiSDKConfig}>{/* Your app */}</CedarCopilot>
	);
}
```

## Advanced Usage: Custom Application Flows

### Example: Debug Flow

Here's an example of creating a custom `debugFlow` function that demonstrates the flexibility of the system:

```typescript
import { useCedarStore } from 'cedar-os';

function useDebugFlow() {
	const store = useCedarStore();

	const debugFlow = async () => {
		// 1. Parse context from the current state
		const context = store.getCedarState('debugContext');
		const userCode = store.getCedarState('currentCode');
		const errorMessage = store.getCedarState('lastError');

		// 2. Build a specific prompt for debugging
		const debugPrompt = `
      Debug the following code:
      
      Code:
      ${userCode}
      
      Error:
      ${errorMessage}
      
      Context:
      ${JSON.stringify(context, null, 2)}
      
      Please provide:
      1. The root cause of the error
      2. A fix for the code
      3. An explanation of what went wrong
    `;

		// 3. Make the LLM call with specific configuration
		const response = await store.streamLLM(
			{
				prompt: debugPrompt,
				model: 'gpt-4', // Use GPT-4 for complex debugging
				temperature: 0.2, // Low temperature for precise debugging
				systemPrompt: 'You are an expert debugger. Be concise and accurate.',
			},
			// 4. Handle the streaming response with custom logic
			(event) => {
				switch (event.type) {
					case 'chunk':
						// Parse the response and update UI in real-time
						const lines = event.content.split('\n');

						// Look for specific patterns in the response
						if (event.content.includes('ROOT CAUSE:')) {
							store.setCedarState('debugRootCause', event.content);
						} else if (event.content.includes('FIX:')) {
							store.setCedarState('suggestedFix', event.content);
						}

						// Update the debug output
						store.setCedarState(
							'debugOutput',
							(prev: string) => prev + event.content
						);
						break;

					case 'done':
						// Execute post-processing
						store.setCedarState('debugStatus', 'complete');

						// Automatically apply the fix if confidence is high
						const output = store.getCedarState('debugOutput');
						if (output.includes('CONFIDENCE: HIGH')) {
							applyDebugFix();
						}
						break;

					case 'error':
						console.error('Debug flow error:', event.error);
						store.setCedarState('debugStatus', 'error');
						break;
				}
			}
		);

		return response;
	};

	const applyDebugFix = () => {
		const suggestedFix = store.getCedarState('suggestedFix');
		// Apply the fix to the code editor
		store.setCedarState('currentCode', suggestedFix);
	};

	return { debugFlow };
}
```

### Example: Multi-Step Workflow

```typescript
function useCodeReviewFlow() {
	const store = useCedarStore();

	const reviewCode = async (code: string) => {
		// Step 1: Analyze code structure
		const structureAnalysis = await store.callLLM({
			prompt: `Analyze the structure of this code: ${code}`,
			model: 'gpt-3.5-turbo',
			temperature: 0.3,
		});

		// Step 2: Check for security issues (using a different model)
		const securityCheck = await store.callLLM({
			prompt: `Check for security vulnerabilities: ${code}`,
			model: 'gpt-4', // Use GPT-4 for security analysis
			temperature: 0.1,
			systemPrompt: 'You are a security expert. Be thorough.',
		});

		// Step 3: Generate improvement suggestions
		const improvements = await store.callLLM({
			prompt: `Suggest improvements based on:
        Structure: ${structureAnalysis.content}
        Security: ${securityCheck.content}
        Code: ${code}`,
			model: 'gpt-4',
			temperature: 0.5,
		});

		return {
			structure: structureAnalysis,
			security: securityCheck,
			improvements: improvements,
		};
	};

	return { reviewCode };
}
```

### Example: Provider-Specific Features

```typescript
// Using Mastra with different routes
function useMastraWorkflow() {
	const { callLLM } = useCedarStore();

	const chatCompletion = async (message: string) => {
		return await callLLM({
			prompt: message,
			route: '/chat/completions',
		});
	};

	const codeGeneration = async (spec: string) => {
		return await callLLM({
			prompt: spec,
			route: '/code/generate',
			temperature: 0.8,
		});
	};

	const dataAnalysis = async (data: any) => {
		return await callLLM({
			prompt: JSON.stringify(data),
			route: '/analyze/data',
			systemPrompt: 'Analyze this data and provide insights',
		});
	};

	return { chatCompletion, codeGeneration, dataAnalysis };
}
```

## Type Safety

The beauty of this architecture is that TypeScript will enforce the correct parameters based on your provider:

```typescript
// With OpenAI provider
const response = await callLLM({
	prompt: 'Hello',
	model: 'gpt-4', // ✅ Required
	// route: '/chat', // ❌ TypeScript error: 'route' doesn't exist on OpenAIParams
});

// With Mastra provider
const response = await callLLM({
	prompt: 'Hello',
	route: '/chat/completions', // ✅ Required
	// model: 'gpt-4', // ❌ TypeScript error: 'model' doesn't exist on MastraParams
});
```

This ensures you can't accidentally use provider-specific parameters with the wrong provider, catching errors at compile time rather than runtime.

## Using Typed Hooks for Better Type Safety

Cedar provides typed hooks that give you compile-time type safety based on your provider:

### useTypedAgentConnection

When you know which provider you're using, use the typed hook:

```typescript
import { useTypedAgentConnection } from 'cedar-os';

function MyOpenAIComponent() {
	const { callLLM, streamLLM } = useTypedAgentConnection('openai');

	const handleClick = async () => {
		// TypeScript knows this needs model, not route
		const response = await callLLM({
			prompt: 'Hello, world!',
			model: 'gpt-4', // ✅ Required and type-checked
			temperature: 0.7,
		});

		// streamLLM is also properly typed
		const stream = streamLLM(
			{
				prompt: 'Tell me a story',
				model: 'gpt-4', // ✅ Required
			},
			(event) => {
				if (event.type === 'chunk') {
					console.log(event.content);
				}
			}
		);
	};
}

function MyMastraComponent() {
	const { callLLM } = useTypedAgentConnection('mastra');

	const handleClick = async () => {
		// TypeScript knows this needs route, not model
		const response = await callLLM({
			prompt: 'Hello, world!',
			route: '/chat/completions', // ✅ Required and type-checked
			temperature: 0.7,
		});
	};
}
```

### useAgentConnection

When you need to handle multiple providers dynamically:

```typescript
import { useAgentConnection } from 'cedar-os';

function DynamicComponent() {
	const connection = useAgentConnection();

	const handleClick = async () => {
		// TypeScript narrows the type based on provider check
		if (connection.provider === 'openai') {
			// Inside this block, TypeScript knows we need model
			await connection.callLLM({
				prompt: 'Hello',
				model: 'gpt-4',
			});
		} else if (connection.provider === 'ma`stra') {
			// Inside this block, TypeScript knows we need route
			await connection.callLLM({
				prompt: 'Hello',
				route: '/chat/completions',
			});
		}
	};
}
```

### Type Safety in Custom Flows

The typed hooks work perfectly with custom application flows:

```typescript
import { useTypedAgentConnection } from 'cedar-os';

function useOpenAIDebugFlow() {
	const { streamLLM } = useTypedAgentConnection('openai');
	const store = useCedarStore();

	const debugFlow = async () => {
		const context = store.getCedarState('debugContext');
		const userCode = store.getCedarState('currentCode');

		// TypeScript ensures we provide the correct params for OpenAI
		const response = await streamLLM(
			{
				prompt: `Debug this code: ${userCode}`,
				model: 'gpt-4', // ✅ TypeScript knows this is required
				temperature: 0.2,
				systemPrompt: 'You are an expert debugger.',
			},
			(event) => {
				// Handle streaming response
				if (event.type === 'chunk') {
					store.setCedarState(
						'debugOutput',
						(prev: string) => prev + event.content
					);
				}
			}
		);

		return response;
	};

	return { debugFlow };
}
```

This approach gives you the best of both worlds:

- Full type safety at compile time
- No runtime type errors
- Excellent IDE autocomplete
- Clear error messages when parameters are wrong

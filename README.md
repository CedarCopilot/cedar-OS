# Cedar OS

**An open-source framework for building the next generation of AI-native software**

_For the first time in history, products can come to life. We help you build products with life that are designed to interact with humans._

📖 **[Complete Documentation](https://docs.cedarcopilot.com)**

**[Join Our Discord!](https://discord.com/invite/tu6XSWnqAb)**

**[Landing Page ](https://cedarcopilot.com/)**

## What is Cedar OS?

Cedar OS is a comprehensive React framework that bridges the gap between AI agents and React applications. It provides everything you need to build AI-native applications where agents can read, write, and interact with your application state just like users can.

More importantly, we expecially focus interaction layer between AI and humans. We believe that reading and writing text is effortful, and that the user should have easier, more intuitive and powerful ways to interact with AI.

Unlike traditional chat widgets or AI integrations, Cedar OS enables true AI-native experiences with:

- **Full State Integration**: AI agents can read and modify your React application state through a type-safe interface
- **Real-time Streaming**: Built-in support for streaming responses and real-time AI interactions
- **Voice-First Design**: Native voice integration for natural AI conversations
- **Flexible Architecture**: Works with any AI provider (OpenAI, Anthropic, Mastra, AI SDK, or custom backends)
- **Component-First**: Shadcn-style components that you own and can fully customize

## Core Features

### 🔌 **Universal AI Provider Support**

Connect to any AI backend with type-safe, provider-specific configurations:

- OpenAI, Anthropic, Google, Mistral, Groq, XAI
- Vercel AI SDK integration
- Mastra framework support
- Custom backend implementations

### 💬 **Production-Ready Chat Components**

- `FloatingCedarChat` - Floating chat interface
- `SidePanelCedarChat` - Sidebar chat panel
- `CedarCaptionChat` - Embedded caption-style chat
- Built-in streaming, typing indicators, and message history

### 🧠 **Agentic State Management**

```tsx
// AI can read and modify this state
const [todos, setTodos] = useCedarState(
	'todos',
	[],
	'User todo list manageable by AI'
);
```

- Type-safe state registration for AI access
- Custom setters for controlled AI interactions
- Automatic state synchronization and persistence

### 🎯 **Context-Aware Mentions**

```tsx
// @mention system for rich context
@user @file:components.tsx @state:todos
```

- Intelligent mention providers for users, files, state, and custom data
- Contextual AI responses based on mentioned content
- Extensible mention system for domain-specific contexts

### 🎤 **Voice Integration (Beta)**

- Real-time voice-to-text and text-to-voice
- WebSocket streaming for low-latency interactions
- Customizable voice settings and providers
- Browser and backend TTS support

### ⚡ **Spells & Quick Actions**

- Radial menu system for quick AI interactions
- Keyboard shortcuts and gesture support
- Customizable spell registry and workflows

### 🎨 **Fully Customizable UI**

- Shadcn-style component architecture - you own the code
- Built with Tailwind CSS for easy styling
- Dark/light mode support
- Animation-rich interfaces that reflect AI fluidity

## Key Differentiators

### **1. True AI-Native Architecture**

Cedar OS isn't just a chat widget - it's a complete framework for building applications where AI is a first-class citizen. AI agents can interact with your app state, navigate users to different views, and perform complex workflows.

### **2. Developer-First Experience**

- **Zero Lock-in**: All components are copied to your project (Shadcn-style)
- **Full Customization**: Override any internal function or component
- **Type Safety**: Comprehensive TypeScript support with provider-specific typing
- **Works Everywhere**: Next.js, Create React App, Vite, and other React frameworks

### **3. Production-Ready from Day One**

Built by developers who've shipped AI copilots in production, Cedar OS handles the complex parts:

- State lifecycle management across component unmounting
- Streaming response handling and error recovery
- Context management and memory optimization
- Provider failover and retry logic

### **4. Extensible by Design**

- Custom AI providers and backends
- Plugin system for mentions, spells, and workflows
- Message type extensions for domain-specific UI
- Hook-based architecture for easy integration

## Quick Start

```bash
npx cedar-os-cli plant-seed
```

```tsx
import { CedarCopilot, FloatingCedarChat } from 'cedar-os';

function App() {
	return (
		<CedarCopilot llmProvider={{ provider: 'openai', apiKey: 'your-key' }}>
			<YourApp />
			<FloatingCedarChat />
		</CedarCopilot>
	);
}
```

## Get Started

- 📖 **[Documentation](https://docs.cedarcopilot.com)** - Complete guides and API reference
- 🚀 **[Getting Started](https://docs.cedarcopilot.com/getting-started/getting-started)** - Build your first AI-native app
- 🎯 **[Examples](https://docs.cedarcopilot.com/introduction/ai-native-experiences)** - See Cedar OS in action
- 📞 **[Book a Call](https://calendly.com/jesse-cedarcopilot/30min)** - Free onboarding and guidance
- 📧 **[Contact](mailto:jesse@cedarcopilot.com)** - Get direct support

---

_Built for developers creating the most ambitious AI-native applications of the future._

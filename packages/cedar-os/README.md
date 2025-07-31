# Cedar-OS

**The framework for building AI-native applications**

Cedar-OS is an open-source React framework that enables you to build sophisticated AI-native applications with chat functionality, AI backend integration, and intelligent state management.

## Features

There are a few core features that make Cedar-OS special:

- 📊 **Diff & History** - Show the user state changes the AI makes, allow user approve/reject, and manage history
- 🗣️ **Voice Integration** - Voice-powered agent interactions
- @ **Mentions** - Mention system for user state to control agent context
- 🎭 **Spells** - Ways to interact with the agent outside of the chat

And, of course, we offer the building blocks needed to enable that:

- 🔄 **State Access** - Let agents read and write application state
- 💬 **Chat Components** - Floating, SidePanel, Caption, or Embedded chat components
- ⚡ **Streaming & Tool Calls** - Render real-time message streaming and agent tool execution
- 🤖 **Agent Connection Modules** - Connect to various AI backends and services
- 🎨 **Component Library** - Pre-built UI components for AI-native interfaces

## Quick Start

### Installation

```bash
# Recommended: Use our CLI for automatic setup (new and existing projects)
npx cedar-os-cli plant-seed

# Or install manually
npm install cedar-os
```

## Supported AI Providers

- **OpenAI** - Direct integration with GPT models
- **Anthropic** - Claude integration
- **AI SDK** - Support for multiple providers through Vercel's AI SDK
- **Mastra** - Full-featured agent framework (recommended)
- **Custom** - Bring your own backend

## Philosophy

Cedar-OS is built for developers creating **the most ambitious AI-native applications of the future**. We believe in:

- **Full Control** - Every component is yours to modify (Shadcn-style)
- **Extensibility** - Every internal function can be overridden
- **Simplicity** - Everything works out of the box with sensible defaults
- **Craft** - Beautiful, animated interfaces that feel natural

## Requirements

- React 18.2.0 or higher
- React DOM 18.2.0 or higher
- Node.js 18+ (for development)

### Framework Support

- ✅ **Next.js** (Recommended) - Full support with optimal performance
- ✅ **Create React App** - Supported with additional configuration
- ✅ **Vite + React** - Supported with additional configuration
- ✅ **Other React frameworks** - May require manual setup

## Documentation

- [Getting Started Guide](https://docs.cedarcopilot.com/getting-started/getting-started#getting-started-overview)
- [Chat Configuration](https://docs.cedarcopilot.com/getting-started/chat/chat-overview#chat-overview)
- [State Access](https://docs.cedarcopilot.com/getting-started/state-access/agentic-actions)
- [Spells & Interactive Elements](https://docs.cedarcopilot.com/getting-started/spells/spells#spells)
- [AI Provider Configuration](https://docs.cedarcopilot.com/getting-started/agent-backend-connection/agent-backend-connection)

## Community

- [GitHub Issues](https://github.com/CedarCopilot/cedar-OS/issues)
- [Documentation](https://docs.cedarcopilot.com/)

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with ❤️ by a couple nerds about the future of human-AI interaction.

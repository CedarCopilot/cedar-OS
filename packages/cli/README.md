# cedar-os-cli

CLI tool for scaffolding Cedar-OS projects and installing components.

## Quick Start

```bash
# Recommended: Auto-detects your setup and does the right thing
npx cedar-os-cli

# Create a new Cedar project with template selection
npx cedar-os-cli plant-seed

# Add Cedar to existing project (components + package)
npx cedar-os-cli add-sapling
```

## Features

- 🚀 **Project Templates**: Choose from Mastra + Cedar or standard Next.js
- 📦 **Smart Package Manager Detection**: Works with npm, yarn, pnpm, and bun
- 🌱 **Component Installation**: Installs Cedar-OS components with dependencies
- 🔧 **Existing Project Support**: Add Cedar to existing Next.js projects
- 📚 **Recovery Links**: Always points you to the right documentation

## Commands

### `plant-seed` (recommended)
Create new Cedar-OS project or add Cedar to existing Next.js project. **Auto-detects your setup and does the right thing.**

```bash
npx cedar-os-cli plant-seed [options]

Options:
  -p, --project-name <name>  Project directory name
  -y, --yes                  Skip all prompts
```

**What it does:**
- **Existing Next.js project**: Adds Cedar components + cedar-os package
- **New project**: Template selection → Creates project → Adds Cedar (unless template includes it)

### `add-sapling`  
Add Cedar-OS components and package to your existing project. Use when you need more control over component installation.

```bash
npx cedar-os-cli add-sapling [options]

Options:
  -d, --dir <path>             Installation directory (default: src/components/cedar-os)
  -y, --yes                    Skip confirmation prompts
```

**What it installs:**
- Cedar-OS components (UI files)
- Component dependencies (lucide-react, motion-plus-react)  
- Cedar-OS package (cedar-os npm package)

## Documentation

- [Getting Started](https://docs.cedarcopilot.com/getting-started/getting-started)
- [Backend Configuration](https://docs.cedarcopilot.com/getting-started/agent-backend-connection/agent-backend-connection#initial-configuration)
- [Troubleshooting](https://docs.cedarcopilot.com/getting-started/getting-started#troubleshooting)

## License

MIT
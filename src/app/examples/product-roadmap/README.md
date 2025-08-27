# Product Roadmap Example

This is an interactive product roadmap built with Cedar OS that demonstrates dynamic state management, AI agent integration, and flexible storage options.

## Storage Options

The product roadmap supports two storage backends with automatic fallback:

### 1. Supabase (Primary)

When Supabase environment variables are configured, the roadmap will use Supabase for persistent storage:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
```

**Features with Supabase:**

- Persistent storage across sessions
- Soft delete functionality
- Database relationships and constraints
- Multi-user support (when authentication is added)

### 2. localStorage (Fallback)

When Supabase environment variables are not available, the roadmap automatically falls back to browser localStorage:

**Features with localStorage:**

- Works immediately without configuration
- Includes sample data for demonstration
- Data persists across browser sessions
- No server dependencies

## Getting Started

### Option 1: Quick Start (localStorage)

1. Simply run the application - no configuration needed
2. The roadmap will automatically use localStorage
3. Sample nodes and edges will be created for demonstration

### Option 2: Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the database migration from `supabase/migrations/`
3. Add your environment variables to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
   ```
4. Restart the application

## Features

- **Interactive Nodes**: Double-click to edit titles and descriptions
- **Drag & Drop**: Move nodes around the canvas
- **Connections**: Connect nodes with animated edges
- **Status Management**: Update feature status (planned, in progress, done, backlog)
- **Node Types**: Different types (feature, bug, improvement, component, utils, agent helper)
- **Comments & Voting**: Add comments and upvote features
- **AI Integration**: Chat with an AI assistant about your roadmap
- **Export**: Export roadmap data as JSON
- **Diff Management**: Track and approve/reject changes

## AI Agent Integration

The roadmap includes integration with a Mastra-based AI agent that can:

- Answer questions about features
- Suggest improvements
- Help with planning and prioritization
- Add new features through conversation
- Update existing features

To use the AI agent, ensure the agent backend is running (see `product_roadmap-agent/` directory).

## Storage Status

The current storage mode is indicated in the floating menu on the left side:

- 🗄️ Supabase - Using Supabase backend
- 💾 localStorage - Using browser localStorage

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Navigate to
http://localhost:3000/examples/product-roadmap
```

## Architecture

The storage abstraction automatically detects available backends and provides a consistent API:

```typescript
// These functions work with both storage backends
await getNodes(); // Fetch all nodes
await saveNodes(nodes); // Save nodes
await getEdges(); // Fetch all edges
await saveEdges(edges); // Save edges
await deleteNode(id); // Soft delete a node
```

The system is designed to be transparent to the user - features work identically regardless of the storage backend.

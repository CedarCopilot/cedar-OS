# @cedar-os/backend

Backend helper functions for Cedar OS that enable seamless integration between Cedar OS frontend capabilities and AI agents using Mastra.

## Installation

```bash
npm install @cedar-os/backend
# or
yarn add @cedar-os/backend
# or
pnpm add @cedar-os/backend
```

## Features

- 🔄 **JSON Schema Extraction**: Extract JSON schemas directly from Cedar OS frontend tools and state setters
- 🎯 **Type Safety**: Full TypeScript support with proper type inference
- 🔧 **Zero Configuration**: Works out of the box with Cedar OS `additionalContext`
- ⚡ **Direct Integration**: JSON schemas work directly with `experimental_output` - no conversion needed

## Phase 1 - JSON Schema Extraction (Current)

This package extracts JSON schemas directly from Cedar OS `additionalContext` for use with AI agent structured output.

### Quick Start

```typescript
import {
	getFrontendToolSchemas,
	getStateSetterSchemas,
	getFrontendToolSchema,
	getStateSetterSchema,
} from '@cedar-os/backend';

// Extract all frontend tool schemas (returns JSON Schemas directly)
const frontendSchemas = getFrontendToolSchemas(requestBody);

// Extract all state setter schemas (returns JSON Schemas directly)
const setterSchemas = getStateSetterSchemas(requestBody);

// Extract a specific frontend tool schema
const notificationSchema = getFrontendToolSchema(
	requestBody,
	'showNotification'
);

// Extract a specific state setter schema
const addNodeSchema = getStateSetterSchema({
	requestBody,
	setterKey: 'addNode',
	stateKey: 'nodes',
});

// Use directly with experimental_output
const response = await agent.generate({
	messages: [{ role: 'user', content: body.prompt }],
	experimental_output: {
		schema: notificationSchema, // JSON Schema works directly
	},
});
```

## API Reference (Phase 1)

### Schema Extractors

#### `getFrontendToolSchema(requestBody, toolName)`

Extract a single frontend tool schema from additionalContext.

- **Parameters:**
  - `requestBody: CedarRequestBody` - The request body containing additionalContext
  - `toolName: string` - The name of the frontend tool
- **Returns:** `Record<string, unknown> | null` - The JSON Schema or null if not found

#### `getFrontendToolSchemas(requestBody)`

Extract all frontend tool schemas from additionalContext.

- **Parameters:**
  - `requestBody: CedarRequestBody` - The request body containing additionalContext
- **Returns:** `Record<string, Record<string, unknown>>` - Object mapping tool names to JSON schemas

#### `getStateSetterSchema({ requestBody, setterKey, stateKey })`

Extract a single state setter schema from additionalContext.

- **Parameters:**
  - `requestBody: CedarRequestBody` - The request body containing additionalContext
  - `setterKey: string` - The key of the state setter
  - `stateKey: string` - The key of the state being set
- **Returns:** `Record<string, unknown> | null` - The JSON Schema or null if not found

#### `getStateSetterSchemas(requestBody)`

Extract all state setter schemas from additionalContext.

- **Parameters:**
  - `requestBody: CedarRequestBody` - The request body containing additionalContext
- **Returns:** `Record<string, Record<string, unknown>>` - Object mapping setter keys to JSON schemas

### Utilities

#### `getJsonSchema(jsonSchema)`

Extract and validate a JSON Schema object.

- **Parameters:**
  - `jsonSchema: unknown` - The JSON Schema object
- **Returns:** `Record<string, unknown> | null` - The validated JSON Schema or null if invalid

## Coming Soon

- **Phase 2**: Mastra tool creation utilities
- **Phase 3**: Combined utilities and structured output schemas
- **Phase 4**: Complete integration examples

## Development Status

This package is under active development. The current Phase 1 implementation provides JSON Schema extraction that works directly with `experimental_output`. Future phases will add Mastra tool creation and full integration capabilities.

## License

MIT

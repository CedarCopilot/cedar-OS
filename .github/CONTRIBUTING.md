# Contributing to Cedar-OS

Welcome! Thank you for your interest in contributing to Cedar-OS :) Our goal is to help people build ambitious AI-native applications that will define the future of what software looks like.

We welcome contributions in all forms—from bug fixes and design improvements to brand-new features.

## Table of Contents

To help you, we’ll explain how Cedar works and our underlying principles. We’ll go through

- [Goals & principles](#goals-&-principles)
- [Detailed architecture & modules](#detailed-architecture-modules)
- [How to Contribute](#how-to-contribute)
- [Reporting Issues](#reporting-issues)
- [Pull Request Process](#pull-request-process)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Local Development Setup](#local-development-setup)
- [Adding New Blocks and Tools](#adding-new-blocks-and-tools)
- [License](#license)
- [Contributor License Agreement (CLA)](#contributor-license-agreement-cla)

---

## Goals & Principles

### Customisability & Extensibility

We’re explicitly trying to support the most ambitious AI-native apps of the future. To us, this means that using Cedar can’t **ever** impose any strict ceilings of what’s possible.

That’s why we **give** you the code for all components, and why we allow you to override internals in one line. By nature, components should be added to the registry and available for download, and slices should try to encapsulate responsibility as much as possible.

### Working Starter

As devs, once we have something working we can always look into the internals to trace through to understand and customise it. However, if we can’t get it to work, we don’t have anything to ground ourselves on why it’s not working.

Since we’re using a shadcn style approach where you can download components, we recommend you to have a simple use case or completed component (if not downloadable, at least as an example)

---

## Detailed Architecture

Please see our comprehensive architecture documentation to gain a high level understanding of how Cedar works:

- **[Understanding Cedar Architecture (Advanced)](https://docs.cedarcopilot.com/introduction/understanding-cedar-architecture-advanced)** - Deep dive into Cedar's internal architecture, Zustand slices, and complete sendMessage flow with detailed examples
- **[Understanding how Cedar creates requests](https://docs.cedarcopilot.com/agent-backend-connection/custom-request)**
- **[Understanding how Cedar handles LLM Responses)](https://docs.cedarcopilot.com/agent-backend-connection/custom-response-processing)**

This documentation covers:

- The Zustand store structure and all core slices
- Component architecture following shadcn-style philosophy
- Complete walkthrough of how `sendMessage` works from state registration to AI response processing
- Response processors and how to create custom ones
- Key architectural benefits including type safety, modularity, and performance

---

## How to Contribute

We strive to keep our workflow as simple as possible. To contribute:

1. **Fork the Repository**  
   Click the **Fork** button on GitHub to create your own copy of the project.

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/<your-username>/cedar-os.git
   ```
3. **Create a Feature Branch**  
   Create a new branch with a descriptive name:

   ```bash
   git checkout -b feat/your-feature-name
   ```

   Use a clear naming convention to indicate the type of work (e.g., `feat/`, `fix/`, `docs/`).

4. **Make Your Changes**  
   Ensure your changes are small, focused, and adhere to our coding guidelines.

5. **Commit Your Changes**  
   Write clear, descriptive commit messages that follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification) specification. This allows us to maintain a coherent project history and generate changelogs automatically. For example:

   - `feat(api): add new endpoint for user authentication`
   - `fix(ui): resolve button alignment issue`
   - `docs: update contribution guidelines`

6. **Push Your Branch**

   ```bash
   git push origin feat/your-feature-name
   ```

7. **Create a Pull Request**  
   Open a pull request against the `staging` branch on GitHub. Please provide a clear description of the changes and reference any relevant issues (e.g., `fixes #123`).

---

## Reporting Issues

If you discover a bug or have a feature request, please open an issue in our GitHub repository. When opening an issue, ensure you:

- Provide a clear, descriptive title.
- Include as many details as possible (steps to reproduce, screenshots, etc.).
- **Tag Your Issue Appropriately:**  
  Use the following labels to help us categorize your issue:
  - **active:** Actively working on it right now.
  - **bug:** Something isn't working.
  - **design:** Improvements & changes to design & UX.
  - **discussion:** Initiate a discussion or propose an idea.
  - **documentation:** Improvements or updates to documentation.
  - **feature:** New feature or request.

> **Note:** If you're uncertain which label to use, mention it in your issue description and we'll help categorize it.

---

## Pull Request Process

Before creating a pull request:

- **Ensure Your Branch Is Up-to-Date:**  
  Rebase your branch onto the latest `main` branch to prevent merge conflicts.
- **Follow the Guidelines:**  
  Make sure your changes are well-tested, follow our coding standards, and include relevant documentation if necessary.

- **Reference Issues:**  
  If your PR addresses an existing issue, include `refs #<issue-number>` or `fixes #<issue-number>` in your PR description.

Our maintainers will review your pull request and provide feedback. We aim to make the review process as smooth and timely as possible.

---

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/#specification) standard. Your commit messages should have the following format:

```
<type>[optional scope]: <description>
```

- **Types** may include:
  - `feat` – a new feature
  - `fix` – a bug fix
  - `docs` – documentation changes
  - `style` – code style changes (formatting, missing semicolons, etc.)
  - `refactor` – code changes that neither fix a bug nor add a feature
  - `test` – adding or correcting tests
  - `chore` – changes to tooling, build process, etc.
  - `high priority` – a high priority feature or fix
  - `high risk` – a high risk feature or fix
  - `improvement` – an improvement to the codebase

_Examples:_

- `feat[auth]: add social login integration`
- `fix[ui]: correct misaligned button on homepage`
- `docs: update installation instructions`

Using clear and consistent commit messages makes it easier for everyone to understand the project history and aids in automating changelog generation.

---

## Local Development Setup

Cedar is a monorepo using Turborepo, containing the main package `(packages/cedar-os/)`, documentation `(docs/)`, components `(packages/cedar-os-components)`, and lastly a next.js app for quick and efficient testing & examples `(src/app/examples)`

1. Install dependencies

- `npm install` in the base app.
- Go to `(packages/cedar-os/)` and run `pnpm install`
- Components `(packages/cedar-os-components)` and run `npm install`

To help you setup and test changes, we recommend 2 variations:

1. **Monorepo Development**  
   Directly work in the local next.js app through `(src/app/examples)`. This will allow any changes you make in the package itself `(packages/cedar-os/)` instantly reflect in the app consuming Cedar-OS, which is useful for development speed. We do this through package.json workspaces.

   Currently we have a Cedar-Playground that we encourage you to add a section to if you're adding something, or we recommend you port your app into the base and add it to a .gitignore, which will let you test out the changes without adding unecessary examples.

   However, if you want to explicitly add an example or add to an example, feel free to do that and include it in the PR!

2. **Yalc (multi-repo) development**  
   Run 'npm run dev:yalc' in `(packages/cedar-os/)` which creates a yalc instance. Then, go to your consuming repo, and run `yalc add cedar-os`.

   This will replace the npm package node_modules in the consuming repo with the local files in `(packages/cedar-os/)`, which allows you to test your work in a consuming repo.

   The primary problem with this is that yalc compilations and propogation is fairly slow and buggy, but this allows you to change cedar-os and have it propogate to a different repo without publishing it.

3. `npm run dev` in the base next.js app

4. If you're using mastra, you also need to `npm run dev` in the mastra agent folder. For our example product-roadmap, it's `src/app/examples/product-roadmap/product_roadmap-agent`. If you're using the CLI based setup, npm run dev runs both the base next.js app and the mastra agent simultaneously.

---

## Adding New Features to Cedar-OS

Cedar-OS is built with a modular architecture that supports three main types of extensions. Follow these guidelines to maintain consistency and quality when adding new functionality.

1. New Slices
2. New Components
3. New processors / functions

---

### 1. Adding New Store Slices

Store slices manage application state using Zustand. They provide centralized state management for specific domains like messaging, voice, or spells.

#### Creating a New Slice

1. **Create the Slice Directory:**  
   Create a new directory under `/packages/cedar-os/src/store/` with your slice name (e.g., `/packages/cedar-os/src/store/analyticsSlice/`).

2. **Define the Slice Interface:**  
   Create your slice file (e.g., `analyticsSlice.ts`) with proper TypeScript interfaces:

   ```typescript:/packages/cedar-os/src/store/analyticsSlice/analyticsSlice.ts
   import { StateCreator } from 'zustand';
   import type { CedarStore } from '@/store/CedarOSTypes';

   // Define the slice state interface
   export interface AnalyticsState {
     events: AnalyticsEvent[];
     isTracking: boolean;
     sessionId: string | null;
   }

   // Define the slice actions interface
   export interface AnalyticsActions {
     trackEvent: (event: AnalyticsEvent) => void;
     startTracking: () => void;
     stopTracking: () => void;
     clearEvents: () => void;
   }

   // Combine state and actions
   export type AnalyticsSlice = AnalyticsState & AnalyticsActions;

   // Create the slice
   export const createAnalyticsSlice: StateCreator<
     CedarStore,
     [],
     [],
     AnalyticsSlice
   > = (set, get) => ({
     // Initial state
     events: [],
     isTracking: false,
     sessionId: null,

     // Actions
     trackEvent: (event) => {
       const state = get();
       if (!state.isTracking) return;

       set((state) => ({
         events: [...state.events, { ...event, timestamp: Date.now() }],
       }));
     },

     startTracking: () => {
       set({
         isTracking: true,
         sessionId: `session-${Date.now()}`
       });
     },

     stopTracking: () => {
       set({ isTracking: false });
     },

     clearEvents: () => {
       set({ events: [] });
     },
   });
   ```

3. **Add Types to CedarStore:**  
   Update `/packages/cedar-os/src/store/CedarOSTypes.ts` to include your slice:

   ```typescript:/packages/cedar-os/src/store/CedarOSTypes.ts
   import { AnalyticsSlice } from '@/store/analyticsSlice/analyticsSlice';

   export interface CedarStore
     extends StylingSlice,
       AgentInputContextSlice,
       StateSlice,
       MessagesSlice,
       AgentConnectionSlice,
       VoiceSlice,
       DebuggerSlice,
       SpellSlice,
       AnalyticsSlice {} // Add your slice here
   ```

4. **Integrate with Main Store:**  
   Update `/packages/cedar-os/src/store/CedarStore.ts` to include your slice:

   ```typescript:/packages/cedar-os/src/store/CedarStore.ts
   import { createAnalyticsSlice } from '@/store/analyticsSlice/analyticsSlice';

   export const useCedarStore = create<CedarStore>()((...a) => ({
     ...createStylingSlice(...a),
     ...createAgentInputContextSlice(...a),
     ...createStateSlice(...a),
     ...createMessagesSlice(...a),
     ...createAgentConnectionSlice(...a),
     ...createVoiceSlice(...a),
     ...createDebuggerSlice(...a),
     ...createSpellSlice(...a),
     ...createAnalyticsSlice(...a), // Add your slice here
   }));

   // Create a convenience hook for your slice
   export const useAnalytics = () => ({
     events: useCedarStore((state) => state.events),
     isTracking: useCedarStore((state) => state.isTracking),
     sessionId: useCedarStore((state) => state.sessionId),

     trackEvent: useCedarStore((state) => state.trackEvent),
     startTracking: useCedarStore((state) => state.startTracking),
     stopTracking: useCedarStore((state) => state.stopTracking),
     clearEvents: useCedarStore((state) => state.clearEvents),
   });
   ```

5. **Export from Main Package:**  
   Add exports to `/packages/cedar-os/src/index.ts`:

   ```typescript:/packages/cedar-os/src/index.ts
   // Export analytics slice
   export { createAnalyticsSlice } from '@/store/analyticsSlice/analyticsSlice';
   export type { AnalyticsSlice } from '@/store/analyticsSlice/analyticsSlice';
   export { useAnalytics } from '@/store/CedarStore';
   ```

6. **Update createCedarStore (Optional):**  
   If your slice should be included by default, add it to `/packages/cedar-os/src/store/createCedarStore.ts`:

   ```typescript:/packages/cedar-os/src/store/createCedarStore.ts
   import { createAnalyticsSlice } from '@/store/analyticsSlice/analyticsSlice';

   const createDefaultSlices = (set: any, get: any, api: any) => ({
     ...createStylingSlice(set, get, api),
     ...createAgentInputContextSlice(set, get, api),
     ...createStateSlice(set, get, api),
     ...createAgentConnectionSlice(set, get, api),
     ...createMessagesSlice(set, get, api),
     ...createSpellSlice(set, get, api),
     ...createAnalyticsSlice(set, get, api), // Add here for default inclusion
   });
   ```

---

### 2. Adding New Components

Components are reusable React components that extend Cedar-OS's UI capabilities. They follow the shadcn-style philosophy where components can be downloaded and customized.

#### Creating a New Component

1. **Create the Component File:**  
   Create your component in the appropriate category under `/packages/cedar-os-components/`:

   ```typescript:/packages/cedar-os-components/analytics/AnalyticsDashboard.tsx
   import React from 'react';
   import { useAnalytics, useStyling } from 'cedar-os';
   import Container3D from '@/containers/Container3D';

   interface AnalyticsDashboardProps {
     className?: string;
     showRealTime?: boolean;
   }

   export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
     className = '',
     showRealTime = true,
   }) => {
     const { events, isTracking } = useAnalytics();
     const { styling } = useStyling();

     return (
       <Container3D className={`p-4 ${className}`}>
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
             <div className={`px-2 py-1 rounded text-xs ${
               isTracking ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
             }`}>
               {isTracking ? 'Tracking' : 'Stopped'}
             </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
               <p className="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
               <p className="text-xl font-bold">{events.length}</p>
             </div>
             {/* Add more analytics widgets */}
           </div>
         </div>
       </Container3D>
     );
   };
   ```

2. **Export from Package Index:**  
   Add your component to `/packages/cedar-os-components/index.ts`:

   ```typescript:/packages/cedar-os-components/index.ts
   // Analytics
   export { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
   ```

3. **Update Registry (for CLI support):**  
   Add your component to `/packages/cedar-os-components/registry.json`:

   ```json:/packages/cedar-os-components/registry.json
   {
     "components": [
       // ... existing components
       {
         "name": "analytics-dashboard",
         "type": "analytics",
         "dependencies": ["react"],
         "registryDependencies": ["cedar-os", "container-3d"],
         "files": ["AnalyticsDashboard.tsx"],
         "meta": {
           "importName": "AnalyticsDashboard",
           "displayName": "Analytics Dashboard",
           "description": "Real-time analytics dashboard component"
         }
       }
     ]
   }
   ```

4. **Create Index File (if new category):**  
   If creating a new component category, create an index file:

   ```typescript:/packages/cedar-os-components/analytics/index.ts
   export { AnalyticsDashboard } from './AnalyticsDashboard';
   ```

#### Component Guidelines

- **Follow Cedar Import Rules:** Use `@/` for internal imports and `cedar-os` for Cedar OS package imports
- **Use TypeScript:** All components must be fully typed with proper interfaces
- **Include Props Interface:** Always define a clear props interface
- **Support Styling:** Integrate with Cedar's styling system using `useStyling()`
- **Handle Dark Mode:** Support both light and dark themes
- **Use Motion:** Leverage motion/react for animations when appropriate

---

### 3. Adding New Processors

Processors handle structured responses from AI agents and custom message rendering. There are two main types: Response Processors and Message Renderers.

#### Creating Response Processors

Response processors handle structured output from AI agents (e.g., actions, progress updates).

1. **Create the Processor File:**  
   Create your processor in `/packages/cedar-os/src/store/agentConnection/responseProcessors/`:

   ```typescript:/packages/cedar-os/src/store/agentConnection/responseProcessors/analyticsResponseProcessor.ts
   import {
     ResponseProcessor,
     CustomStructuredResponseType
   } from '@/store/agentConnection/AgentConnectionTypes';

   // Define the response type
   export type AnalyticsResponse = CustomStructuredResponseType<
     'analytics',
     {
       eventType: string;
       data: Record<string, unknown>;
       metadata?: Record<string, unknown>;
     }
   >;

   // Create the processor
   export const analyticsResponseProcessor: ResponseProcessor<AnalyticsResponse> = {
     type: 'analytics',
     namespace: 'default',
     execute: async (obj, store) => {
       // Process the analytics response
       store.trackEvent({
         type: obj.eventType,
         data: obj.data,
         metadata: obj.metadata,
         timestamp: Date.now(),
       });

       // Optionally add a message to chat
       store.addMessage({
         role: 'assistant',
         type: 'text',
         content: `Analytics event recorded: ${obj.eventType}`,
       });
     },
     validate: (obj): obj is AnalyticsResponse =>
       obj.type === 'analytics' &&
       'eventType' in obj &&
       typeof obj.eventType === 'string',
   };
   ```

2. **Register the Processor:**  
   Add to `/packages/cedar-os/src/store/agentConnection/responseProcessors/initializeResponseProcessorRegistry.ts`:

   ```typescript
   import { analyticsResponseProcessor } from './analyticsResponseProcessor';

   export const defaultResponseProcessors = [
   	messageResponseProcessor,
   	actionResponseProcessor,
   	progressUpdateResponseProcessor,
   	analyticsResponseProcessor, // Add your processor
   ];
   ```

#### Creating Message Renderers

Message renderers control how different message types are displayed in the chat.

1. **Create the Renderer Component:**  
   Create your renderer in `/packages/cedar-os/src/store/messages/renderers/`:

   ```typescript:/packages/cedar-os/src/store/messages/renderers/AnalyticsRenderer.tsx
   import React from 'react';
   import { CustomMessage } from '@/store/messages/MessageTypes';
   import { ShimmerText } from './ShimmerText';

   export type AnalyticsMessage = CustomMessage<
     'analytics_event',
     {
       eventType: string;
       count: number;
       data: Record<string, unknown>;
     }
   >;

   interface AnalyticsRendererProps {
     message: AnalyticsMessage;
   }

   const AnalyticsRenderer: React.FC<AnalyticsRendererProps> = ({ message }) => {
     const { eventType, count, data } = message;

     return (
       <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
         <div className="flex items-center gap-2">
           <ShimmerText
             text={`📊 ${eventType} (${count})`}
             state="complete"
           />
         </div>
         {Object.keys(data).length > 0 && (
           <details className="mt-2">
             <summary className="text-xs cursor-pointer">View Details</summary>
             <pre className="text-xs mt-1 overflow-x-auto">
               {JSON.stringify(data, null, 2)}
             </pre>
           </details>
         )}
       </div>
     );
   };

   export default AnalyticsRenderer;
   ```

2. **Register the Renderer:**  
   Add to `/packages/cedar-os/src/store/messages/renderers/initializeMessageRendererRegistry.tsx`:

   ```typescript
   import AnalyticsRenderer, { AnalyticsMessage } from './AnalyticsRenderer';

   export const analyticsMessageRenderer: MessageRenderer<Message> = {
   	type: 'analytics_event',
   	namespace: 'default',
   	render: (message) => (
   		<AnalyticsRenderer message={message as AnalyticsMessage} />
   	),
   	validateMessage: (msg): msg is AnalyticsMessage =>
   		msg.type === 'analytics_event',
   };

   export const defaultMessageRenderers: MessageRenderer<Message>[] = [
   	progressUpdateMessageRenderer,
   	actionResponseMessageRenderer,
   	analyticsMessageRenderer, // Add your renderer
   	...mastraEventRenderers,
   ];
   ```

#### Factory Functions

Use factory functions for reusable processor patterns:

```typescript:/packages/cedar-os/src/store/agentConnection/responseProcessors/createAnalyticsProcessor.ts
import { createResponseProcessor } from './createResponseProcessor';

export function createAnalyticsResponseProcessor(config: {
  namespace?: string;
  onEvent?: (eventType: string, data: Record<string, unknown>) => void;
}) {
  return createResponseProcessor({
    type: 'analytics',
    namespace: config.namespace || 'default',
    execute: async (obj, store) => {
      // Custom logic here
      config.onEvent?.(obj.eventType, obj.data);

      // Default behavior
      store.trackEvent({
        type: obj.eventType,
        data: obj.data,
        timestamp: Date.now(),
      });
    },
    validate: (obj) => obj.type === 'analytics' && 'eventType' in obj,
  });
}
```

#### Processor Guidelines

- **Type Safety:** Always use proper TypeScript interfaces and validation
- **Error Handling:** Implement robust error handling in your execute functions
- **Namespace:** Use namespaces to avoid conflicts when multiple processors handle the same type
- **Validation:** Provide validation functions to ensure type safety at runtime
- **Store Integration:** Use the provided store parameter to interact with Cedar state
- **Async Support:** Processors can be async for complex operations

#### Testing Your Processors

Create tests for your processors in `/packages/cedar-os/__tests__/`:

```typescript:/packages/cedar-os/__tests__/analyticsProcessor.test.tsx
import { analyticsResponseProcessor } from '@/store/agentConnection/responseProcessors/analyticsResponseProcessor';

describe('Analytics Response Processor', () => {
  it('should process analytics events correctly', async () => {
    const mockStore = {
      trackEvent: jest.fn(),
      addMessage: jest.fn(),
    };

    const response = {
      type: 'analytics',
      eventType: 'user_click',
      data: { button: 'submit' },
    };

    await analyticsResponseProcessor.execute(response, mockStore as any);

    expect(mockStore.trackEvent).toHaveBeenCalledWith({
      type: 'user_click',
      data: { button: 'submit' },
      timestamp: expect.any(Number),
    });
  });
});
```

### Naming Conventions

Maintaining consistent naming across the codebase is critical for auto-generation, CLI support, and documentation. Follow these naming guidelines based on Cedar-OS's established patterns:

#### Store Slices

- **Slice Files:** Named as `{feature}Slice.ts` (e.g., `stylingSlice.ts`, `messagesSlice.ts`)
- **Slice Creators:** Named as `create{Feature}Slice` (e.g., `createStylingSlice`, `createMessagesSlice`)
- **Slice Types:** Named as `{Feature}Slice` interface (e.g., `StylingSlice`, `MessagesSlice`)
- **Slice Directories:** Organized as `/store/{featureName}/` (e.g., `/store/agentConnection/`, `/store/spellSlice/`)

#### Components (cedar-os-components)

- **Component Files:** Use PascalCase matching the export (e.g., `ChatInput.tsx`, `Container3D.tsx`)
- **Component Exports:** Named descriptively with Cedar prefix for main components (e.g., `CedarCaptionChat`, `FloatingCedarChat`)
- **Component Categories:** Organized by functional domain:
  - `chatComponents/` - Main chat interfaces
  - `chatInput/` - Input-related components
  - `chatMessages/` - Message display components
  - `containers/` - Layout and wrapper components
  - `spells/` - Interactive spell components
  - `text/` - Text effect components
  - `ui/` - Basic UI elements
  - `ornaments/` - Visual decoration components
  - `structural/` - Layout structure components
  - `voice/` - Voice-related components

#### Registry Naming (for CLI support)

- **Registry Names:** Use kebab-case (e.g., `cedar-caption-chat`, `container-3d-button`)
- **Import Names:** Use PascalCase matching the component export (e.g., `CedarCaptionChat`, `Container3DButton`)
- **Display Names:** Use human-readable titles (e.g., `"Cedar Caption Chat"`, `"3D Container Button"`)

#### Providers & Processors

- **Provider Files:** Named after the service (e.g., `openai.ts`, `mastra.ts`, `ai-sdk.ts`)
- **Provider Exports:** Named as `{provider}Provider` (e.g., `openAIProvider`, `mastraProvider`)
- **Response Processors:** Named as `{type}ResponseProcessor` (e.g., `actionResponseProcessor`, `messageResponseProcessor`)
- **Message Renderers:** Named as `{Type}Renderer` (e.g., `ActionRenderer`, `ProgressUpdateRenderer`)

#### Spells

- **Spell Files:** Named as `{Purpose}Spell.tsx` (e.g., `QuestioningSpell.tsx`, `RadialMenuSpell.tsx`)
- **Spell Props:** Named as `{SpellName}Props` (e.g., `QuestioningSpellProps`, `RadialMenuSpellProps`)
- **Spell Configs:** Named as `{Feature}Config` for configuration objects (e.g., `SliderConfig`, `RangeSliderConfig`)

#### Hooks & Utilities

- **Custom Hooks:** Use `use` prefix with descriptive names (e.g., `useCedarState`, `useSpell`, `useTypedAgentConnection`)
- **Utility Functions:** Use camelCase with descriptive names (e.g., `sanitizeJson`, `inputFormatter`)
- **Factory Functions:** Use `create` prefix for factory patterns (e.g., `createResponseProcessor`, `createMessageRenderer`)

#### Types & Interfaces

- **Interface Names:** Use PascalCase with descriptive suffixes:
  - `{Feature}State` for state interfaces (e.g., `VoiceState`, `StylingState`)
  - `{Feature}Actions` for action interfaces (e.g., `VoiceActions`, `StylingActions`)
  - `{Feature}Props` for component props (e.g., `ChatInputProps`, `Container3DProps`)
  - `{Feature}Config` for configuration objects (e.g., `StylingConfig`, `MessageStorageConfig`)
- **Type Aliases:** Use PascalCase with descriptive names (e.g., `MessageRole`, `ActivationEvent`)
- **Generic Types:** Use descriptive names with type parameters (e.g., `CustomMessage<T, P>`, `TypedMessage<T, P>`)

### Guidelines & Best Practices

- **Code Style:** Follow the project's Biome configurations. Use meaningful variable names and small, focused functions.
- **Documentation:** Clearly document the purpose, inputs, outputs, and any special behavior for your block/tool.
- **Error Handling:** Implement robust error handling and provide user-friendly error messages.
- **Parameter Visibility:** Always specify the appropriate visibility level for each parameter to ensure proper UI behavior and LLM integration.
- **Testing:** Add unit or integration tests to verify your changes when possible.
- **Commit Changes:** Update all related components and registries, and describe your changes in your pull request.

Happy coding!

---

## License

This project is licensed under the Apache License 2.0. By contributing, you agree that your contributions will be licensed under the Apache License 2.0 as well.

---

## Contributor License Agreement (CLA)

By contributing to this repository, you agree that your contributions are provided under the terms of the Apache License Version 2.0, as included in the LICENSE file of this repository.

In addition, by submitting your contributions, you grant Cedar-OS, Inc. ("The Licensor") a perpetual, irrevocable, worldwide, royalty-free, sublicensable right and license to:

- Use, copy, modify, distribute, publicly display, publicly perform, and prepare derivative works of your contributions.
- Incorporate your contributions into other works or products.
- Re-license your contributions under a different license at any time in the future, at the Licensor's sole discretion.

You represent and warrant that you have the legal authority to grant these rights and that your contributions are original or you have sufficient rights to submit them under these terms.

If you do not agree with these terms, you must not contribute your work to this repository.

---

Thank you for taking the time to contribute to Cedar-OS. We truly appreciate your efforts and look forward to collaborating with you!

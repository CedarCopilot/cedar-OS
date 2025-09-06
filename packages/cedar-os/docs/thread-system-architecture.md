# Cedar OS Thread System Architecture

## Overview

The Cedar OS thread system provides conversation management capabilities, allowing users to maintain multiple chat threads, switch between them, and persist messages across sessions. The system is designed to work seamlessly with all LLM providers while maintaining backward compatibility.

## Core Components

### 1. MessagesSlice (State Management)

The `messagesSlice` is the central state manager for the thread system:

```typescript
// Core state structure
threadMap: {
  [threadId: string]: {
    id: string;
    lastLoaded: string;
    messages: Message[];
  }
}
mainThreadId: string; // Currently active thread
messages: Message[];  // Synced with current thread for backward compatibility
```

**Key Features:**

- `threadMap`: Stores all threads and their messages
- `mainThreadId`: Tracks the currently active thread
- `messages`: A synced copy of the current thread's messages for backward compatibility
- Default thread (`DEFAULT_THREAD_ID`): Always exists, cannot be deleted

### 2. Message Storage Integration

The thread system integrates with `messageStorage.ts` for persistence:

```typescript
// How it works:
1. User sends a message → Added to threadMap[mainThreadId]
2. Message persisted via messageStorage.persistMessage(userId, threadId, message)
3. On app load → messageStorage.loadMessages(userId, threadId) populates thread
4. Thread list loaded via messageStorage.listThreads(userId)
```

**Storage Flow:**

- Messages are persisted per thread using the current `mainThreadId`
- Thread metadata (id, title, updatedAt) is maintained separately
- Storage adapters (local, custom) handle the actual persistence

### 3. Agent Connection Integration

All LLM providers automatically use the current thread context:

```typescript
// In agentConnectionSlice.ts
sendMessage: async (params) => {
	const resolvedThreadId = threadId || state.mainThreadId;

	// Provider-specific handling
	switch (config.provider) {
		case 'mastra':
			llmParams = {
				...llmParams,
				threadId: resolvedThreadId, // Mastra gets threadId
				resourceId: resolvedUserId,
			};
			break;
		case 'custom':
			llmParams = {
				...llmParams,
				threadId: resolvedThreadId, // Custom providers can use threadId
				userId: resolvedUserId,
			};
			break;
		// OpenAI, Anthropic, AI SDK don't need threadId
	}
};
```

**Provider Behavior:**

- **Mastra**: Sends `threadId` with each request for server-side thread management
- **Custom**: Can optionally use `threadId` if the backend supports it
- **OpenAI/Anthropic/AI SDK**: Thread management is client-side only

### 4. UI Components

#### ChatThreadController

Provides the UI for thread management:

- Create new threads
- Switch between threads
- Delete threads (except default and current)
- Display thread metadata (message count, last message preview)

#### FloatingCedarChat Integration

```tsx
<FloatingCedarChat
	showThreadController={true} // Enable thread UI
	// ... other props
/>
```

## How It All Works Together

### Creating a New Thread

```typescript
1. User clicks "New Thread" in ChatThreadController
2. createThread() called → Generates new threadId
3. New thread added to threadMap
4. switchThread(newThreadId) called
5. mainThreadId updated → messages array synced
6. UI re-renders with empty chat
```

### Switching Threads

```typescript
1. User selects thread from list
2. switchThread(threadId) called
3. mainThreadId updated
4. messages array synced with new thread's messages
5. UI re-renders with selected thread's messages
6. messageStorage loads persisted messages if needed
```

### Sending Messages

```typescript
1. User types and sends message
2. addMessage() adds to threadMap[mainThreadId].messages
3. messages array updated (for backward compatibility)
4. agentConnectionSlice.sendMessage() includes threadId
5. Response added to same thread
6. Message persisted via messageStorage
```

### Message Persistence

```typescript
// Automatic persistence flow
1. Message added to thread
2. If isComplete=true, persistMessageStorageMessage() called
3. Storage adapter saves: (userId, threadId, message)
4. Thread metadata updated (lastUpdated, title)

// Loading on app start
1. initializeChat() called
2. loadAndSelectThreads() fetches thread list
3. Messages loaded for selected thread
4. UI hydrated with persisted data
```

## Provider-Specific Behaviors

### Mastra Provider

- Receives `threadId` in all requests
- Can maintain server-side thread state
- Supports thread-specific context and memory
- Notification polling uses `mainThreadId`

### OpenAI/Anthropic Providers

- Thread management is client-side only
- No `threadId` sent to API
- Messages stored locally only

### Custom Providers

- Can optionally receive `threadId`
- Implementation-specific thread handling
- Flexible integration options

## Backward Compatibility

The system maintains backward compatibility through:

1. **messages property**: Always synced with current thread
2. **Default thread**: Always exists, used when no threadId specified
3. **Optional threadId**: All methods work without explicit threadId
4. **Legacy hooks**: `useMessages()` continues to work

## Example Usage

### Basic Thread Management

```tsx
import { ChatThreadController } from 'cedar-os-components';

function MyChat() {
	return (
		<ChatThreadController
			onThreadChange={(threadId) => {
				console.log('Switched to thread:', threadId);
			}}
		/>
	);
}
```

### Programmatic Thread Control

```typescript
import { useThreadController } from 'cedar-os';

function MyComponent() {
  const {
    currentThreadId,
    threadIds,
    createThread,
    switchThread,
    deleteThread
  } = useThreadController();

  const handleNewConversation = () => {
    const newId = createThread();
    switchThread(newId);
  };

  return (
    // Your UI
  );
}
```

### Thread-Specific Messages

```typescript
import { useThreadMessages } from 'cedar-os';

function ThreadView({ threadId }) {
  const {
    messages,
    addMessage,
    clearMessages,
    isCurrentThread
  } = useThreadMessages(threadId);

  return (
    // Render messages for specific thread
  );
}
```

## Best Practices

1. **Thread Creation**: Create new threads for distinct conversations
2. **Thread Naming**: Update thread titles based on first message or topic
3. **Thread Cleanup**: Delete old threads to manage storage
4. **Default Thread**: Use for quick, one-off conversations
5. **Thread Switching**: Save draft messages before switching
6. **Storage**: Configure appropriate storage adapter for your needs

## Migration Guide

For existing Cedar OS users:

1. **No breaking changes**: Existing code continues to work
2. **Opt-in threads**: Enable with `showThreadController` prop
3. **Storage migration**: Existing messages go to default thread
4. **Gradual adoption**: Add thread support incrementally

## Troubleshooting

### Messages not persisting

- Check storage adapter configuration
- Verify userId is set
- Ensure messageStorage is initialized

### Thread not switching

- Verify thread exists in threadMap
- Check mainThreadId updates
- Ensure UI is using correct hooks

### Provider not receiving threadId

- Mastra: Check baseURL and route configuration
- Custom: Verify backend expects threadId
- Others: threadId is not sent (by design)

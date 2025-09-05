# useThreadController Infinite Re-render Fix

## Problem

The `useThreadController` hook was causing infinite re-renders whenever it was used in components. This was happening because:

1. The hook was using `Object.keys(state.threadMap)` directly in a Zustand selector
2. `Object.keys()` creates a new array reference on every call, even if the keys are the same
3. Zustand's default equality check uses referential equality (===)
4. Since a new array was created on every render, components using this hook would re-render infinitely

## Original Code

```typescript
export const useThreadController = () => {
	const mainThreadId = useCedarStore((state) => state.mainThreadId);
	// This line was causing the issue
	const threadIds = useCedarStore((state) => Object.keys(state.threadMap));
	// ...
};
```

## Solution

The fix uses React's `useMemo` hook to memoize the thread IDs array:

```typescript
export const useThreadController = () => {
	const mainThreadId = useCedarStore((state) => state.mainThreadId);
	// Get threadMap and memoize the thread IDs to prevent infinite re-renders
	const threadMap = useCedarStore((state) => state.threadMap);
	const threadIds = useMemo(() => Object.keys(threadMap), [threadMap]);
	// ...
};
```

## How It Works

1. First, we select the entire `threadMap` object from the store
2. Then we use `useMemo` to compute `Object.keys(threadMap)`
3. The memoized value only changes when `threadMap` itself changes
4. This prevents creating a new array reference on every render

## Alternative Solutions Considered

### 1. Custom Equality Function (Not Used)

We could have used Zustand's equality function parameter, but the basic `create` function doesn't have built-in support for this in its TypeScript types:

```typescript
// This approach would require additional type definitions
const threadIds = useCedarStore(
	(state) => Object.keys(state.threadMap),
	(a, b) => a.length === b.length && a.every((id, i) => id === b[i])
);
```

### 2. Zustand Shallow Equality (Not Used)

We could import `shallow` from 'zustand/shallow', but the current solution with `useMemo` is simpler and doesn't require additional imports.

## Test Coverage

A comprehensive test suite was added to verify the fix:

1. **No infinite re-renders**: Verifies that the hook only renders once initially
2. **Stable threadIds reference**: Ensures the array reference stays the same when threadMap doesn't change
3. **Updates when needed**: Confirms threadIds updates when threadMap actually changes
4. **Stable function references**: Verifies all returned functions maintain stable references

## Lessons Learned

When using Zustand selectors:

1. Be careful with operations that create new references (like `Object.keys()`, `Array.map()`, etc.)
2. Consider memoizing derived values to prevent unnecessary re-renders
3. Always test hooks that use selectors for render performance
4. Add tests to catch infinite re-render issues early

## Related Files

- Fixed in: `/packages/cedar-os/src/store/CedarStore.ts`
- Test file: `/packages/cedar-os/__tests__/store/messages/useThreadController.test.tsx`
- Used in: `/src/app/examples/cedar-playground/page.tsx`

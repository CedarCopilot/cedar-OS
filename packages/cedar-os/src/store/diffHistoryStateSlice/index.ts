// Export types
export type { DiffMode, DiffState, DiffHistoryState } from './diffHistorySlice';

// Re-export Operation type from fast-json-patch for convenience
export type { Operation } from 'fast-json-patch';

// Export slice
export { createDiffHistorySlice } from './diffHistorySlice';
export type { DiffHistorySlice } from './diffHistorySlice';

// Export hook
export { useCedarDiffState } from './useCedarDiffState';

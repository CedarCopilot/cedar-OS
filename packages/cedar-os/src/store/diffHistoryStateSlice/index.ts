// Export types
export type {
	DiffMode,
	DiffState,
	DiffHistoryState,
	ComputeStateFunction,
} from './diffHistorySlice';

// Re-export Operation type from fast-json-patch for convenience
export type { Operation } from 'fast-json-patch';

// Export slice
export { createDiffHistorySlice } from './diffHistorySlice';
export type { DiffHistorySlice } from './diffHistorySlice';

// Export hooks
export { useCedarDiffState } from './useCedarDiffState';
export {
	useSubscribeToDiffValue,
	useSubscribeToDiffValues,
	type DiffValue,
	type UseSubscribeToDiffValueOptions,
} from './useSubscribeToDiffValue';
export {
	useRegisterDiffState,
	addDiffToArrayObjs,
	type RegisterDiffStateConfig,
	type DiffStateReturn,
} from './useRegisterDiffState';
export { useDiffState, useDiffStateOperations } from './useDiffState';

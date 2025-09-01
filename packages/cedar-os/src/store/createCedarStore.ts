import { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
import { createAgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
import type { CedarStore } from '@/store/CedarOSTypes';
import { createDebuggerSlice } from '@/store/debugger/debuggerSlice';
import { createDiffHistorySlice } from '@/store/diffHistoryStateSlice/diffHistorySlice';
import { createMessagesSlice } from '@/store/messages/messagesSlice';
import { createSpellSlice } from '@/store/spellSlice/spellSlice';
import { createStateSlice } from '@/store/stateSlice/stateSlice';
import { createStylingSlice } from '@/store/stylingSlice';
import { createToolsSlice } from '@/store/toolsSlice/toolsSlice';
import { createVoiceSlice } from '@/store/voice/voiceSlice';
import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

// Type helper to extract state from StateCreator
type ExtractState<S> = S extends StateCreator<infer T, any, any, any>
	? T
	: never;

// Type helper to merge multiple slices
type MergeSlices<T extends readonly StateCreator<any, any, any, any>[]> =
	T extends readonly [
		...infer Rest extends StateCreator<any, any, any, any>[],
		infer Last extends StateCreator<any, any, any, any>
	]
		? ExtractState<Last> & MergeSlices<Rest>
		: {};

// Default slices that are always included
const createDefaultSlices: StateCreator<CedarStore, [], [], CedarStore> = (
	...a
) => ({
	...createStylingSlice(...a),
	...createAgentInputContextSlice(...a),
	...createStateSlice(...a),
	...createAgentConnectionSlice(...a),
	...createMessagesSlice(...a),
	...createSpellSlice(...a),
	...createDiffHistorySlice(...a),
	...createVoiceSlice(...a),
	...createDebuggerSlice(...a),
	...createToolsSlice(...a),
});

// Options for creating a Cedar store
export interface CreateCedarStoreOptions<
	TSlices extends readonly StateCreator<CedarStore, [], [], unknown>[] = []
> {
	extend?: TSlices;
	persistOptions?: {
		name?: string;
		partialize?: (state: CedarStore) => Partial<CedarStore>;
	};
}

// Create Cedar store with optional extensions
export function createCedarStore<
	TSlices extends readonly StateCreator<any, any, any, any>[] = []
>(options?: CreateCedarStoreOptions<TSlices>) {
	const { extend = [], persistOptions = {} } = options || {};

	// The extended state type includes all slices
	type ExtendedState = CedarStore & MergeSlices<TSlices>;

	return create<ExtendedState>()(
		persist(
			(set, get, api) => {
				// Start with default slices including messages
				let state = {
					...createDefaultSlices(set, get, api),
				};

				// Apply extended slices (they will override if they have the same properties)
				for (const slice of extend) {
					const sliceResult = slice(set, get, api);
					if (sliceResult && typeof sliceResult === 'object') {
						state = { ...state, ...sliceResult };
					}
				}

				return state as ExtendedState;
			},
			{
				name: persistOptions.name || 'cedar-store',
				partialize:
					persistOptions.partialize ||
					((state) => ({
						messages: state.messages,
					})),
			}
		)
	);
}

// Default export for basic usage - creates a store with default slices
export const createDefaultCedarStore = createCedarStore();

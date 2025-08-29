import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAgentInputContextSlice } from '@/store/agentInputContext/agentInputContextSlice';
import { createStylingSlice } from '@/store/stylingSlice';
import { createStateSlice } from '@/store/stateSlice/stateSlice';
import { createMessagesSlice } from '@/store/messages/messagesSlice';
import { createAgentConnectionSlice } from '@/store/agentConnection/agentConnectionSlice';
import type { CedarStore } from '@/store/CedarOSTypes';
import { createSpellSlice } from '@/store/spellSlice/spellSlice';
import { createToolsSlice } from '@/store/toolsSlice/toolsSlice';

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

// Default slices that are always included (except messages)
const createDefaultSlices = (set: any, get: any, api: any) => ({
	...createStylingSlice(set, get, api),
	...createAgentInputContextSlice(set, get, api),
	...createStateSlice(set, get, api),
	...createAgentConnectionSlice(set, get, api),
	...createMessagesSlice(set, get, api),
	...createSpellSlice(set, get, api),
	...createToolsSlice(set, get, api),
});

// Options for creating a Cedar store
export interface CreateCedarStoreOptions<
	TSlices extends readonly StateCreator<any, any, any, any>[] = []
> {
	extend?: TSlices;
	persistOptions?: {
		name?: string;
		partialize?: (state: any) => any;
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
					state = { ...state, ...slice(set, get, api) };
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
export const createDefaultCedarStore = () => createCedarStore();

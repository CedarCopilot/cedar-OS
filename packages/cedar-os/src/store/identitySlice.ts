import type { StateCreator } from 'zustand';
import type { CedarStore } from './types';

export interface IdentitySlice {
	userId: string | null;
	setUserId: (id: string | null) => void;
}

export const createIdentitySlice: StateCreator<
	CedarStore,
	[],
	[],
	IdentitySlice
> = (set) => ({
	userId: null,
	setUserId: (id) => {
		set({ userId: id });
	},
});

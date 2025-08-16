import { StateCreator } from 'zustand';

export type DiffMode = 'defaultAccept' | 'holdAccept';

export interface DiffState<T = unknown> {
	oldState: T;
	newState: T;
	isDiffMode: boolean;
}

export interface DiffHistoryState<T = unknown> {
	diffState: DiffState<T>;
	history: DiffState<T>[];
	diffMode: DiffMode;
}

export interface DiffHistorySlice {
	diffHistoryStates: Record<string, DiffHistoryState>;

	// Methods will be added in the next step as per user instructions
	getDiffHistoryState: <T>(key: string) => DiffHistoryState<T> | undefined;
	setDiffHistoryState: <T>(
		key: string,
		diffHistoryState: DiffHistoryState<T>
	) => void;
	getCleanState: <T>(key: string) => T | undefined;
}

export const createDiffHistorySlice: StateCreator<
	DiffHistorySlice,
	[],
	[],
	DiffHistorySlice
> = (set, get) => ({
	diffHistoryStates: {},

	getDiffHistoryState: <T>(key: string): DiffHistoryState<T> | undefined => {
		return get().diffHistoryStates[key] as DiffHistoryState<T> | undefined;
	},

	setDiffHistoryState: <T>(
		key: string,
		diffHistoryState: DiffHistoryState<T>
	) => {
		set((state) => ({
			diffHistoryStates: {
				...state.diffHistoryStates,
				[key]: diffHistoryState,
			},
		}));
	},

	getCleanState: <T>(key: string): T | undefined => {
		const diffHistoryState = get().getDiffHistoryState<T>(key);
		if (!diffHistoryState) return undefined;

		const { diffState, diffMode } = diffHistoryState;

		// Return the appropriate state based on diffMode
		if (diffMode === 'defaultAccept') {
			return diffState.newState;
		} else {
			// holdAccept
			return diffState.oldState;
		}
	},
});

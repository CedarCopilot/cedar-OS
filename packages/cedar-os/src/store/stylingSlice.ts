import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import React from 'react';

export interface StylingConfig {
	darkMode: boolean;
	color: string;
	secondaryColor: string;
	accentColor: string;
	iconComponent?: React.ReactElement;
}

export interface StylingState {
	styling: StylingConfig;
}

export interface StylingActions {
	setStyling: (styling: Partial<StylingConfig>) => void;
	toggleDarkMode: () => void;
}

export type StylingSlice = StylingState & StylingActions;

const DEFAULT_STYLING: StylingConfig = {
	darkMode: false,
	color: '#93C5FD', // blue-300
	secondaryColor: '#1D4ED8', // blue-700
	accentColor: '#FB923C', // orange-400
};

export const createStylingSlice: StateCreator<
	CedarStore,
	[],
	[],
	StylingSlice
> = (set) => ({
	// Initial state
	styling: DEFAULT_STYLING,

	// Actions
	setStyling: (newStyling) =>
		set((state) => ({
			styling: { ...state.styling, ...newStyling },
		})),

	toggleDarkMode: () =>
		set((state) => ({
			styling: { ...state.styling, darkMode: !state.styling.darkMode },
		})),
});

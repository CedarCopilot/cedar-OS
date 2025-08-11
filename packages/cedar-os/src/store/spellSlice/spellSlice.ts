import { StateCreator } from 'zustand';
import type { CedarStore } from '../types';

//--------------------------------------------------------------------------
// Refactor 2025-01-14
//--------------------------------------------------------------------------
// The spell system now uses a simple map of spellId to boolean (active state).
// This removes the complexity of hotkey bindings and spell configurations,
// making the system more straightforward and easier to manage.
//--------------------------------------------------------------------------

//--------------------------------------------------------------------------
// Spell type system --------------------------------------------------------
//--------------------------------------------------------------------------

// Simple map of spell ID to active state
export type SpellMap = Record<string, boolean>;

export interface SpellSlice {
	/**
	 * Map of spell IDs to their active state (true = active, false = inactive)
	 */
	spells: Partial<SpellMap>;

	/** Add a new spell to the system (defaults to inactive) */
	addSpell: (spellId: string) => void;

	/** Remove a spell from the system */
	removeSpell: (spellId: string) => void;

	/** Activate a spell (set to active) */
	activateSpell: (spellId: string) => void;

	/** Deactivate a spell (set to inactive) */
	deactivateSpell: (spellId: string) => void;

	/** Toggle a spell's active state */
	toggleSpell: (spellId: string) => void;

	/** Clear all spells */
	clearSpells: () => void;
}

// Initial spells (all start as inactive) --------------------------------------------
const initialSpells: SpellMap = {};

export const createSpellSlice: StateCreator<CedarStore, [], [], SpellSlice> = (
	set,
	get
) => {
	return {
		// -----------------------------------------------------------------
		// State
		// -----------------------------------------------------------------
		spells: initialSpells,

		// -----------------------------------------------------------------
		// Actions
		// -----------------------------------------------------------------
		addSpell: (spellId) =>
			set((state: CedarStore) => ({
				spells: {
					...state.spells,
					[spellId]: false, // New spells default to inactive
				},
			})),

		removeSpell: (spellId) =>
			set((state: CedarStore) => {
				const newSpells = { ...state.spells };
				delete newSpells[spellId];
				return { spells: newSpells };
			}),

		activateSpell: (spellId) =>
			set((state: CedarStore) => ({
				spells: {
					...state.spells,
					[spellId]: true,
				},
			})),

		deactivateSpell: (spellId) =>
			set((state: CedarStore) => ({
				spells: {
					...state.spells,
					[spellId]: false,
				},
			})),

		toggleSpell: (spellId) => {
			const state = get();
			const currentState = state.spells[spellId];
			if (currentState === undefined) return;

			set({
				spells: {
					...state.spells,
					[spellId]: !currentState,
				},
			});
		},

		clearSpells: () => set({ spells: {} }),
	};
};

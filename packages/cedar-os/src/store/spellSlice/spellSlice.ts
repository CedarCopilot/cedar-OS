import { StateCreator } from 'zustand';
import type { CedarStore } from '@/store/CedarOSTypes';
import SpellActivationManager from '@/store/spellSlice/SpellActivationManager';
import type {
	ActivationConditions,
	ActivationState,
} from '@/store/spellSlice/SpellTypes';

//--------------------------------------------------------------------------
// Refactor 2025-01-14 - Unified Spell System
//--------------------------------------------------------------------------
// The spell system now provides a unified API that combines spell registration
// with activation conditions. The SpellActivationManager is integrated directly
// into the slice, providing both event-based and programmatic control.
//--------------------------------------------------------------------------

//--------------------------------------------------------------------------
// Spell type system --------------------------------------------------------
//--------------------------------------------------------------------------

// Spell registration configuration
export interface SpellRegistration {
	id: string;
	activationConditions: ActivationConditions;
	onActivate?: (state: ActivationState) => void;
	onDeactivate?: () => void;
	preventDefaultEvents?: boolean;
	ignoreInputElements?: boolean;
}

// Store spell state and configuration together
export interface SpellState {
	isActive: boolean;
	registration: SpellRegistration;
}

// Map of spell ID to spell state
export type SpellMap = Record<string, SpellState>;

export interface SpellSlice {
	/**
	 * Map of spell IDs to their state and configuration
	 */
	spells: Partial<SpellMap>;

	/**
	 * Register a spell with activation conditions
	 * This combines adding the spell and setting up activation conditions
	 */
	registerSpell: (registration: SpellRegistration) => void;

	/**
	 * Unregister a spell and clean up its activation conditions
	 */
	unregisterSpell: (spellId: string) => void;

	/** Programmatically activate a spell */
	activateSpell: (
		spellId: string,
		triggerData?: ActivationState['triggerData']
	) => void;

	/** Programmatically deactivate a spell */
	deactivateSpell: (spellId: string) => void;

	/** Toggle a spell's active state programmatically */
	toggleSpell: (spellId: string) => void;

	/** Clear all spells */
	clearSpells: () => void;
}

// Get the singleton SpellActivationManager instance
// Remove the static manager variable - access it dynamically instead

// Initial spells (empty) --------------------------------------------
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

		registerSpell: (registration) => {
			const manager = SpellActivationManager.getInstance();
			const { id, activationConditions, onActivate, onDeactivate, ...options } =
				registration;

			// Add spell to state with its configuration
			set((state) => ({
				spells: {
					...state.spells,
					[id]: {
						isActive: false,
						registration,
					},
				},
			}));

			// Register with SpellActivationManager
			manager.register(id, activationConditions, {
				onActivate: (state) => {
					// Update store state
					set((store) => ({
						spells: {
							...store.spells,
							[id]: {
								...store.spells[id]!,
								isActive: true,
							},
						},
					}));
					// Call user callback
					onActivate?.(state);
				},
				onDeactivate: () => {
					// Update store state
					set((store) => ({
						spells: {
							...store.spells,
							[id]: {
								...store.spells[id]!,
								isActive: false,
							},
						},
					}));
					// Call user callback
					onDeactivate?.();
				},
				preventDefaultEvents: options.preventDefaultEvents,
				ignoreInputElements: options.ignoreInputElements,
			});
		},

		unregisterSpell: (spellId) => {
			const manager = SpellActivationManager.getInstance();
			// Unregister from manager
			manager.unregister(spellId);

			// Update state
			set((state) => {
				const newSpells = { ...state.spells };
				delete newSpells[spellId];
				return { spells: newSpells };
			});
		},

		activateSpell: (spellId, triggerData) => {
			const spell = get().spells[spellId];
			if (!spell) return;

			// Update state
			set((state) => ({
				spells: {
					...state.spells,
					[spellId]: {
						...spell,
						isActive: true,
					},
				},
			}));

			// Call the onActivate callback if registered
			spell.registration.onActivate?.({
				isActive: true,
				triggerData,
			});
		},

		deactivateSpell: (spellId) => {
			const spell = get().spells[spellId];
			if (!spell) return;

			// Update state
			set((state) => ({
				spells: {
					...state.spells,
					[spellId]: {
						...spell,
						isActive: false,
					},
				},
			}));

			// Call the onDeactivate callback if registered
			spell.registration.onDeactivate?.();
		},

		toggleSpell: (spellId) => {
			const state = get();
			const spell = state.spells[spellId];
			if (!spell) return;

			if (spell.isActive) {
				state.deactivateSpell(spellId);
			} else {
				state.activateSpell(spellId);
			}
		},

		clearSpells: () => {
			const manager = SpellActivationManager.getInstance();
			// Reset the manager completely (clears all registrations and state)
			manager.reset();

			// Clear state
			set({ spells: {} });
		},
	};
};

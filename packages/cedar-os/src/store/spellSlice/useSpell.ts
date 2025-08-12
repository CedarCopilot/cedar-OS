'use client';

import { useEffect, useRef } from 'react';
import { useSpells } from '@/store/CedarStore';
import type {
	ActivationConditions,
	ActivationState,
} from '@/store/spellSlice/SpellTypes';

export interface UseSpellOptions {
	/** Unique identifier for the spell */
	id: string;
	/** Activation conditions (keyboard, mouse, selection events) */
	activationConditions: ActivationConditions;
	/** Callback when spell is activated */
	onActivate?: (state: ActivationState) => void;
	/** Callback when spell is deactivated */
	onDeactivate?: () => void;
	/** Whether to prevent default browser behavior for activation events */
	preventDefaultEvents?: boolean;
	/** Whether to ignore activation when focus is in input elements */
	ignoreInputElements?: boolean;
}

export interface UseSpellReturn {
	/** Whether the spell is currently active */
	isActive: boolean;
	/** Programmatically activate the spell */
	activate: () => void;
	/** Programmatically deactivate the spell */
	deactivate: () => void;
	/** Toggle the spell's active state */
	toggle: () => void;
}

/**
 * Hook for registering and managing a spell with activation conditions.
 * This is the primary way to use spells in components.
 *
 * @example
 * ```tsx
 * const { isActive } = useSpell({
 *   id: 'my-spell',
 *   activationConditions: {
 *     events: [Hotkey.SPACE, MouseEvent.RIGHT_CLICK],
 *     mode: ActivationMode.HOLD
 *   },
 *   onActivate: (state) => {
 *     console.log('Spell activated!', state.triggerData);
 *   },
 *   onDeactivate: () => {
 *     console.log('Spell deactivated!');
 *   }
 * });
 * ```
 */
export function useSpell(options: UseSpellOptions): UseSpellReturn {
	const {
		spells,
		registerSpell,
		unregisterSpell,
		activateSpell,
		deactivateSpell,
		toggleSpell,
	} = useSpells();

	// Use refs for callbacks to avoid re-registration
	const onActivateRef = useRef(options.onActivate);
	const onDeactivateRef = useRef(options.onDeactivate);

	// Update refs when callbacks change
	useEffect(() => {
		onActivateRef.current = options.onActivate;
		onDeactivateRef.current = options.onDeactivate;
	}, [options.onActivate, options.onDeactivate]);

	// Register the spell on mount and when key dependencies change
	useEffect(() => {
		registerSpell({
			id: options.id,
			activationConditions: options.activationConditions,
			onActivate: (state) => onActivateRef.current?.(state),
			onDeactivate: () => onDeactivateRef.current?.(),
			preventDefaultEvents: options.preventDefaultEvents,
			ignoreInputElements: options.ignoreInputElements,
		});

		// Cleanup: unregister on unmount
		return () => {
			unregisterSpell(options.id);
		};
	}, [
		options.id,
		// Stringify conditions to detect deep changes
		JSON.stringify(options.activationConditions),
		options.preventDefaultEvents,
		options.ignoreInputElements,
		registerSpell,
		unregisterSpell,
	]);

	// Get the spell state
	const spell = spells[options.id];
	const isActive = spell?.isActive ?? false;

	// Return the spell state and control methods
	return {
		isActive,
		activate: () => activateSpell(options.id),
		deactivate: () => deactivateSpell(options.id),
		toggle: () => toggleSpell(options.id),
	};
}

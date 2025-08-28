'use client';

import { useEffect, useRef } from 'react';
import { useSpells } from '@/store/CedarStore';
import type { UseSpellOptions } from './useSpell';

export interface UseMultipleSpellsOptions {
	/** Array of spell configurations to register */
	spells: UseSpellOptions[];
}

/**
 * Hook for registering multiple spells at once.
 * This solves the "hooks in loops" problem when you need to register
 * a dynamic number of spells based on an array.
 *
 * @example
 * ```tsx
 * const spellConfigs = items
 *   .filter(item => item.shortcut)
 *   .map(item => ({
 *     id: `item-${item.id}`,
 *     activationConditions: { events: [item.shortcut] },
 *     onActivate: () => item.action()
 *   }));
 *
 * useMultipleSpells({ spells: spellConfigs });
 * ```
 */
export function useMultipleSpells({ spells }: UseMultipleSpellsOptions): void {
	const { registerSpell, unregisterSpell } = useSpells();

	// Use refs to store callbacks and avoid unnecessary re-registrations
	const callbackRefs = useRef<
		Map<
			string,
			{
				onActivate?: UseSpellOptions['onActivate'];
				onDeactivate?: UseSpellOptions['onDeactivate'];
			}
		>
	>(new Map());

	// Update callback refs when spells change
	useEffect(() => {
		const newCallbackRefs = new Map();
		spells.forEach((spell) => {
			newCallbackRefs.set(spell.id, {
				onActivate: spell.onActivate,
				onDeactivate: spell.onDeactivate,
			});
		});
		callbackRefs.current = newCallbackRefs;
	}, [spells]);

	// Register/unregister spells when the array changes
	useEffect(() => {
		const currentSpellIds = new Set(spells.map((spell) => spell.id));

		// Register all spells
		spells.forEach((spell) => {
			const callbacks = callbackRefs.current.get(spell.id);

			registerSpell({
				id: spell.id,
				activationConditions: spell.activationConditions,
				onActivate: (state) => callbacks?.onActivate?.(state),
				onDeactivate: () => callbacks?.onDeactivate?.(),
				preventDefaultEvents: spell.preventDefaultEvents,
				ignoreInputElements: spell.ignoreInputElements,
			});
		});

		// Cleanup function to unregister all spells
		return () => {
			currentSpellIds.forEach((spellId) => {
				unregisterSpell(spellId);
			});
		};
	}, [
		// Create a stable dependency by stringifying the spell configurations
		JSON.stringify(
			spells.map((spell) => ({
				id: spell.id,
				activationConditions: spell.activationConditions,
				preventDefaultEvents: spell.preventDefaultEvents,
				ignoreInputElements: spell.ignoreInputElements,
			}))
		),
		registerSpell,
		unregisterSpell,
	]);
}

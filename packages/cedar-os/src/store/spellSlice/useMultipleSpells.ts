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

	// Track currently registered spells
	const currentSpellIds = useRef<Set<string>>(new Set());

	// Register/unregister spells when the spells array changes
	useEffect(() => {
		const newSpellIds = new Set(spells.map((spell) => spell.id));
		const previousSpellIds = currentSpellIds.current;

		// Unregister spells that are no longer needed
		for (const spellId of previousSpellIds) {
			if (!newSpellIds.has(spellId)) {
				unregisterSpell(spellId);
			}
		}

		// Register/re-register all current spells
		spells.forEach((spell) => {
			registerSpell({
				id: spell.id,
				activationConditions: spell.activationConditions,
				onActivate: spell.onActivate,
				onDeactivate: spell.onDeactivate,
				preventDefaultEvents: spell.preventDefaultEvents,
				ignoreInputElements: spell.ignoreInputElements,
			});
		});

		// Update tracking
		currentSpellIds.current = newSpellIds;
	}, [spells, registerSpell, unregisterSpell]);

	// Cleanup on unmount only
	useEffect(() => {
		return () => {
			// Unregister all spells on unmount
			for (const spellId of currentSpellIds.current) {
				unregisterSpell(spellId);
			}
			currentSpellIds.current.clear();
		};
	}, [unregisterSpell]);
}

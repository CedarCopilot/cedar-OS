'use client';

import { useEffect, useRef, useMemo } from 'react';
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

	// Create a stable configuration key that only changes when spell structure changes
	// We create a single string key instead of an array of objects to ensure stability
	const spellConfigKey = useMemo(() => {
		// Create a deterministic string key from spell configurations
		return spells
			.map((spell) => {
				const conditionsStr = JSON.stringify(spell.activationConditions);
				return `${spell.id}|${conditionsStr}|${
					spell.preventDefaultEvents ?? false
				}|${spell.ignoreInputElements ?? false}`;
			})
			.join('::');
	}, [spells]);

	// Register/unregister spells when the configuration key changes
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
		// Use the stable string key which changes only when spell structure changes
		spellConfigKey,
		registerSpell,
		unregisterSpell,
	]);
}

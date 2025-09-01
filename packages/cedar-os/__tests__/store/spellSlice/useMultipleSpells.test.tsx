import { renderHook, act } from '@testing-library/react';
import { useMultipleSpells } from '../../../src/store/spellSlice/useMultipleSpells';
import { useCedarStore } from '../../../src/store/CedarStore';
import SpellActivationManager from '../../../src/store/spellSlice/SpellActivationManager';
import {
	Hotkey,
	ActivationMode,
} from '../../../src/store/spellSlice/SpellTypes';
import type { UseSpellOptions } from '../../../src/store/spellSlice/useSpell';

describe('useMultipleSpells', () => {
	beforeEach(async () => {
		// Destroy the singleton instance to ensure complete isolation
		SpellActivationManager.destroyInstance();

		// Clear all spells before each test
		await act(async () => {
			useCedarStore.getState().clearSpells();
			// Wait for effects to complete
			await new Promise((resolve) => setTimeout(resolve, 0));
		});
	});

	afterEach(async () => {
		// Clean up after each test
		await act(async () => {
			useCedarStore.getState().clearSpells();
			// Wait for effects to complete
			await new Promise((resolve) => setTimeout(resolve, 0));
		});

		// Destroy the singleton instance after each test
		SpellActivationManager.destroyInstance();
	});

	describe('Basic functionality', () => {
		it('should register multiple spells when mounted', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			const state = useCedarStore.getState();
			expect(Object.keys(state.spells)).toHaveLength(2);
			expect(state.spells['spell-1']).toBeDefined();
			expect(state.spells['spell-2']).toBeDefined();
		});

		it('should unregister all spells when unmounted', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				},
			];

			const { unmount } = renderHook(() => useMultipleSpells({ spells }));

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(2);

			unmount();

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});

		it('should handle empty spell array', () => {
			renderHook(() => useMultipleSpells({ spells: [] }));

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});
	});

	describe('Callbacks', () => {
		it('should call onActivate callbacks for individual spells', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const spells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
					onActivate: mockActivate1,
				},
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
					onActivate: mockActivate2,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			// Activate spell-1
			act(() => {
				useCedarStore.getState().activateSpell('spell-1');
			});

			expect(mockActivate1).toHaveBeenCalledWith({
				isActive: true,
				triggerData: undefined,
			});
			expect(mockActivate2).not.toHaveBeenCalled();
		});

		it('should call onDeactivate callbacks for individual spells', () => {
			const mockDeactivate1 = jest.fn();
			const mockDeactivate2 = jest.fn();

			const spells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
					onDeactivate: mockDeactivate1,
				},
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
					onDeactivate: mockDeactivate2,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			// Activate then deactivate spell-1
			act(() => {
				useCedarStore.getState().activateSpell('spell-1');
			});

			act(() => {
				useCedarStore.getState().deactivateSpell('spell-1');
			});

			expect(mockDeactivate1).toHaveBeenCalled();
			expect(mockDeactivate2).not.toHaveBeenCalled();
		});

		it('should handle callback updates when spells prop changes', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const initialSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
					onActivate: mockActivate1,
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			// Activate the spell with first callback
			act(() => {
				useCedarStore.getState().activateSpell('spell-1');
			});

			expect(mockActivate1).toHaveBeenCalledTimes(1);

			// Update with new callback
			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
					onActivate: mockActivate2,
				},
			];

			rerender({ spells: updatedSpells });

			// Deactivate and reactivate to test new callback
			act(() => {
				useCedarStore.getState().deactivateSpell('spell-1');
			});

			act(() => {
				useCedarStore.getState().activateSpell('spell-1');
			});

			expect(mockActivate2).toHaveBeenCalledTimes(1);
		});
	});

	describe('Dynamic spell arrays', () => {
		it('should handle adding new spells', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(1);

			const updatedSpells: UseSpellOptions[] = [
				...initialSpells,
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				},
			];

			rerender({ spells: updatedSpells });

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(2);
			expect(useCedarStore.getState().spells['spell-1']).toBeDefined();
			expect(useCedarStore.getState().spells['spell-2']).toBeDefined();
		});

		it('should handle removing spells', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(2);

			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			rerender({ spells: updatedSpells });

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(1);
			expect(useCedarStore.getState().spells['spell-1']).toBeDefined();
			expect(useCedarStore.getState().spells['spell-2']).toBeUndefined();
		});

		it('should handle complete replacement of spell array', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(1);

			const replacementSpells: UseSpellOptions[] = [
				{
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				},
				{
					id: 'spell-3',
					activationConditions: { events: [Hotkey.C] },
				},
			];

			rerender({ spells: replacementSpells });

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(2);
			expect(useCedarStore.getState().spells['spell-1']).toBeUndefined();
			expect(useCedarStore.getState().spells['spell-2']).toBeDefined();
			expect(useCedarStore.getState().spells['spell-3']).toBeDefined();
		});
	});

	describe('Spell configurations', () => {
		it('should handle complex activation conditions', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'complex-spell',
					activationConditions: {
						events: [Hotkey.A, Hotkey.B],
						mode: ActivationMode.TOGGLE,
						cooldown: 1000,
					},
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			const spell = useCedarStore.getState().spells['complex-spell'];
			expect(spell).toBeDefined();
			expect(spell?.registration.activationConditions.events).toEqual([
				Hotkey.A,
				Hotkey.B,
			]);
			expect(spell?.registration.activationConditions.mode).toBe(
				ActivationMode.TOGGLE
			);
			expect(spell?.registration.activationConditions.cooldown).toBe(1000);
		});

		it('should handle spell ID changes', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'old-id',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(useCedarStore.getState().spells['old-id']).toBeDefined();

			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'new-id',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			rerender({ spells: updatedSpells });

			expect(useCedarStore.getState().spells['old-id']).toBeUndefined();
			expect(useCedarStore.getState().spells['new-id']).toBeDefined();
		});
	});

	describe('Performance and optimization', () => {
		it('should not re-register spells unnecessarily', () => {
			const registerSpy = jest.spyOn(useCedarStore.getState(), 'registerSpell');

			const spells: UseSpellOptions[] = [
				{
					id: 'stable-spell',
					activationConditions: { events: [Hotkey.A] },
				},
			];

			const { rerender } = renderHook(
				({ spells, otherProp }) => {
					useMultipleSpells({ spells });
					return otherProp;
				},
				{ initialProps: { spells, otherProp: 'initial' } }
			);

			const initialCallCount = registerSpy.mock.calls.length;

			// Rerender with different otherProp but same spells
			rerender({ spells, otherProp: 'changed' });

			// Should not have called registerSpell again
			expect(registerSpy.mock.calls.length).toBe(initialCallCount);

			registerSpy.mockRestore();
		});
	});
});

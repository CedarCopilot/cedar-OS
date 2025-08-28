import { renderHook, act } from '@testing-library/react';
import { useMultipleSpells } from '../../../src/store/spellSlice/useMultipleSpells';
import { useCedarStore } from '../../../src/store/CedarStore';
import {
	Hotkey,
	MouseEvent as SpellMouseEvent,
	ActivationMode,
} from '../../../src/store/spellSlice/SpellTypes';
import type { UseSpellOptions } from '../../../src/store/spellSlice/useSpell';

describe('useMultipleSpells', () => {
	beforeEach(() => {
		// Clear all spells before each test
		act(() => {
			useCedarStore.getState().clearSpells();
		});
	});

	afterEach(() => {
		// Clean up after each test
		act(() => {
			useCedarStore.getState().clearSpells();
		});
	});

	describe('Basic functionality', () => {
		it('should register multiple spells when mounted', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'spell-1',
					activationConditions: {
						events: [Hotkey.A],
					},
				},
				{
					id: 'spell-2',
					activationConditions: {
						events: [Hotkey.B],
					},
				},
				{
					id: 'spell-3',
					activationConditions: {
						events: [Hotkey.C],
					},
				},
			];

			const { result } = renderHook(() => useMultipleSpells({ spells }));

			const state = useCedarStore.getState();
			expect(Object.keys(state.spells)).toHaveLength(3);
			expect(state.spells['spell-1']).toBeDefined();
			expect(state.spells['spell-2']).toBeDefined();
			expect(state.spells['spell-3']).toBeDefined();
		});

		it('should unregister all spells when unmounted', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'temp-1',
					activationConditions: { events: [Hotkey.X] },
				},
				{
					id: 'temp-2',
					activationConditions: { events: [Hotkey.Y] },
				},
			];

			const { unmount } = renderHook(() => useMultipleSpells({ spells }));

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(2);

			unmount();

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});

		it('should handle empty spell array', () => {
			const spells: UseSpellOptions[] = [];

			const { result } = renderHook(() => useMultipleSpells({ spells }));

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});
	});

	describe('Callbacks', () => {
		it('should call onActivate callbacks for individual spells', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const spells: UseSpellOptions[] = [
				{
					id: 'callback-1',
					activationConditions: { events: [Hotkey.F1] },
					onActivate: mockActivate1,
				},
				{
					id: 'callback-2',
					activationConditions: { events: [Hotkey.F2] },
					onActivate: mockActivate2,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			act(() => {
				useCedarStore.getState().activateSpell('callback-1');
			});

			expect(mockActivate1).toHaveBeenCalledTimes(1);
			expect(mockActivate2).not.toHaveBeenCalled();

			act(() => {
				useCedarStore.getState().activateSpell('callback-2');
			});

			expect(mockActivate1).toHaveBeenCalledTimes(1);
			expect(mockActivate2).toHaveBeenCalledTimes(1);
		});

		it('should call onDeactivate callbacks for individual spells', () => {
			const mockDeactivate1 = jest.fn();
			const mockDeactivate2 = jest.fn();

			const spells: UseSpellOptions[] = [
				{
					id: 'deactivate-1',
					activationConditions: { events: [Hotkey.G] },
					onDeactivate: mockDeactivate1,
				},
				{
					id: 'deactivate-2',
					activationConditions: { events: [Hotkey.H] },
					onDeactivate: mockDeactivate2,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			act(() => {
				useCedarStore.getState().activateSpell('deactivate-1');
				useCedarStore.getState().activateSpell('deactivate-2');
			});

			act(() => {
				useCedarStore.getState().deactivateSpell('deactivate-1');
			});

			expect(mockDeactivate1).toHaveBeenCalledTimes(1);
			expect(mockDeactivate2).not.toHaveBeenCalled();
		});

		it('should handle callback updates when spells prop changes', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const initialSpells: UseSpellOptions[] = [
				{
					id: 'update-spell',
					activationConditions: { events: [Hotkey.U] },
					onActivate: mockActivate1,
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			act(() => {
				useCedarStore.getState().activateSpell('update-spell');
			});

			expect(mockActivate1).toHaveBeenCalledTimes(1);

			// Update with new callback
			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'update-spell',
					activationConditions: { events: [Hotkey.U] },
					onActivate: mockActivate2,
				},
			];

			rerender({ spells: updatedSpells });

			act(() => {
				useCedarStore.getState().activateSpell('update-spell');
			});

			// The new callback should be called
			expect(mockActivate2).toHaveBeenCalledTimes(1);
		});
	});

	describe('Dynamic spell arrays', () => {
		it('should handle adding new spells', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'initial-1',
					activationConditions: { events: [Hotkey.I] },
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
					id: 'initial-2',
					activationConditions: { events: [Hotkey.J] },
				},
				{
					id: 'initial-3',
					activationConditions: { events: [Hotkey.K] },
				},
			];

			rerender({ spells: updatedSpells });

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(3);
			expect(useCedarStore.getState().spells['initial-2']).toBeDefined();
			expect(useCedarStore.getState().spells['initial-3']).toBeDefined();
		});

		it('should handle removing spells', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'remove-1',
					activationConditions: { events: [Hotkey.R] },
				},
				{
					id: 'remove-2',
					activationConditions: { events: [Hotkey.E] },
				},
				{
					id: 'remove-3',
					activationConditions: { events: [Hotkey.M] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(3);

			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'remove-1',
					activationConditions: { events: [Hotkey.R] },
				},
			];

			rerender({ spells: updatedSpells });

			// Should unregister removed spells and keep only the remaining one
			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(1);
			expect(useCedarStore.getState().spells['remove-1']).toBeDefined();
			expect(useCedarStore.getState().spells['remove-2']).toBeUndefined();
			expect(useCedarStore.getState().spells['remove-3']).toBeUndefined();
		});

		it('should handle complete replacement of spell array', () => {
			const firstSet: UseSpellOptions[] = [
				{
					id: 'first-1',
					activationConditions: { events: [Hotkey.F1] },
				},
				{
					id: 'first-2',
					activationConditions: { events: [Hotkey.F2] },
				},
			];

			const secondSet: UseSpellOptions[] = [
				{
					id: 'second-1',
					activationConditions: { events: [Hotkey.F3] },
				},
				{
					id: 'second-2',
					activationConditions: { events: [Hotkey.F4] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: firstSet } }
			);

			expect(useCedarStore.getState().spells['first-1']).toBeDefined();
			expect(useCedarStore.getState().spells['first-2']).toBeDefined();

			rerender({ spells: secondSet });

			expect(useCedarStore.getState().spells['first-1']).toBeUndefined();
			expect(useCedarStore.getState().spells['first-2']).toBeUndefined();
			expect(useCedarStore.getState().spells['second-1']).toBeDefined();
			expect(useCedarStore.getState().spells['second-2']).toBeDefined();
		});
	});

	describe('Spell configurations', () => {
		it('should handle complex activation conditions', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'complex-1',
					activationConditions: {
						events: [Hotkey.SPACE, SpellMouseEvent.RIGHT_CLICK],
						mode: ActivationMode.HOLD,
						cooldown: 1000,
					},
					preventDefaultEvents: true,
					ignoreInputElements: false,
				},
				{
					id: 'complex-2',
					activationConditions: {
						events: ['ctrl+s', 'cmd+s'],
						mode: ActivationMode.TRIGGER,
					},
					preventDefaultEvents: false,
					ignoreInputElements: true,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			const state = useCedarStore.getState();
			const spell1 = state.spells['complex-1'];
			const spell2 = state.spells['complex-2'];

			expect(spell1?.registration.activationConditions.mode).toBe(
				ActivationMode.HOLD
			);
			expect(spell1?.registration.activationConditions.cooldown).toBe(1000);
			expect(spell1?.registration.preventDefaultEvents).toBe(true);
			expect(spell1?.registration.ignoreInputElements).toBe(false);

			expect(spell2?.registration.activationConditions.mode).toBe(
				ActivationMode.TRIGGER
			);
			expect(spell2?.registration.preventDefaultEvents).toBe(false);
			expect(spell2?.registration.ignoreInputElements).toBe(true);
		});

		it('should handle spell ID changes', () => {
			const initialSpells: UseSpellOptions[] = [
				{
					id: 'original-id',
					activationConditions: { events: [Hotkey.O] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: initialSpells } }
			);

			expect(useCedarStore.getState().spells['original-id']).toBeDefined();

			const updatedSpells: UseSpellOptions[] = [
				{
					id: 'new-id',
					activationConditions: { events: [Hotkey.N] },
				},
			];

			rerender({ spells: updatedSpells });

			expect(useCedarStore.getState().spells['original-id']).toBeUndefined();
			expect(useCedarStore.getState().spells['new-id']).toBeDefined();
		});
	});

	describe('Performance and optimization', () => {
		it('should not re-register spells unnecessarily', () => {
			const registerSpy = jest.spyOn(useCedarStore.getState(), 'registerSpell');

			const spells: UseSpellOptions[] = [
				{
					id: 'perf-spell',
					activationConditions: { events: [Hotkey.P] },
				},
			];

			const { rerender } = renderHook(
				({ spells, otherProp }) => useMultipleSpells({ spells }),
				{
					initialProps: {
						spells,
						otherProp: 1,
					},
				}
			);

			const initialCallCount = registerSpy.mock.calls.length;

			// Rerender with same spells but different unrelated prop
			rerender({ spells, otherProp: 2 });

			// Should not register again since spells didn't change
			expect(registerSpy.mock.calls.length).toBe(initialCallCount);

			registerSpy.mockRestore();
		});

		it('should handle rapid spell array updates', () => {
			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells: [] } }
			);

			// Rapidly update spells
			for (let i = 0; i < 10; i++) {
				const spells: UseSpellOptions[] = Array.from(
					{ length: i + 1 },
					(_, index) => ({
						id: `rapid-${index}`,
						activationConditions: { events: [Hotkey.A] },
					})
				);

				rerender({ spells });
			}

			// Should end up with the final set of spells
			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(10);
		});
	});

	describe('Edge cases', () => {
		it('should handle duplicate IDs in spell array', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'duplicate',
					activationConditions: { events: [Hotkey.D] },
					onActivate: jest.fn(),
				},
				{
					id: 'duplicate', // Same ID
					activationConditions: { events: [Hotkey.U] },
					onActivate: jest.fn(),
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			// Should have only one spell with the duplicate ID (last one wins)
			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(1);
			const spell = useCedarStore.getState().spells['duplicate'];
			expect(spell?.registration.activationConditions.events[0]).toBe(Hotkey.U);
		});

		it('should handle undefined callbacks gracefully', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'no-callbacks',
					activationConditions: { events: [Hotkey.N] },
					onActivate: undefined,
					onDeactivate: undefined,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			expect(() => {
				act(() => {
					useCedarStore.getState().activateSpell('no-callbacks');
					useCedarStore.getState().deactivateSpell('no-callbacks');
				});
			}).not.toThrow();
		});

		it('should handle very large spell arrays', () => {
			const largeSpellArray: UseSpellOptions[] = Array.from(
				{ length: 100 },
				(_, index) => ({
					id: `large-${index}`,
					activationConditions: {
						events: [`ctrl+${index}`],
					},
				})
			);

			const { result } = renderHook(() =>
				useMultipleSpells({ spells: largeSpellArray })
			);

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(100);
		});
	});

	describe('Integration with spell system', () => {
		it('should work with mixed activation modes', () => {
			const toggleActivate = jest.fn();
			const holdActivate = jest.fn();
			const triggerActivate = jest.fn();

			const spells: UseSpellOptions[] = [
				{
					id: 'toggle-mode',
					activationConditions: {
						events: [Hotkey.T],
						mode: ActivationMode.TOGGLE,
					},
					onActivate: toggleActivate,
				},
				{
					id: 'hold-mode',
					activationConditions: {
						events: [Hotkey.H],
						mode: ActivationMode.HOLD,
					},
					onActivate: holdActivate,
				},
				{
					id: 'trigger-mode',
					activationConditions: {
						events: [Hotkey.R],
						mode: ActivationMode.TRIGGER,
						cooldown: 100,
					},
					onActivate: triggerActivate,
				},
			];

			renderHook(() => useMultipleSpells({ spells }));

			const state = useCedarStore.getState();
			expect(
				state.spells['toggle-mode']?.registration.activationConditions.mode
			).toBe(ActivationMode.TOGGLE);
			expect(
				state.spells['hold-mode']?.registration.activationConditions.mode
			).toBe(ActivationMode.HOLD);
			expect(
				state.spells['trigger-mode']?.registration.activationConditions.mode
			).toBe(ActivationMode.TRIGGER);
		});

		it('should maintain spell state across rerenders', () => {
			const spells: UseSpellOptions[] = [
				{
					id: 'persistent',
					activationConditions: { events: [Hotkey.P] },
				},
			];

			const { rerender } = renderHook(
				({ spells }) => useMultipleSpells({ spells }),
				{ initialProps: { spells } }
			);

			act(() => {
				useCedarStore.getState().activateSpell('persistent');
			});

			expect(useCedarStore.getState().spells['persistent']?.isActive).toBe(
				true
			);

			// Rerender with same spells
			rerender({ spells });

			// State should be maintained
			expect(useCedarStore.getState().spells['persistent']?.isActive).toBe(
				true
			);
		});
	});
});

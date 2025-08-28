import { renderHook, act } from '@testing-library/react';
import { useSpell } from '../../../src/store/spellSlice/useSpell';
import { useCedarStore } from '../../../src/store/CedarStore';
import {
	Hotkey,
	MouseEvent as SpellMouseEvent,
	ActivationMode,
} from '../../../src/store/spellSlice/SpellTypes';

describe('useSpell', () => {
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

	describe('Registration and cleanup', () => {
		it('should register spell on mount', () => {
			renderHook(() =>
				useSpell({
					id: 'test-spell',
					activationConditions: {
						events: [Hotkey.SPACE],
					},
				})
			);

			const state = useCedarStore.getState();
			expect(state.spells['test-spell']).toBeDefined();
			expect(state.spells['test-spell']?.isActive).toBe(false);
		});

		it('should unregister spell on unmount', () => {
			const { unmount } = renderHook(() =>
				useSpell({
					id: 'cleanup-spell',
					activationConditions: {
						events: [Hotkey.C],
					},
				})
			);

			expect(useCedarStore.getState().spells['cleanup-spell']).toBeDefined();

			unmount();

			expect(useCedarStore.getState().spells['cleanup-spell']).toBeUndefined();
		});

		it('should re-register when id changes', () => {
			const { rerender } = renderHook(
				({ id }) =>
					useSpell({
						id,
						activationConditions: {
							events: [Hotkey.R],
						},
					}),
				{ initialProps: { id: 'original-id' } }
			);

			expect(useCedarStore.getState().spells['original-id']).toBeDefined();

			rerender({ id: 'new-id' });

			expect(useCedarStore.getState().spells['original-id']).toBeUndefined();
			expect(useCedarStore.getState().spells['new-id']).toBeDefined();
		});
	});

	describe('Return values', () => {
		it('should return isActive state', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'active-spell',
					activationConditions: {
						events: [Hotkey.A],
					},
				})
			);

			expect(result.current.isActive).toBe(false);

			act(() => {
				useCedarStore.getState().activateSpell('active-spell');
			});

			expect(result.current.isActive).toBe(true);
		});

		it('should provide activate method', () => {
			const mockActivate = jest.fn();

			const { result } = renderHook(() =>
				useSpell({
					id: 'activate-method',
					activationConditions: {
						events: [Hotkey.M],
					},
					onActivate: mockActivate,
				})
			);

			act(() => {
				result.current.activate();
			});

			expect(useCedarStore.getState().spells['activate-method']?.isActive).toBe(
				true
			);
			expect(mockActivate).toHaveBeenCalledWith({
				isActive: true,
				triggerData: undefined,
			});
		});

		it('should provide deactivate method', () => {
			const mockDeactivate = jest.fn();

			const { result } = renderHook(() =>
				useSpell({
					id: 'deactivate-method',
					activationConditions: {
						events: [Hotkey.D],
					},
					onDeactivate: mockDeactivate,
				})
			);

			act(() => {
				result.current.activate();
				result.current.deactivate();
			});

			expect(
				useCedarStore.getState().spells['deactivate-method']?.isActive
			).toBe(false);
			expect(mockDeactivate).toHaveBeenCalledTimes(1);
		});

		it('should provide toggle method', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'toggle-method',
					activationConditions: {
						events: [Hotkey.T],
					},
				})
			);

			expect(result.current.isActive).toBe(false);

			act(() => {
				result.current.toggle();
			});

			expect(result.current.isActive).toBe(true);

			act(() => {
				result.current.toggle();
			});

			expect(result.current.isActive).toBe(false);
		});
	});

	describe('Callbacks', () => {
		it('should call onActivate when activated', () => {
			const mockActivate = jest.fn();

			renderHook(() =>
				useSpell({
					id: 'on-activate',
					activationConditions: {
						events: [Hotkey.O],
					},
					onActivate: mockActivate,
				})
			);

			act(() => {
				useCedarStore.getState().activateSpell('on-activate');
			});

			expect(mockActivate).toHaveBeenCalledTimes(1);
			expect(mockActivate).toHaveBeenCalledWith({
				isActive: true,
				triggerData: undefined,
			});
		});

		it('should call onDeactivate when deactivated', () => {
			const mockDeactivate = jest.fn();

			renderHook(() =>
				useSpell({
					id: 'on-deactivate',
					activationConditions: {
						events: [Hotkey.D],
					},
					onDeactivate: mockDeactivate,
				})
			);

			act(() => {
				useCedarStore.getState().activateSpell('on-deactivate');
				useCedarStore.getState().deactivateSpell('on-deactivate');
			});

			expect(mockDeactivate).toHaveBeenCalledTimes(1);
		});

		it('should handle callback updates without re-registering', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const { rerender } = renderHook(
				({ onActivate }) =>
					useSpell({
						id: 'callback-update',
						activationConditions: {
							events: [Hotkey.U],
						},
						onActivate,
					}),
				{ initialProps: { onActivate: mockActivate1 } }
			);

			act(() => {
				useCedarStore.getState().activateSpell('callback-update');
			});

			expect(mockActivate1).toHaveBeenCalledTimes(1);
			expect(mockActivate2).not.toHaveBeenCalled();

			// Update callback
			rerender({ onActivate: mockActivate2 });

			act(() => {
				useCedarStore.getState().activateSpell('callback-update');
			});

			// New callback should be called
			expect(mockActivate1).toHaveBeenCalledTimes(1); // Still 1
			expect(mockActivate2).toHaveBeenCalledTimes(1);
		});
	});

	describe('Activation conditions', () => {
		it('should handle multiple activation events', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'multi-events',
					activationConditions: {
						events: [Hotkey.SPACE, Hotkey.ENTER, SpellMouseEvent.RIGHT_CLICK],
					},
				})
			);

			const spell = useCedarStore.getState().spells['multi-events'];
			expect(spell?.registration.activationConditions.events).toHaveLength(3);
		});

		it('should handle different activation modes', () => {
			const { result: toggleResult } = renderHook(() =>
				useSpell({
					id: 'toggle-mode',
					activationConditions: {
						events: [Hotkey.T],
						mode: ActivationMode.TOGGLE,
					},
				})
			);

			const { result: holdResult } = renderHook(() =>
				useSpell({
					id: 'hold-mode',
					activationConditions: {
						events: [Hotkey.H],
						mode: ActivationMode.HOLD,
					},
				})
			);

			const { result: triggerResult } = renderHook(() =>
				useSpell({
					id: 'trigger-mode',
					activationConditions: {
						events: [Hotkey.R],
						mode: ActivationMode.TRIGGER,
						cooldown: 500,
					},
				})
			);

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
			expect(
				state.spells['trigger-mode']?.registration.activationConditions.cooldown
			).toBe(500);
		});

		it('should handle keyboard combos', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'combo-spell',
					activationConditions: {
						events: ['ctrl+s', 'cmd+shift+p', 'alt+enter'],
					},
				})
			);

			const spell = useCedarStore.getState().spells['combo-spell'];
			expect(spell?.registration.activationConditions.events).toEqual([
				'ctrl+s',
				'cmd+shift+p',
				'alt+enter',
			]);
		});

		it('should re-register when activation conditions change', () => {
			const { rerender } = renderHook(
				({ events }) =>
					useSpell({
						id: 'conditions-change',
						activationConditions: {
							events,
						},
					}),
				{ initialProps: { events: [Hotkey.A] } }
			);

			let spell = useCedarStore.getState().spells['conditions-change'];
			expect(spell?.registration.activationConditions.events).toEqual([
				Hotkey.A,
			]);

			rerender({ events: [Hotkey.B, Hotkey.C] });

			spell = useCedarStore.getState().spells['conditions-change'];
			expect(spell?.registration.activationConditions.events).toEqual([
				Hotkey.B,
				Hotkey.C,
			]);
		});
	});

	describe('Options', () => {
		it('should handle preventDefaultEvents option', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'prevent-default',
					activationConditions: {
						events: [Hotkey.P],
					},
					preventDefaultEvents: true,
				})
			);

			const spell = useCedarStore.getState().spells['prevent-default'];
			expect(spell?.registration.preventDefaultEvents).toBe(true);
		});

		it('should handle ignoreInputElements option', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'ignore-inputs',
					activationConditions: {
						events: [Hotkey.I],
					},
					ignoreInputElements: false,
				})
			);

			const spell = useCedarStore.getState().spells['ignore-inputs'];
			expect(spell?.registration.ignoreInputElements).toBe(false);
		});

		it('should re-register when options change', () => {
			const { rerender } = renderHook(
				({ preventDefault }) =>
					useSpell({
						id: 'options-change',
						activationConditions: {
							events: [Hotkey.O],
						},
						preventDefaultEvents: preventDefault,
					}),
				{ initialProps: { preventDefault: false } }
			);

			let spell = useCedarStore.getState().spells['options-change'];
			expect(spell?.registration.preventDefaultEvents).toBe(false);

			rerender({ preventDefault: true });

			spell = useCedarStore.getState().spells['options-change'];
			expect(spell?.registration.preventDefaultEvents).toBe(true);
		});
	});

	describe('Edge cases', () => {
		it('should handle undefined callbacks', () => {
			const { result } = renderHook(() =>
				useSpell({
					id: 'undefined-callbacks',
					activationConditions: {
						events: [Hotkey.U],
					},
					onActivate: undefined,
					onDeactivate: undefined,
				})
			);

			expect(() => {
				act(() => {
					result.current.activate();
					result.current.deactivate();
				});
			}).not.toThrow();
		});

		it('should handle rapid activation/deactivation', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			const { result } = renderHook(() =>
				useSpell({
					id: 'rapid-toggle',
					activationConditions: {
						events: [Hotkey.R],
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				})
			);

			act(() => {
				for (let i = 0; i < 10; i++) {
					result.current.activate();
					result.current.deactivate();
				}
			});

			expect(mockActivate).toHaveBeenCalledTimes(10);
			expect(mockDeactivate).toHaveBeenCalledTimes(10);
		});

		it('should handle multiple instances with same id', () => {
			const mockActivate1 = jest.fn();
			const mockActivate2 = jest.fn();

			const { result: result1 } = renderHook(() =>
				useSpell({
					id: 'duplicate-id',
					activationConditions: {
						events: [Hotkey.D],
					},
					onActivate: mockActivate1,
				})
			);

			const { result: result2 } = renderHook(() =>
				useSpell({
					id: 'duplicate-id', // Same ID
					activationConditions: {
						events: [Hotkey.U],
					},
					onActivate: mockActivate2,
				})
			);

			// Second registration should overwrite the first
			const spell = useCedarStore.getState().spells['duplicate-id'];
			expect(spell?.registration.activationConditions.events[0]).toBe(Hotkey.U);

			act(() => {
				useCedarStore.getState().activateSpell('duplicate-id');
			});

			// Only the second callback should be called
			expect(mockActivate1).not.toHaveBeenCalled();
			expect(mockActivate2).toHaveBeenCalledTimes(1);
		});
	});

	describe('Integration', () => {
		it('should work with store actions', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			const { result } = renderHook(() =>
				useSpell({
					id: 'store-integration',
					activationConditions: {
						events: [Hotkey.S],
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				})
			);

			// Use store action to activate
			act(() => {
				useCedarStore.getState().activateSpell('store-integration');
			});

			expect(result.current.isActive).toBe(true);
			expect(mockActivate).toHaveBeenCalledTimes(1);

			// Use hook method to deactivate
			act(() => {
				result.current.deactivate();
			});

			expect(result.current.isActive).toBe(false);
			expect(mockDeactivate).toHaveBeenCalledTimes(1);

			// Use store action to toggle
			act(() => {
				useCedarStore.getState().toggleSpell('store-integration');
			});

			expect(result.current.isActive).toBe(true);
		});

		it('should maintain state across rerenders', () => {
			const { result, rerender } = renderHook(
				({ extraProp }) =>
					useSpell({
						id: 'persistent-state',
						activationConditions: {
							events: [Hotkey.P],
						},
					}),
				{ initialProps: { extraProp: 1 } }
			);

			act(() => {
				result.current.activate();
			});

			expect(result.current.isActive).toBe(true);

			// Rerender with different prop
			rerender({ extraProp: 2 });

			// State should be maintained
			expect(result.current.isActive).toBe(true);
		});

		it('should handle complex lifecycle', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			const { result, unmount, rerender } = renderHook(
				({ id }) =>
					useSpell({
						id,
						activationConditions: {
							events: [Hotkey.L],
							mode: ActivationMode.TOGGLE,
						},
						onActivate: mockActivate,
						onDeactivate: mockDeactivate,
					}),
				{ initialProps: { id: 'lifecycle-1' } }
			);

			// Activate
			act(() => {
				result.current.activate();
			});
			expect(mockActivate).toHaveBeenCalledTimes(1);

			// Toggle
			act(() => {
				result.current.toggle();
			});
			expect(mockDeactivate).toHaveBeenCalledTimes(1);

			// Change ID
			rerender({ id: 'lifecycle-2' });

			// Old spell should be unregistered
			expect(useCedarStore.getState().spells['lifecycle-1']).toBeUndefined();
			expect(useCedarStore.getState().spells['lifecycle-2']).toBeDefined();

			// New spell should start inactive
			expect(result.current.isActive).toBe(false);
		});
	});
});

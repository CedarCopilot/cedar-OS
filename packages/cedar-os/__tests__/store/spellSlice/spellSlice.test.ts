import { act } from 'react-dom/test-utils';
import { useCedarStore } from '../../../src/store/CedarStore';
import {
	Hotkey,
	MouseEvent as SpellMouseEvent,
	ActivationMode,
} from '../../../src/store/spellSlice/SpellTypes';

describe('SpellSlice', () => {
	beforeEach(() => {
		// Reset the store before each test
		act(() => {
			useCedarStore.getState().clearSpells();
		});
	});

	describe('registerSpell', () => {
		it('should register a spell with basic configuration', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'test-spell',
					activationConditions: {
						events: [Hotkey.SPACE],
						mode: ActivationMode.TOGGLE,
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				});
			});

			const state = useCedarStore.getState();
			expect(state.spells['test-spell']).toBeDefined();
			expect(state.spells['test-spell']?.isActive).toBe(false);
			expect(state.spells['test-spell']?.registration.id).toBe('test-spell');
		});

		it('should register multiple spells', () => {
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'spell-1',
					activationConditions: {
						events: [Hotkey.A],
					},
				});

				useCedarStore.getState().registerSpell({
					id: 'spell-2',
					activationConditions: {
						events: [Hotkey.B],
					},
				});
			});

			const state = useCedarStore.getState();
			expect(Object.keys(state.spells)).toHaveLength(2);
			expect(state.spells['spell-1']).toBeDefined();
			expect(state.spells['spell-2']).toBeDefined();
		});

		it('should handle complex activation conditions', () => {
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'complex-spell',
					activationConditions: {
						events: [
							Hotkey.SPACE,
							SpellMouseEvent.RIGHT_CLICK,
							'ctrl+s',
							'cmd+shift+p',
						],
						mode: ActivationMode.HOLD,
						cooldown: 500,
					},
					preventDefaultEvents: true,
					ignoreInputElements: false,
				});
			});

			const spell = useCedarStore.getState().spells['complex-spell'];
			expect(spell?.registration.activationConditions.events).toHaveLength(4);
			expect(spell?.registration.activationConditions.mode).toBe(
				ActivationMode.HOLD
			);
			expect(spell?.registration.activationConditions.cooldown).toBe(500);
			expect(spell?.registration.preventDefaultEvents).toBe(true);
			expect(spell?.registration.ignoreInputElements).toBe(false);
		});

		it('should overwrite existing spell when registering with same id', () => {
			const firstActivate = jest.fn();
			const secondActivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'duplicate-spell',
					activationConditions: {
						events: [Hotkey.A],
					},
					onActivate: firstActivate,
				});
			});

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'duplicate-spell',
					activationConditions: {
						events: [Hotkey.B],
					},
					onActivate: secondActivate,
				});
			});

			const spell = useCedarStore.getState().spells['duplicate-spell'];
			expect(spell?.registration.activationConditions.events[0]).toBe(Hotkey.B);
			expect(spell?.registration.onActivate).toBe(secondActivate);
		});
	});

	describe('unregisterSpell', () => {
		it('should unregister an existing spell', () => {
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'temp-spell',
					activationConditions: {
						events: [Hotkey.T],
					},
				});
			});

			expect(useCedarStore.getState().spells['temp-spell']).toBeDefined();

			act(() => {
				useCedarStore.getState().unregisterSpell('temp-spell');
			});

			expect(useCedarStore.getState().spells['temp-spell']).toBeUndefined();
		});

		it('should handle unregistering non-existent spell gracefully', () => {
			expect(() => {
				act(() => {
					useCedarStore.getState().unregisterSpell('non-existent');
				});
			}).not.toThrow();
		});

		it('should deactivate active spell before unregistering', () => {
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'active-spell',
					activationConditions: {
						events: [Hotkey.A],
					},
					onDeactivate: mockDeactivate,
				});

				// Activate the spell
				useCedarStore.getState().activateSpell('active-spell');
			});

			expect(useCedarStore.getState().spells['active-spell']?.isActive).toBe(
				true
			);

			act(() => {
				useCedarStore.getState().unregisterSpell('active-spell');
			});

			expect(useCedarStore.getState().spells['active-spell']).toBeUndefined();
		});
	});

	describe('activateSpell', () => {
		it('should activate a registered spell', () => {
			const mockActivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'test-activate',
					activationConditions: {
						events: [Hotkey.ENTER],
					},
					onActivate: mockActivate,
				});
			});

			act(() => {
				useCedarStore.getState().activateSpell('test-activate');
			});

			expect(useCedarStore.getState().spells['test-activate']?.isActive).toBe(
				true
			);
			expect(mockActivate).toHaveBeenCalledWith({
				isActive: true,
				triggerData: undefined,
			});
		});

		it('should activate spell with trigger data', () => {
			const mockActivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'test-trigger-data',
					activationConditions: {
						events: [SpellMouseEvent.RIGHT_CLICK],
					},
					onActivate: mockActivate,
				});
			});

			const triggerData = {
				type: 'mouse' as const,
				event: SpellMouseEvent.RIGHT_CLICK,
				mousePosition: { x: 100, y: 200 },
			};

			act(() => {
				useCedarStore
					.getState()
					.activateSpell('test-trigger-data', triggerData);
			});

			expect(mockActivate).toHaveBeenCalledWith({
				isActive: true,
				triggerData,
			});
		});

		it('should not throw when activating non-existent spell', () => {
			expect(() => {
				act(() => {
					useCedarStore.getState().activateSpell('non-existent');
				});
			}).not.toThrow();
		});

		it('should handle multiple activations of same spell', () => {
			const mockActivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'multi-activate',
					activationConditions: {
						events: [Hotkey.M],
					},
					onActivate: mockActivate,
				});
			});

			act(() => {
				useCedarStore.getState().activateSpell('multi-activate');
				useCedarStore.getState().activateSpell('multi-activate');
				useCedarStore.getState().activateSpell('multi-activate');
			});

			expect(mockActivate).toHaveBeenCalledTimes(3);
			expect(useCedarStore.getState().spells['multi-activate']?.isActive).toBe(
				true
			);
		});
	});

	describe('deactivateSpell', () => {
		it('should deactivate an active spell', () => {
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'test-deactivate',
					activationConditions: {
						events: [Hotkey.D],
					},
					onDeactivate: mockDeactivate,
				});

				useCedarStore.getState().activateSpell('test-deactivate');
			});

			expect(useCedarStore.getState().spells['test-deactivate']?.isActive).toBe(
				true
			);

			act(() => {
				useCedarStore.getState().deactivateSpell('test-deactivate');
			});

			expect(useCedarStore.getState().spells['test-deactivate']?.isActive).toBe(
				false
			);
			expect(mockDeactivate).toHaveBeenCalledTimes(1);
		});

		it('should handle deactivating already inactive spell', () => {
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'inactive-spell',
					activationConditions: {
						events: [Hotkey.I],
					},
					onDeactivate: mockDeactivate,
				});
			});

			act(() => {
				useCedarStore.getState().deactivateSpell('inactive-spell');
			});

			expect(mockDeactivate).toHaveBeenCalledTimes(1);
		});

		it('should not throw when deactivating non-existent spell', () => {
			expect(() => {
				act(() => {
					useCedarStore.getState().deactivateSpell('non-existent');
				});
			}).not.toThrow();
		});
	});

	describe('toggleSpell', () => {
		it('should toggle inactive spell to active', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'toggle-spell',
					activationConditions: {
						events: [Hotkey.T],
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				});
			});

			act(() => {
				useCedarStore.getState().toggleSpell('toggle-spell');
			});

			expect(useCedarStore.getState().spells['toggle-spell']?.isActive).toBe(
				true
			);
			expect(mockActivate).toHaveBeenCalledTimes(1);
			expect(mockDeactivate).not.toHaveBeenCalled();
		});

		it('should toggle active spell to inactive', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'toggle-active',
					activationConditions: {
						events: [Hotkey.T],
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				});

				useCedarStore.getState().activateSpell('toggle-active');
			});

			mockActivate.mockClear();

			act(() => {
				useCedarStore.getState().toggleSpell('toggle-active');
			});

			expect(useCedarStore.getState().spells['toggle-active']?.isActive).toBe(
				false
			);
			expect(mockActivate).not.toHaveBeenCalled();
			expect(mockDeactivate).toHaveBeenCalledTimes(1);
		});

		it('should handle toggling non-existent spell', () => {
			expect(() => {
				act(() => {
					useCedarStore.getState().toggleSpell('non-existent');
				});
			}).not.toThrow();
		});

		it('should handle multiple toggles correctly', () => {
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'multi-toggle',
					activationConditions: {
						events: [Hotkey.M],
					},
				});
			});

			act(() => {
				useCedarStore.getState().toggleSpell('multi-toggle'); // activate
				expect(useCedarStore.getState().spells['multi-toggle']?.isActive).toBe(
					true
				);

				useCedarStore.getState().toggleSpell('multi-toggle'); // deactivate
				expect(useCedarStore.getState().spells['multi-toggle']?.isActive).toBe(
					false
				);

				useCedarStore.getState().toggleSpell('multi-toggle'); // activate
				expect(useCedarStore.getState().spells['multi-toggle']?.isActive).toBe(
					true
				);
			});
		});
	});

	describe('clearSpells', () => {
		it('should clear all registered spells', () => {
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'spell-1',
					activationConditions: { events: [Hotkey.A] },
				});
				useCedarStore.getState().registerSpell({
					id: 'spell-2',
					activationConditions: { events: [Hotkey.B] },
				});
				useCedarStore.getState().registerSpell({
					id: 'spell-3',
					activationConditions: { events: [Hotkey.C] },
				});
			});

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(3);

			act(() => {
				useCedarStore.getState().clearSpells();
			});

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});

		it('should handle clearing when no spells exist', () => {
			expect(() => {
				act(() => {
					useCedarStore.getState().clearSpells();
				});
			}).not.toThrow();

			expect(Object.keys(useCedarStore.getState().spells)).toHaveLength(0);
		});
	});

	describe('Integration tests', () => {
		it('should handle complete spell lifecycle', () => {
			const mockActivate = jest.fn();
			const mockDeactivate = jest.fn();

			// Register
			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'lifecycle-spell',
					activationConditions: {
						events: ['ctrl+l'],
						mode: ActivationMode.TOGGLE,
					},
					onActivate: mockActivate,
					onDeactivate: mockDeactivate,
				});
			});

			const getSpell = () => useCedarStore.getState().spells['lifecycle-spell'];

			expect(getSpell()).toBeDefined();
			expect(getSpell()?.isActive).toBe(false);

			// Activate
			act(() => {
				useCedarStore.getState().activateSpell('lifecycle-spell');
			});

			expect(getSpell()?.isActive).toBe(true);
			expect(mockActivate).toHaveBeenCalledTimes(1);

			// Toggle (should deactivate)
			act(() => {
				useCedarStore.getState().toggleSpell('lifecycle-spell');
			});

			expect(getSpell()?.isActive).toBe(false);
			expect(mockDeactivate).toHaveBeenCalledTimes(1);

			// Unregister
			act(() => {
				useCedarStore.getState().unregisterSpell('lifecycle-spell');
			});

			expect(getSpell()).toBeUndefined();
		});

		it('should manage multiple spells independently', () => {
			const spell1Activate = jest.fn();
			const spell2Activate = jest.fn();
			const spell3Activate = jest.fn();

			act(() => {
				useCedarStore.getState().registerSpell({
					id: 'independent-1',
					activationConditions: { events: [Hotkey.F1] },
					onActivate: spell1Activate,
				});
				useCedarStore.getState().registerSpell({
					id: 'independent-2',
					activationConditions: { events: [Hotkey.F2] },
					onActivate: spell2Activate,
				});
				useCedarStore.getState().registerSpell({
					id: 'independent-3',
					activationConditions: { events: [Hotkey.F3] },
					onActivate: spell3Activate,
				});
			});

			// Activate only spell 2
			act(() => {
				useCedarStore.getState().activateSpell('independent-2');
			});

			const state = useCedarStore.getState();
			expect(state.spells['independent-1']?.isActive).toBe(false);
			expect(state.spells['independent-2']?.isActive).toBe(true);
			expect(state.spells['independent-3']?.isActive).toBe(false);

			expect(spell1Activate).not.toHaveBeenCalled();
			expect(spell2Activate).toHaveBeenCalledTimes(1);
			expect(spell3Activate).not.toHaveBeenCalled();
		});
	});
});

import { act } from 'react-dom/test-utils';
import { useCedarStore } from '../../../src/store/CedarStore';

/**
 * Tests for the StateSlice to verify that state re-registration
 * properly updates all fields including function closures.
 * This is critical for components that remount with new closures.
 */

describe('StateSlice – state re-registration', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			registeredStates: {},
		}));
	});

	it('should update setValue and customSetters when re-registering', () => {
		const mockSetValue1 = jest.fn();
		const mockSetValue2 = jest.fn();
		const mockCustomSetter1 = jest.fn();
		const mockCustomSetter2 = jest.fn();

		// First registration (simulating initial mount)
		act(() => {
			useCedarStore.getState().registerState({
				key: 'testState',
				value: 'initial',
				setValue: mockSetValue1,
				customSetters: {
					testSetter: {
						name: 'testSetter',
						description: 'Test setter',
						execute: mockCustomSetter1,
					},
				},
			});
		});

		// Verify initial registration
		const state1 = useCedarStore.getState().registeredStates['testState'];
		expect(state1.setValue).toBe(mockSetValue1);
		expect(state1.customSetters?.testSetter.execute).toBe(mockCustomSetter1);

		// Re-register with new functions (simulating remount with new closures)
		act(() => {
			useCedarStore.getState().registerState({
				key: 'testState',
				value: 'updated',
				setValue: mockSetValue2,
				customSetters: {
					testSetter: {
						name: 'testSetter',
						description: 'Test setter',
						execute: mockCustomSetter2,
					},
				},
			});
		});

		// Verify ALL fields were updated, especially the function references
		const state2 = useCedarStore.getState().registeredStates['testState'];
		expect(state2.value).toBe('updated');
		expect(state2.setValue).toBe(mockSetValue2); // Should be the NEW function
		expect(state2.customSetters?.testSetter.execute).toBe(mockCustomSetter2); // Should be the NEW function

		// Test that the new functions are actually used
		act(() => {
			useCedarStore.getState().setCedarState('testState', 'newValue');
		});
		expect(mockSetValue2).toHaveBeenCalledWith('newValue');
		expect(mockSetValue1).not.toHaveBeenCalled(); // Old function should NOT be called

		act(() => {
			useCedarStore
				.getState()
				.executeCustomSetter('testState', 'testSetter', 'arg');
		});
		// The custom setter receives the current value which was set to 'newValue' by setCedarState
		expect(mockCustomSetter2).toHaveBeenCalledWith('newValue', 'arg');
		expect(mockCustomSetter1).not.toHaveBeenCalled(); // Old function should NOT be called
	});
});

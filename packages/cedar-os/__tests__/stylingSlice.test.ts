import { act } from 'react-dom/test-utils';
import { useCedarStore } from '../src/store/CedarStore';

/**
 * Basic unit test to verify the `toggleDarkMode` action correctly
 * flips the `styling.darkMode` flag in the global Cedar store.
 */

describe('stylingSlice – darkMode toggle', () => {
	beforeEach(() => {
		// Reset the store before each test to ensure isolation
		useCedarStore.setState((state) => ({
			styling: {
				...state.styling,
				darkMode: false,
			},
		}));
	});

	it('should toggle the darkMode flag', () => {
		const initial = useCedarStore.getState().styling.darkMode;

		act(() => {
			useCedarStore.getState().toggleDarkMode();
		});

		const toggled = useCedarStore.getState().styling.darkMode;
		expect(toggled).toBe(!initial);
	});
});

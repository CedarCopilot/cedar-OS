import { useCedarStore } from '../../../src/store/CedarStore';
import type {
	BasicStateValue,
	Setter,
} from '../../../src/store/stateSlice/stateSlice';

describe('executeDiffSetter', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			registeredStates: {},
			diffHistoryStates: {},
		}));
	});

	it('should execute custom setter on diff state and update with setDiffState', () => {
		const testKey = 'testState';
		const initialValue = { count: 0, text: 'hello' };

		// Create a custom setter
		const incrementSetter: Setter = {
			name: 'increment',
			description: 'Increments the count',
			execute: (
				state: BasicStateValue,
				setValue: (newValue: BasicStateValue) => void
			) => {
				const typedState = state as { count: number; text: string };
				const newState = { ...typedState, count: typedState.count + 1 };
				// Use the setValue parameter
				setValue(newState);
			},
		};

		// Register the state with custom setter
		useCedarStore.getState().registerState({
			key: testKey,
			value: initialValue,
			customSetters: {
				increment: incrementSetter,
			},
		});

		// Initialize diff history state
		useCedarStore.getState().setDiffState(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				computedState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Execute the diff setter with isDiff = true
		useCedarStore
			.getState()
			.executeDiffSetter(testKey, 'increment', { isDiff: true });

		// Check that the diff state was updated
		const diffState = useCedarStore.getState().getDiffHistoryState(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(true);
		expect(diffState?.diffState.newState).toEqual({ count: 1, text: 'hello' });
		expect(diffState?.diffState.oldState).toEqual(initialValue);
	});

	it('should intercept executeCustomSetter for diff-tracked states', () => {
		const testKey = 'testState';
		const initialValue = 'initial';

		// Register a state
		useCedarStore.getState().registerState({
			key: testKey,
			value: initialValue,
			customSetters: {
				append: {
					name: 'append',
					description: 'Appends text',
					execute: (
						state: BasicStateValue,
						setValue: (newValue: BasicStateValue) => void,
						suffix: string
					) => {
						setValue((state as string) + suffix);
					},
				},
			},
		});

		// Initialize diff history state
		useCedarStore.getState().setDiffState(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				computedState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Execute custom setter through executeCustomSetter
		useCedarStore.getState().executeCustomSetter({
			key: testKey,
			setterKey: 'append',
			options: { isDiff: true },
			args: [' modified'],
		});

		// Check that executeDiffSetter was called
		const diffState = useCedarStore.getState().getDiffHistoryState(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(true);
		expect(diffState?.diffState.newState).toBe('initial modified');
	});

	it('should intercept setCedarState for diff-tracked states', () => {
		const testKey = 'testState';
		const initialValue = 42;
		const newValue = 100;

		// Register a state
		useCedarStore.getState().registerState({
			key: testKey,
			value: initialValue,
		});

		// Initialize diff history state
		useCedarStore.getState().setDiffState(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				computedState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Set state through setCedarState (with default isDiffChange: false)
		useCedarStore.getState().setCedarState(testKey, newValue);

		// Check that newDiffState was called and state was updated
		const diffState = useCedarStore.getState().getDiffHistoryState(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(false); // Should remain false since isDiffChange defaults to false
		expect(diffState?.diffState.newState).toBe(newValue);
		expect(diffState?.diffState.oldState).toBe(newValue); // oldState should be newValue when not in diff mode
	});

	it('should handle non-diff-tracked states normally', () => {
		const testKey = 'normalState';
		const initialValue = 'normal';
		const newValue = 'updated';

		// Register a state without diff tracking
		useCedarStore.getState().registerState({
			key: testKey,
			value: initialValue,
		});

		// Set state through setCedarState (no diff history)
		useCedarStore.getState().setCedarState(testKey, newValue);

		// Check that the state was updated normally
		const state = useCedarStore.getState().getCedarState(testKey);
		expect(state).toBe(newValue);

		// Verify no diff history was created
		const diffState = useCedarStore.getState().getDiffHistoryState(testKey);
		expect(diffState).toBeUndefined();
	});
});

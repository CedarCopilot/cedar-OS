import { create } from 'zustand';
import { createDiffHistorySlice } from '../../../src/store/diffHistoryStateSlice/diffHistorySlice';
import {
	createStateSlice,
	type BasicStateValue,
} from '../../../src/store/stateSlice/stateSlice';
import type { CedarStore } from '../../../src/store/CedarOSTypes';
import type { Setter } from '../../../src/store/stateSlice/stateSlice';

describe('executeDiffSetter', () => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let store: any;

	beforeEach(() => {
		store = create<Partial<CedarStore>>()((...a) => ({
			...createStateSlice(...a),
			...createDiffHistorySlice(...a),
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
		store.getState().registerState?.({
			key: testKey,
			value: initialValue,
			customSetters: {
				increment: incrementSetter,
			},
		});

		// Initialize diff history state
		store.getState().setDiffState?.(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Execute the diff setter with isDiff = true
		store
			.getState()
			.executeDiffSetter?.(testKey, 'increment', { isDiff: true });

		// Check that the diff state was updated
		const diffState = store.getState().getDiffHistoryState?.(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(true);
		expect(diffState?.diffState.newState).toEqual({ count: 1, text: 'hello' });
		expect(diffState?.diffState.oldState).toEqual(initialValue);
	});

	it('should intercept executeCustomSetter for diff-tracked states', () => {
		const testKey = 'testState';
		const initialValue = 'initial';

		// Register a state
		store.getState().registerState?.({
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
		store.getState().setDiffState?.(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Execute custom setter through executeCustomSetter
		store.getState().executeCustomSetter?.({
			key: testKey,
			setterKey: 'append',
			options: { isDiff: true },
			args: [' modified'],
		});

		// Check that executeDiffSetter was called
		const diffState = store.getState().getDiffHistoryState?.(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(true);
		expect(diffState?.diffState.newState).toBe('initial modified');
	});

	it('should intercept setCedarState for diff-tracked states', () => {
		const testKey = 'testState';
		const initialValue = 42;
		const newValue = 100;

		// Register a state
		store.getState().registerState?.({
			key: testKey,
			value: initialValue,
		});

		// Initialize diff history state
		store.getState().setDiffState?.(testKey, {
			diffState: {
				oldState: initialValue,
				newState: initialValue,
				isDiffMode: false,
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		});

		// Set state through setCedarState
		store.getState().setCedarState?.(testKey, newValue, true);

		// Check that setDiffState was called
		const diffState = store.getState().getDiffHistoryState?.(testKey);
		expect(diffState?.diffState.isDiffMode).toBe(true);
		expect(diffState?.diffState.newState).toBe(newValue);
		expect(diffState?.diffState.oldState).toBe(initialValue);
	});

	it('should handle non-diff-tracked states normally', () => {
		const testKey = 'normalState';
		const initialValue = 'normal';
		const newValue = 'updated';

		// Register a state without diff tracking
		store.getState().registerState?.({
			key: testKey,
			value: initialValue,
		});

		// Set state through setCedarState (no diff history)
		store.getState().setCedarState?.(testKey, newValue);

		// Check that the state was updated normally
		const state = store.getState().getCedarState?.(testKey);
		expect(state).toBe(newValue);

		// Verify no diff history was created
		const diffState = store.getState().getDiffHistoryState?.(testKey);
		expect(diffState).toBeUndefined();
	});
});

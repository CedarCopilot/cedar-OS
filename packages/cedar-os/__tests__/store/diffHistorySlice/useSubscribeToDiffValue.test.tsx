import { renderHook, act } from '@testing-library/react';
import { useCedarStore } from '@/store/CedarStore';
import {
	useSubscribeToDiffValue,
	useSubscribeToDiffValues,
} from '@/store/diffHistoryStateSlice';
import { DiffHistoryState } from '@/store/diffHistoryStateSlice/diffHistorySlice';

describe('useSubscribeToDiffValue', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			diffHistoryStates: {},
		}));
	});

	describe('Basic functionality', () => {
		it('should return default values when diff history state does not exist', () => {
			const { result } = renderHook(() =>
				useSubscribeToDiffValue('nonExistent', '/title')
			);

			expect(result.current.oldValue).toBeUndefined();
			expect(result.current.newValue).toBeUndefined();
			expect(result.current.isDiffMode).toBe(false);
			expect(result.current.cleanValue).toBeUndefined();
			expect(result.current.hasChanges).toBe(false);
		});

		it('should return default value when specified and state does not exist', () => {
			const { result } = renderHook(() =>
				useSubscribeToDiffValue('nonExistent', '/title', {
					defaultValue: 'N/A',
				})
			);

			expect(result.current.oldValue).toBe('N/A');
			expect(result.current.newValue).toBe('N/A');
			expect(result.current.cleanValue).toBe('N/A');
		});

		it('should extract values from simple paths', () => {
			interface TestData {
				title: string;
				count: number;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { title: 'Old Title', count: 5 },
					newState: { title: 'New Title', count: 10 },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('testKey', testState);
			});

			const { result } = renderHook(() =>
				useSubscribeToDiffValue<string>('testKey', '/title')
			);

			expect(result.current.oldValue).toBe('Old Title');
			expect(result.current.newValue).toBe('New Title');
			expect(result.current.isDiffMode).toBe(true);
			expect(result.current.cleanValue).toBe('New Title'); // defaultAccept mode
			expect(result.current.hasChanges).toBe(true);
		});

		it('should extract values from nested paths', () => {
			interface TestData {
				user: {
					profile: {
						name: string;
						age: number;
					};
				};
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: {
						user: {
							profile: {
								name: 'John',
								age: 25,
							},
						},
					},
					newState: {
						user: {
							profile: {
								name: 'Jane',
								age: 30,
							},
						},
					},
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('nestedKey', testState);
			});

			const { result } = renderHook(() =>
				useSubscribeToDiffValue<string>('nestedKey', '/user/profile/name')
			);

			expect(result.current.oldValue).toBe('John');
			expect(result.current.newValue).toBe('Jane');
			expect(result.current.isDiffMode).toBe(false);
			expect(result.current.cleanValue).toBe('John'); // holdAccept mode
			expect(result.current.hasChanges).toBe(true);
		});

		it('should extract values from array paths', () => {
			interface TestData {
				items: Array<{ id: number; name: string }>;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: {
						items: [
							{ id: 1, name: 'Item 1' },
							{ id: 2, name: 'Item 2' },
						],
					},
					newState: {
						items: [
							{ id: 1, name: 'Updated Item 1' },
							{ id: 2, name: 'Item 2' },
							{ id: 3, name: 'Item 3' },
						],
					},
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('arrayKey', testState);
			});

			// Test accessing array element
			const { result: result1 } = renderHook(() =>
				useSubscribeToDiffValue<string>('arrayKey', '/items/0/name')
			);

			expect(result1.current.oldValue).toBe('Item 1');
			expect(result1.current.newValue).toBe('Updated Item 1');
			expect(result1.current.hasChanges).toBe(true);

			// Test accessing array element that doesn't exist in old state
			const { result: result2 } = renderHook(() =>
				useSubscribeToDiffValue<string>('arrayKey', '/items/2/name')
			);

			expect(result2.current.oldValue).toBeUndefined();
			expect(result2.current.newValue).toBe('Item 3');
			expect(result2.current.hasChanges).toBe(true);
		});

		it('should handle root path correctly', () => {
			interface TestData {
				value: string;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { value: 'old' },
					newState: { value: 'new' },
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore.getState().setDiffState('rootKey', testState);
			});

			// Test empty string path
			const { result: result1 } = renderHook(() =>
				useSubscribeToDiffValue<TestData>('rootKey', '')
			);

			expect(result1.current.oldValue).toEqual({ value: 'old' });
			expect(result1.current.newValue).toEqual({ value: 'new' });

			// Test single slash path
			const { result: result2 } = renderHook(() =>
				useSubscribeToDiffValue<TestData>('rootKey', '/')
			);

			expect(result2.current.oldValue).toEqual({ value: 'old' });
			expect(result2.current.newValue).toEqual({ value: 'new' });
		});
	});

	describe('Diff mode behavior', () => {
		it('should return correct cleanValue based on defaultAccept mode', () => {
			interface TestData {
				status: string;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { status: 'pending' },
					newState: { status: 'completed' },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('defaultAcceptKey', testState);
			});

			const { result } = renderHook(() =>
				useSubscribeToDiffValue<string>('defaultAcceptKey', '/status')
			);

			expect(result.current.cleanValue).toBe('completed'); // Uses newValue
		});

		it('should return correct cleanValue based on holdAccept mode', () => {
			interface TestData {
				status: string;
			}

			const testState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { status: 'pending' },
					newState: { status: 'completed' },
					isDiffMode: true,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'holdAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('holdAcceptKey', testState);
			});

			const { result } = renderHook(() =>
				useSubscribeToDiffValue<string>('holdAcceptKey', '/status')
			);

			expect(result.current.cleanValue).toBe('pending'); // Uses oldValue
		});
	});

	describe('Reactivity', () => {
		it('should update when diff state changes', () => {
			interface TestData {
				counter: number;
			}

			const initialState: DiffHistoryState<TestData> = {
				diffState: {
					oldState: { counter: 0 },
					newState: { counter: 1 },
					isDiffMode: false,
					patches: [],
				},
				history: [],
				redoStack: [],
				diffMode: 'defaultAccept',
			};

			act(() => {
				useCedarStore
					.getState()
					.setDiffState('reactiveKey', initialState);
			});

			const { result } = renderHook(() =>
				useSubscribeToDiffValue<number>('reactiveKey', '/counter')
			);

			expect(result.current.oldValue).toBe(0);
			expect(result.current.newValue).toBe(1);

			// Update the state
			act(() => {
				useCedarStore
					.getState()
					.setDiffState('reactiveKey', { counter: 5 }, true);
			});

			// Hook should reflect the changes
			expect(result.current.oldValue).toBe(1); // Previous newState becomes oldState
			expect(result.current.newValue).toBe(5);
			expect(result.current.isDiffMode).toBe(true);
		});
	});
});

describe('useSubscribeToDiffValues', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			diffHistoryStates: {},
		}));
	});

	it('should extract multiple values at once', () => {
		interface TestData {
			title: string;
			description: string;
			status: string;
			priority: number;
		}

		const testState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: {
					title: 'Old Title',
					description: 'Old Description',
					status: 'pending',
					priority: 1,
				},
				newState: {
					title: 'New Title',
					description: 'New Description',
					status: 'completed',
					priority: 3,
				},
				isDiffMode: true,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'defaultAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('multiKey', testState);
		});

		const { result } = renderHook(() =>
			useSubscribeToDiffValues('multiKey', [
				'/title',
				'/description',
				'/status',
				'/priority',
			])
		);

		expect(result.current['/title'].oldValue).toBe('Old Title');
		expect(result.current['/title'].newValue).toBe('New Title');
		expect(result.current['/title'].hasChanges).toBe(true);

		expect(result.current['/description'].oldValue).toBe('Old Description');
		expect(result.current['/description'].newValue).toBe('New Description');

		expect(result.current['/status'].oldValue).toBe('pending');
		expect(result.current['/status'].newValue).toBe('completed');

		expect(result.current['/priority'].oldValue).toBe(1);
		expect(result.current['/priority'].newValue).toBe(3);
		expect(result.current['/priority'].cleanValue).toBe(3); // defaultAccept
	});

	it('should handle mixed nested and simple paths', () => {
		interface TestData {
			id: string;
			user: {
				name: string;
				settings: {
					theme: string;
				};
			};
			tags: string[];
		}

		const testState: DiffHistoryState<TestData> = {
			diffState: {
				oldState: {
					id: 'abc123',
					user: {
						name: 'John',
						settings: {
							theme: 'light',
						},
					},
					tags: ['tag1', 'tag2'],
				},
				newState: {
					id: 'abc123',
					user: {
						name: 'Jane',
						settings: {
							theme: 'dark',
						},
					},
					tags: ['tag1', 'tag2', 'tag3'],
				},
				isDiffMode: false,
				patches: [],
			},
			history: [],
			redoStack: [],
			diffMode: 'holdAccept',
		};

		act(() => {
			useCedarStore.getState().setDiffState('mixedKey', testState);
		});

		const { result } = renderHook(() =>
			useSubscribeToDiffValues('mixedKey', [
				'/id',
				'/user/name',
				'/user/settings/theme',
				'/tags/2',
			])
		);

		expect(result.current['/id'].oldValue).toBe('abc123');
		expect(result.current['/id'].newValue).toBe('abc123');
		expect(result.current['/id'].hasChanges).toBe(false);

		expect(result.current['/user/name'].oldValue).toBe('John');
		expect(result.current['/user/name'].newValue).toBe('Jane');
		expect(result.current['/user/name'].cleanValue).toBe('John'); // holdAccept

		expect(result.current['/user/settings/theme'].oldValue).toBe('light');
		expect(result.current['/user/settings/theme'].newValue).toBe('dark');

		expect(result.current['/tags/2'].oldValue).toBeUndefined();
		expect(result.current['/tags/2'].newValue).toBe('tag3');
	});

	it('should return default values for non-existent state', () => {
		const { result } = renderHook(() =>
			useSubscribeToDiffValues('nonExistent', ['/a', '/b', '/c'], {
				defaultValue: 'DEFAULT',
			})
		);

		expect(result.current['/a'].oldValue).toBe('DEFAULT');
		expect(result.current['/a'].newValue).toBe('DEFAULT');
		expect(result.current['/a'].cleanValue).toBe('DEFAULT');

		expect(result.current['/b'].oldValue).toBe('DEFAULT');
		expect(result.current['/c'].oldValue).toBe('DEFAULT');
	});
});

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCedarStore } from '../../../src/store/CedarStore';
import {
	useSubscribeStateToInputContext,
	useRenderAdditionalContext,
} from '../../../src/store/agentInputContext/agentInputContextSlice';
import type {
	ContextEntry,
	MentionProvider,
} from '../../../src/store/agentInputContext/AgentInputContextTypes';
import type { JSONContent } from '@tiptap/core';

/**
 * Tests for the AgentInputContextSlice to verify all functionality
 * including context management, mention providers, and state subscription
 */

describe('AgentInputContextSlice', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			chatInputContent: null,
			overrideInputContent: { input: null },
			additionalContext: {},
			mentionProviders: new Map(),
			registeredStates: {},
		}));
	});

	describe('Basic state management', () => {
		it('should set chat input content', () => {
			const content: JSONContent = {
				type: 'doc',
				content: [{ type: 'text', text: 'Hello world' }],
			};

			act(() => {
				useCedarStore.getState().setChatInputContent(content);
			});

			expect(useCedarStore.getState().chatInputContent).toEqual(content);
		});

		it('should set override input content', () => {
			const content = 'Override content';

			act(() => {
				useCedarStore.getState().setOverrideInputContent(content);
			});

			expect(useCedarStore.getState().overrideInputContent.input).toBe(content);
		});
	});

	describe('Context entry management', () => {
		it('should add context entry', () => {
			const entry: ContextEntry = {
				id: 'test-entry',
				source: 'manual',
				data: { value: 'test' },
				metadata: { label: 'Test Entry' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', entry);
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testKey).toHaveLength(1);
			expect(context.testKey[0]).toEqual(entry);
		});

		it('should not add duplicate context entries', () => {
			const entry: ContextEntry = {
				id: 'test-entry',
				source: 'manual',
				data: { value: 'test' },
				metadata: { label: 'Test Entry' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', entry);
				useCedarStore.getState().addContextEntry('testKey', entry); // Duplicate
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testKey).toHaveLength(1);
		});

		it('should remove context entry', () => {
			const entry: ContextEntry = {
				id: 'test-entry',
				source: 'manual',
				data: { value: 'test' },
				metadata: { label: 'Test Entry' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', entry);
				useCedarStore.getState().removeContextEntry('testKey', 'test-entry');
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testKey).toHaveLength(0);
		});

		it('should clear context by source', () => {
			const entry1: ContextEntry = {
				id: 'entry1',
				source: 'mention',
				data: { value: 'test1' },
			};
			const entry2: ContextEntry = {
				id: 'entry2',
				source: 'subscription',
				data: { value: 'test2' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', entry1);
				useCedarStore.getState().addContextEntry('testKey', entry2);
				useCedarStore.getState().clearContextBySource('mention');
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testKey).toHaveLength(1);
			expect(context.testKey[0].source).toBe('subscription');
		});

		it('should clear mentions', () => {
			const mentionEntry: ContextEntry = {
				id: 'mention1',
				source: 'mention',
				data: { value: 'test' },
			};
			const subscriptionEntry: ContextEntry = {
				id: 'sub1',
				source: 'subscription',
				data: { value: 'test' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', mentionEntry);
				useCedarStore.getState().addContextEntry('testKey', subscriptionEntry);
				useCedarStore.getState().clearMentions();
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testKey).toHaveLength(1);
			expect(context.testKey[0].source).toBe('subscription');
		});
	});

	describe('updateAdditionalContext - empty array handling', () => {
		it('should register empty arrays in additionalContext', () => {
			const contextData = {
				emptyArray: [],
				nonEmptyArray: [{ id: 'item1', title: 'Item 1' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;

			// Empty array should be registered
			expect(context.emptyArray).toBeDefined();
			expect(context.emptyArray).toHaveLength(0);
			expect(Array.isArray(context.emptyArray)).toBe(true);

			// Non-empty array should be processed normally
			expect(context.nonEmptyArray).toHaveLength(1);
			expect(context.nonEmptyArray[0].source).toBe('subscription');
		});

		it('should handle multiple empty arrays', () => {
			const contextData = {
				emptyArray1: [],
				emptyArray2: [],
				emptyArray3: [],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;

			expect(context.emptyArray1).toEqual([]);
			expect(context.emptyArray2).toEqual([]);
			expect(context.emptyArray3).toEqual([]);
		});

		it('should convert legacy format to context entries', () => {
			const contextData = {
				testItems: [
					{ id: 'item1', title: 'Item 1', customData: 'test' },
					{ id: 'item2', name: 'Item 2' },
					{ label: 'Item 3' },
				],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testItems).toHaveLength(3);

			// Check first item
			expect(context.testItems[0]).toMatchObject({
				id: 'item1',
				source: 'subscription',
				data: { id: 'item1', title: 'Item 1', customData: 'test' },
				metadata: { label: 'Item 1' },
			});

			// Check second item (uses name field)
			expect(context.testItems[1]).toMatchObject({
				id: 'item2',
				source: 'subscription',
				metadata: { label: 'Item 2' },
			});

			// Check third item (uses label field, generates ID)
			expect(context.testItems[2]).toMatchObject({
				id: 'testItems-2',
				source: 'subscription',
				metadata: { label: 'Item 3' },
			});
		});
	});

	describe('Mention provider management', () => {
		const mockProvider: MentionProvider = {
			id: 'test-provider',
			trigger: '@',
			label: 'Test Provider',
			getItems: jest.fn().mockReturnValue([]),
			toContextEntry: jest.fn().mockReturnValue({
				id: 'test',
				source: 'mention' as const,
				data: {},
			}),
		};

		it('should register mention provider', () => {
			act(() => {
				useCedarStore.getState().registerMentionProvider(mockProvider);
			});

			const providers = useCedarStore.getState().mentionProviders;
			expect(providers.has('test-provider')).toBe(true);
			expect(providers.get('test-provider')).toBe(mockProvider);
		});

		it('should unregister mention provider', () => {
			act(() => {
				useCedarStore.getState().registerMentionProvider(mockProvider);
				useCedarStore.getState().unregisterMentionProvider('test-provider');
			});

			const providers = useCedarStore.getState().mentionProviders;
			expect(providers.has('test-provider')).toBe(false);
		});

		it('should get providers by trigger', () => {
			const provider1: MentionProvider = {
				...mockProvider,
				id: 'provider1',
				trigger: '@',
			};
			const provider2: MentionProvider = {
				...mockProvider,
				id: 'provider2',
				trigger: '#',
			};
			const provider3: MentionProvider = {
				...mockProvider,
				id: 'provider3',
				trigger: '@',
			};

			act(() => {
				useCedarStore.getState().registerMentionProvider(provider1);
				useCedarStore.getState().registerMentionProvider(provider2);
				useCedarStore.getState().registerMentionProvider(provider3);
			});

			const atProviders = useCedarStore
				.getState()
				.getMentionProvidersByTrigger('@');
			const hashProviders = useCedarStore
				.getState()
				.getMentionProvidersByTrigger('#');

			expect(atProviders).toHaveLength(2);
			expect(atProviders.map((p) => p.id)).toContain('provider1');
			expect(atProviders.map((p) => p.id)).toContain('provider3');

			expect(hashProviders).toHaveLength(1);
			expect(hashProviders[0].id).toBe('provider2');
		});
	});

	describe('String conversion methods', () => {
		it('should stringify editor content', () => {
			const content: JSONContent = {
				type: 'doc',
				content: [
					{ type: 'text', text: 'Hello ' },
					{ type: 'mention', attrs: { label: 'world' } },
					{ type: 'text', text: '!' },
				],
			};

			act(() => {
				useCedarStore.getState().setChatInputContent(content);
			});

			const stringified = useCedarStore.getState().stringifyEditor();
			expect(stringified).toBe('Hello @world!');
		});

		it('should handle empty editor content', () => {
			const stringified = useCedarStore.getState().stringifyEditor();
			expect(stringified).toBe('');
		});

		it('should stringify additional context', () => {
			const contextData = {
				testItems: [{ id: 'item1', title: 'Item 1' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const stringified = useCedarStore.getState().stringifyAdditionalContext();
			expect(stringified).toContain('testItems');
			expect(JSON.parse(stringified)).toHaveProperty('testItems');
		});

		it('should stringify input context', () => {
			const content: JSONContent = {
				type: 'doc',
				content: [{ type: 'text', text: 'Test input' }],
			};
			const contextData = {
				testItems: [{ id: 'item1', title: 'Item 1' }],
			};

			act(() => {
				useCedarStore.getState().setChatInputContent(content);
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const stringified = useCedarStore.getState().stringifyInputContext();
			expect(stringified).toContain('User Text: Test input');
			expect(stringified).toContain('Additional Context:');
		});
	});

	describe('putAdditionalContext method', () => {
		it('should add formatted context entries programmatically', () => {
			const testData = [
				{ id: '1', name: 'Item 1', value: 100 },
				{ id: '2', name: 'Item 2', value: 200 },
			];

			act(() => {
				useCedarStore.getState().putAdditionalContext('testItems', testData, {
					labelField: 'name',
					color: '#FF0000',
					icon: React.createElement('span', {}, '🔧'),
				});
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.testItems).toHaveLength(2);
			expect(context.testItems[0].data).toEqual(testData[0]);
			expect(context.testItems[0].metadata?.label).toBe('Item 1');
			expect(context.testItems[0].metadata?.color).toBe('#FF0000');
			expect(context.testItems[1].data).toEqual(testData[1]);
			expect(context.testItems[1].metadata?.label).toBe('Item 2');
		});

		it('should handle function labelField in putAdditionalContext', () => {
			const testData = { id: 'single', name: 'Test', value: 42 };

			act(() => {
				useCedarStore.getState().putAdditionalContext('singleItem', testData, {
					labelField: (item: typeof testData) => `${item.name}: ${item.value}`,
				});
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.singleItem).toHaveLength(1);
			expect(context.singleItem[0].metadata?.label).toBe('Test: 42');
		});

		it('should replace existing context when using same key', () => {
			// First add some context
			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('replaceTest', [{ id: '1', title: 'First' }]);
			});

			let context = useCedarStore.getState().additionalContext;
			expect(context.replaceTest).toHaveLength(1);
			expect(context.replaceTest[0].data.title).toBe('First');

			// Now replace it with new data
			act(() => {
				useCedarStore.getState().putAdditionalContext('replaceTest', [
					{ id: '2', title: 'Second' },
					{ id: '3', title: 'Third' },
				]);
			});

			context = useCedarStore.getState().additionalContext;
			expect(context.replaceTest).toHaveLength(2);
			expect(context.replaceTest[0].data.title).toBe('Second');
			expect(context.replaceTest[1].data.title).toBe('Third');
		});

		it('should handle null and undefined values', () => {
			act(() => {
				useCedarStore.getState().putAdditionalContext('nullTest', null);
				useCedarStore
					.getState()
					.putAdditionalContext('undefinedTest', undefined);
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.nullTest).toEqual([]);
			expect(context.undefinedTest).toEqual([]);
		});
	});

	describe('useSubscribeStateToInputContext hook', () => {
		it('should subscribe to state and update context', () => {
			// Register a state first
			act(() => {
				useCedarStore.getState().registerState({
					key: 'testState',
					value: [
						{ id: '1', title: 'Item 1' },
						{ id: '2', title: 'Item 2' },
					],
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: unknown[]) => ({
				items: state,
			}));

			renderHook(() => useSubscribeStateToInputContext('testState', mapFn));

			expect(mapFn).toHaveBeenCalled();

			// Check that context was updated
			const context = useCedarStore.getState().additionalContext;
			expect(context.items).toBeDefined();
			expect(context.items).toHaveLength(2);
		});

		it('should handle string labelField option correctly', () => {
			// Register a state with items that have a 'name' field
			const testData = [
				{ value: 0, name: 'temperature' },
				{ value: 0.9, name: 'opacity' },
			];

			act(() => {
				useCedarStore.getState().registerState({
					key: 'parametersState',
					value: testData,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: typeof testData) => ({
				parameters: state,
			}));

			const options = {
				labelField: 'name',
				icon: React.createElement('span', {}, '🔥'),
				color: '#2ECC40',
				order: 1,
			};

			renderHook(() =>
				useSubscribeStateToInputContext('parametersState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			expect(context.parameters).toHaveLength(2);

			// Check first parameter
			const firstParam = context.parameters[0];
			expect(firstParam.id).toBe('parameters-0');
			expect(firstParam.source).toBe('subscription');
			expect(firstParam.data).toEqual({ value: 0, name: 'temperature' });
			expect(firstParam.metadata?.label).toBe('temperature');
			expect(firstParam.metadata?.color).toBe('#2ECC40');
			expect(firstParam.metadata?.order).toBe(1);

			// Check second parameter
			const secondParam = context.parameters[1];
			expect(secondParam.id).toBe('parameters-1');
			expect(secondParam.data).toEqual({ value: 0.9, name: 'opacity' });
			expect(secondParam.metadata?.label).toBe('opacity');
		});

		it('should handle function labelField option correctly', () => {
			// Register a state with items
			const testData = [
				{ value: 0, name: 'temperature' },
				{ value: 0.9, name: 'opacity' },
			];

			act(() => {
				useCedarStore.getState().registerState({
					key: 'functionalLabelState',
					value: testData,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: typeof testData) => ({
				parameters: state,
			}));

			// Use a function to format the label
			const labelFunction = jest.fn(
				(item: (typeof testData)[0]) => `${item.name} (${item.value})`
			);

			const options = {
				labelField: labelFunction,
				icon: React.createElement('span', {}, '⚙️'),
				color: '#FF851B',
			};

			renderHook(() =>
				useSubscribeStateToInputContext('functionalLabelState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			expect(context.parameters).toHaveLength(2);

			// Verify the label function was called for each item
			expect(labelFunction).toHaveBeenCalledTimes(2);
			expect(labelFunction).toHaveBeenCalledWith({
				value: 0,
				name: 'temperature',
			});
			expect(labelFunction).toHaveBeenCalledWith({
				value: 0.9,
				name: 'opacity',
			});

			// Check formatted labels
			expect(context.parameters[0].metadata?.label).toBe('temperature (0)');
			expect(context.parameters[1].metadata?.label).toBe('opacity (0.9)');

			// Data should remain unchanged
			expect(context.parameters[0].data).toEqual({
				value: 0,
				name: 'temperature',
			});
			expect(context.parameters[1].data).toEqual({
				value: 0.9,
				name: 'opacity',
			});
		});

		it('should handle labelField with nested object paths', () => {
			const testData = [
				{ id: '1', details: { displayName: 'First Item' } },
				{ id: '2', details: { displayName: 'Second Item' } },
			];

			act(() => {
				useCedarStore.getState().registerState({
					key: 'nestedState',
					value: testData,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: typeof testData) => ({
				nestedItems: state,
			}));

			// Use a function to extract nested field
			const options = {
				labelField: (item: (typeof testData)[0]) => item.details.displayName,
			};

			renderHook(() =>
				useSubscribeStateToInputContext('nestedState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			expect(context.nestedItems[0].metadata?.label).toBe('First Item');
			expect(context.nestedItems[1].metadata?.label).toBe('Second Item');
		});

		it('should handle single value (non-array) in mapFn result', () => {
			act(() => {
				useCedarStore.getState().registerState({
					key: 'singleValueState',
					value: { id: 'single', name: 'Single Item' },
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: { id: string; name: string }) => ({
				selectedItem: state, // Single value, not an array
			}));

			const options = {
				labelField: 'name',
			};

			renderHook(() =>
				useSubscribeStateToInputContext('singleValueState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			// Single value should be wrapped in an array
			expect(context.selectedItem).toHaveLength(1);
			expect(context.selectedItem[0].data).toEqual({
				id: 'single',
				name: 'Single Item',
			});
			expect(context.selectedItem[0].metadata?.label).toBe('Single Item');
		});

		it('should use fallback label when labelField is not specified', () => {
			const testData = [
				{
					id: '1',
					name: 'Item Name',
					title: 'Item Title',
					label: 'Item Label',
				},
				{ id: '2', title: 'Only Title' },
				{ id: '3', label: 'Only Label' },
				{ id: '4' }, // Only ID
			];

			act(() => {
				useCedarStore.getState().registerState({
					key: 'fallbackState',
					value: testData,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: typeof testData) => ({
				items: state,
			}));

			// No labelField specified - should use fallback logic
			renderHook(() => useSubscribeStateToInputContext('fallbackState', mapFn));

			const context = useCedarStore.getState().additionalContext;

			// Should prefer title > label > name > id
			expect(context.items[0].metadata?.label).toBe('Item Title');
			expect(context.items[1].metadata?.label).toBe('Only Title');
			expect(context.items[2].metadata?.label).toBe('Only Label');
			expect(context.items[3].metadata?.label).toBe('4');
		});

		it('should preserve original data structure without modification', () => {
			const complexData = [
				{
					id: '1',
					name: 'Complex Item',
					nested: { deep: { value: 'preserved' } },
					array: [1, 2, 3],
					metadata: { original: 'metadata' }, // This should not interfere
				},
			];

			act(() => {
				useCedarStore.getState().registerState({
					key: 'complexState',
					value: complexData,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: typeof complexData) => ({
				complex: state,
			}));

			const options = {
				labelField: 'name',
				icon: React.createElement('span', {}, '📦'),
			};

			renderHook(() =>
				useSubscribeStateToInputContext('complexState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			const item = context.complex[0];

			// Data should be exactly the original object
			expect(item.data).toEqual(complexData[0]);
			expect(item.data.nested.deep.value).toBe('preserved');
			expect(item.data.array).toEqual([1, 2, 3]);
			expect(item.data.metadata).toEqual({ original: 'metadata' });

			// Context metadata should be separate
			expect(item.metadata?.label).toBe('Complex Item');
			expect(item.metadata?.icon).toBeDefined();
		});

		it('should handle empty array states', () => {
			// Register an empty array state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'emptyState',
					value: [],
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: unknown[]) => ({
				emptyItems: state,
			}));

			renderHook(() => useSubscribeStateToInputContext('emptyState', mapFn));

			expect(mapFn).toHaveBeenCalledWith([]);

			// Check that empty array context was registered
			const context = useCedarStore.getState().additionalContext;
			expect(context.emptyItems).toBeDefined();
			expect(context.emptyItems).toEqual([]);
			expect(Array.isArray(context.emptyItems)).toBe(true);
		});

		it('should handle null and undefined values in mapped result as empty arrays', () => {
			// Register a state with some data
			act(() => {
				useCedarStore.getState().registerState({
					key: 'testState',
					value: { someData: 'test' },
					setValue: jest.fn(),
				});
			});

			// Map function that returns null and undefined values
			const mapFn = jest.fn(() => ({
				nullValue: null,
				undefinedValue: undefined,
				validArray: [{ id: '1', title: 'Valid Item' }],
				validSingle: { id: '2', title: 'Single Item' },
			}));

			renderHook(() => useSubscribeStateToInputContext('testState', mapFn));

			expect(mapFn).toHaveBeenCalledWith({ someData: 'test' });

			// Check that null and undefined values become empty arrays
			const context = useCedarStore.getState().additionalContext;

			// Null should become empty array
			expect(context.nullValue).toBeDefined();
			expect(context.nullValue).toEqual([]);
			expect(Array.isArray(context.nullValue)).toBe(true);

			// Undefined should become empty array
			expect(context.undefinedValue).toBeDefined();
			expect(context.undefinedValue).toEqual([]);
			expect(Array.isArray(context.undefinedValue)).toBe(true);

			// Valid array should remain as processed array
			expect(context.validArray).toHaveLength(1);
			expect(context.validArray[0].source).toBe('subscription');

			// Valid single value should be wrapped in array
			expect(context.validSingle).toHaveLength(1);
			expect(context.validSingle[0].source).toBe('subscription');
		});

		it('should handle options with metadata', () => {
			act(() => {
				useCedarStore.getState().registerState({
					key: 'stateWithOptions',
					value: [{ id: '1', name: 'Test Item' }],
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: unknown[]) => ({
				itemsWithOptions: state,
			}));

			const options = {
				icon: React.createElement('span', {}, '🔥'),
				color: '#ff0000',
				labelField: 'name' as const,
				order: 1,
				showInChat: false,
			};

			renderHook(() =>
				useSubscribeStateToInputContext('stateWithOptions', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			expect(context.itemsWithOptions).toHaveLength(1);

			const item = context.itemsWithOptions[0];
			expect(item.metadata?.label).toBe('Test Item');
			expect(item.metadata?.color).toBe('#ff0000');
			expect(item.metadata?.order).toBe(1);
			expect(item.metadata?.showInChat).toBe(false);
			expect(item.metadata?.icon).toBeDefined();
		});

		it('should handle state updates correctly', () => {
			// Initial state
			const initialData = [{ id: '1', name: 'Initial' }];
			const updatedData = [
				{ id: '1', name: 'Updated' },
				{ id: '2', name: 'New Item' },
			];

			const setValue = jest.fn();
			act(() => {
				useCedarStore.getState().registerState({
					key: 'updatingState',
					value: initialData,
					setValue,
				});
			});

			const mapFn = jest.fn((state: Array<{ id: string; name: string }>) => ({
				items: state,
			}));

			const options = {
				labelField: 'name',
			};

			const { rerender } = renderHook(() =>
				useSubscribeStateToInputContext('updatingState', mapFn, options)
			);

			// Check initial context
			let context = useCedarStore.getState().additionalContext;
			expect(context.items).toHaveLength(1);
			expect(context.items[0].metadata?.label).toBe('Initial');

			// Update the state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'updatingState',
					value: updatedData,
					setValue,
				});
			});

			// Force re-render to trigger useEffect
			rerender();

			// Check updated context
			context = useCedarStore.getState().additionalContext;
			expect(context.items).toHaveLength(2);
			expect(context.items[0].metadata?.label).toBe('Updated');
			expect(context.items[1].metadata?.label).toBe('New Item');
		});

		it('should handle null state value as empty arrays', () => {
			// Register a state with null value
			act(() => {
				useCedarStore.getState().registerState({
					key: 'nullState',
					value: null,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: null) => ({
				selectedNodes: state,
			}));

			renderHook(() => useSubscribeStateToInputContext('nullState', mapFn));

			expect(mapFn).toHaveBeenCalledWith(null);

			// Check that null state results in empty array context
			const context = useCedarStore.getState().additionalContext;
			expect(context.selectedNodes).toBeDefined();
			expect(context.selectedNodes).toEqual([]);
			expect(Array.isArray(context.selectedNodes)).toBe(true);
		});

		it('should handle undefined state value as empty arrays', () => {
			// Register a state with undefined value
			act(() => {
				useCedarStore.getState().registerState({
					key: 'undefinedState',
					value: undefined,
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: undefined) => ({
				selectedItems: state,
			}));

			renderHook(() =>
				useSubscribeStateToInputContext('undefinedState', mapFn)
			);

			expect(mapFn).toHaveBeenCalledWith(undefined);

			// Check that undefined state results in empty array context
			const context = useCedarStore.getState().additionalContext;
			expect(context.selectedItems).toBeDefined();
			expect(context.selectedItems).toEqual([]);
			expect(Array.isArray(context.selectedItems)).toBe(true);
		});

		it('should warn when state is not found', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			const mapFn = jest.fn();

			renderHook(() =>
				useSubscribeStateToInputContext('nonExistentState', mapFn)
			);

			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining(
					'State with key "nonExistentState" was not found'
				)
			);

			consoleSpy.mockRestore();
		});
	});

	describe('useRenderAdditionalContext hook', () => {
		it('should render context entries with custom renderers', () => {
			// Setup context
			const contextData = {
				testItems: [{ id: 'item1', title: 'Item 1' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const renderers = {
				testItems: jest.fn((entry: ContextEntry) =>
					React.createElement('div', { key: entry.id }, entry.metadata?.label)
				),
			};

			const { result } = renderHook(() =>
				useRenderAdditionalContext(renderers)
			);

			expect(renderers.testItems).toHaveBeenCalled();
			expect(result.current).toHaveLength(1);
		});

		it('should handle empty context gracefully', () => {
			const renderers = {
				nonExistent: jest.fn(),
			};

			const { result } = renderHook(() =>
				useRenderAdditionalContext(renderers)
			);

			expect(renderers.nonExistent).not.toHaveBeenCalled();
			expect(result.current).toHaveLength(0);
		});
	});
});

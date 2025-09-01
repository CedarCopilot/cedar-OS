import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useCedarStore } from '../../../src/store/CedarStore';
import {
	useSubscribeStateToAgentContext,
	useRenderAdditionalContext,
} from '../../../src/store/agentContext/agentContextSlice';
import type {
	ContextEntry,
	MentionProvider,
} from '../../../src/store/agentContext/AgentContextTypes';
import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';

/**
 * Tests for the AgentContextSlice to verify all functionality
 * including context management, mention providers, and state subscription
 */

describe('AgentContextSlice', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			chatInputContent: null,
			overrideInputContent: { input: null },
			additionalContext: {},
			mentionProviders: new Map(),
		}));
		// Also clear tools for the new tests
		const store = useCedarStore.getState();
		if (store.clearTools) {
			store.clearTools();
		}
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

		it('should store single context entry as single value', () => {
			act(() => {
				useCedarStore.getState().putAdditionalContext(
					'singleKey',
					{ value: 'single' },
					{
						labelField: 'value',
					}
				);
			});

			const context = useCedarStore.getState().additionalContext;
			const value = context.singleKey;

			// Should be stored as single value, not array
			expect(Array.isArray(value)).toBe(false);
			expect((value as ContextEntry).source).toBe('function');
			expect((value as ContextEntry).data).toEqual({ value: 'single' });
		});

		it('should preserve single-item arrays as arrays', () => {
			// Pass a single-item array - should be preserved as array
			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext(
						'arrayTest',
						[{ id: '1', name: 'Single Item' }],
						{
							labelField: 'name',
						}
					);
			});

			const context = useCedarStore.getState().additionalContext;
			const value = context.arrayTest;

			// Should be preserved as array since input was [item]
			expect(Array.isArray(value)).toBe(true);
			const entries = value as ContextEntry[];
			expect(entries.length).toBe(1);
			expect(entries[0].source).toBe('function');
			expect(entries[0].data).toEqual({ id: '1', name: 'Single Item' });
			expect(entries[0].metadata?.label).toBe('Single Item');
		});

		it('should unwrap single non-array values to single ContextEntry', () => {
			// Pass a single non-array value - should be unwrapped to single value
			act(() => {
				useCedarStore.getState().putAdditionalContext(
					'singleTest',
					{ id: '1', name: 'Single Item' },
					{
						labelField: 'name',
					}
				);
			});

			const context = useCedarStore.getState().additionalContext;
			const value = context.singleTest;

			// Should be stored as single value since input was item (not [item])
			expect(Array.isArray(value)).toBe(false);
			const entry = value as ContextEntry;
			expect(entry.source).toBe('function');
			expect(entry.data).toEqual({ id: '1', name: 'Single Item' });
			expect(entry.metadata?.label).toBe('Single Item');
		});

		it('should store multiple context entries as array', () => {
			const entries = [
				{ id: '1', name: 'First' },
				{ id: '2', name: 'Second' },
			];

			act(() => {
				useCedarStore.getState().putAdditionalContext('multipleKey', entries, {
					labelField: 'name',
				});
			});

			const context = useCedarStore.getState().additionalContext;
			const value = context.multipleKey;

			// Should be stored as array
			expect(Array.isArray(value)).toBe(true);
			expect((value as ContextEntry[]).length).toBe(2);
		});

		it('should handle adding to single value context', () => {
			// Start with a single value
			act(() => {
				useCedarStore.getState().putAdditionalContext(
					'testKey',
					{ id: '1', name: 'First' },
					{
						labelField: 'name',
					}
				);
			});

			let context = useCedarStore.getState().additionalContext;
			expect(Array.isArray(context.testKey)).toBe(false);

			// Add another entry
			const newEntry: ContextEntry = {
				id: 'second-entry',
				source: 'manual',
				data: { value: 'second' },
				metadata: { label: 'Second Entry' },
			};

			act(() => {
				useCedarStore.getState().addContextEntry('testKey', newEntry);
			});

			context = useCedarStore.getState().additionalContext;
			// Should now be an array with both entries
			expect(Array.isArray(context.testKey)).toBe(true);
			expect((context.testKey as ContextEntry[]).length).toBe(2);
		});

		it('should handle removing from array to single value', () => {
			// Start with multiple entries
			const entries = [
				{ id: '1', name: 'First' },
				{ id: '2', name: 'Second' },
			];

			act(() => {
				useCedarStore.getState().putAdditionalContext('testKey', entries, {
					labelField: 'name',
				});
			});

			let context = useCedarStore.getState().additionalContext;
			expect(Array.isArray(context.testKey)).toBe(true);
			expect((context.testKey as ContextEntry[]).length).toBe(2);

			// Remove one entry
			act(() => {
				const firstEntry = (context.testKey as ContextEntry[])[0];
				useCedarStore.getState().removeContextEntry('testKey', firstEntry.id);
			});

			context = useCedarStore.getState().additionalContext;
			// Should now be a single value
			expect(Array.isArray(context.testKey)).toBe(false);
			expect((context.testKey as ContextEntry).data).toEqual({
				id: '2',
				name: 'Second',
			});
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

		it('should preserve single value structure when clearing by source', () => {
			// Add a single subscription entry
			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext(
						'singleKey',
						{ id: '1', name: 'Subscription Item' },
						{ labelField: 'name' }
					);
			});

			// Add a single mention entry to a different key
			const mentionEntry: ContextEntry = {
				id: 'mention1',
				source: 'mention',
				data: { value: 'mention' },
			};
			act(() => {
				useCedarStore.getState().addContextEntry('mentionKey', mentionEntry);
			});

			// Clear mentions
			act(() => {
				useCedarStore.getState().clearContextBySource('mention');
			});

			const context = useCedarStore.getState().additionalContext;

			// singleKey should still be a single value (not converted to array)
			expect(Array.isArray(context.singleKey)).toBe(false);
			expect((context.singleKey as ContextEntry).source).toBe('function');

			// mentionKey should be empty array
			expect(Array.isArray(context.mentionKey)).toBe(true);
			expect((context.mentionKey as ContextEntry[]).length).toBe(0);
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

			// Non-empty array should be preserved as array
			expect(Array.isArray(context.nonEmptyArray)).toBe(true);
			const entries = context.nonEmptyArray as ContextEntry[];
			expect(entries.length).toBe(1);
			expect(entries[0].source).toBe('subscription');
		});

		it('should preserve array structure in updateAdditionalContext', () => {
			const contextData = {
				singleItemArray: [{ id: 'item1', title: 'Single Item' }],
				multipleItems: [
					{ id: 'item1', title: 'Item 1' },
					{ id: 'item2', title: 'Item 2' },
				],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;

			// Single item array should be preserved as array
			expect(Array.isArray(context.singleItemArray)).toBe(true);
			const singleArray = context.singleItemArray as ContextEntry[];
			expect(singleArray.length).toBe(1);
			const singleEntry = singleArray[0] as ContextEntry & { title?: string };
			expect(singleEntry.id).toBe('item1');
			expect(singleEntry.title).toBe('Single Item');
			expect(singleEntry.source).toBe('subscription');

			// Multiple items should be stored as array
			expect(Array.isArray(context.multipleItems)).toBe(true);
			expect((context.multipleItems as ContextEntry[]).length).toBe(2);
		});

		it('should preserve single-item arrays in updateAdditionalContext', () => {
			// Test that [item] gets preserved as array
			const contextData = {
				preservedArray: [{ id: 'single', name: 'Preserved' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;

			// Should be preserved as array since input was [item]
			expect(Array.isArray(context.preservedArray)).toBe(true);
			const entries = context.preservedArray as ContextEntry[];
			expect(entries.length).toBe(1);
			const entry = entries[0] as ContextEntry & { name?: string };
			expect(entry.id).toBe('single');
			expect(entry.name).toBe('Preserved');
			expect(entry.source).toBe('subscription');
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
				singleItem: [{ id: 'single', title: 'Single Item' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const context = useCedarStore.getState().additionalContext;

			// Multiple items should be stored as array
			expect(Array.isArray(context.testItems)).toBe(true);
			expect((context.testItems as ContextEntry[]).length).toBe(3);

			// Check first item - updateAdditionalContext spreads the item directly
			expect((context.testItems as ContextEntry[])[0]).toEqual({
				id: 'item1',
				title: 'Item 1',
				customData: 'test',
				source: 'subscription',
			});

			// Check second item
			expect((context.testItems as ContextEntry[])[1]).toEqual({
				id: 'item2',
				name: 'Item 2',
				source: 'subscription',
			});

			// Check third item
			expect((context.testItems as ContextEntry[])[2]).toEqual({
				label: 'Item 3',
				source: 'subscription',
			});

			// Single item array should be preserved as array
			expect(Array.isArray(context.singleItem)).toBe(true);
			const singleArray = context.singleItem as ContextEntry[];
			expect(singleArray.length).toBe(1);
			expect(singleArray[0]).toEqual({
				id: 'single',
				title: 'Single Item',
				source: 'subscription',
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

		it('should compile additional context', () => {
			const contextData = {
				testItems: [{ id: 'item1', title: 'Item 1' }],
			};

			act(() => {
				useCedarStore.getState().updateAdditionalContext(contextData);
			});

			const compiled = useCedarStore.getState().compileAdditionalContext();
			expect(compiled).toHaveProperty('testItems');
			expect(compiled.testItems).toBeDefined();
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

		it('should simplify context structure in compileAdditionalContext', () => {
			const testData = [
				{ id: '1', name: 'Item 1', value: 100 },
				{ id: '2', name: 'Item 2', value: 200 },
			];

			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('multipleItems', testData, {
						labelField: 'name',
					});
			});

			const compiled = useCedarStore.getState().compileAdditionalContext();

			// Should be an array since there are multiple items
			expect(Array.isArray(compiled.multipleItems)).toBe(true);
			expect(compiled.multipleItems).toHaveLength(2);

			// Each item should have simplified structure with just data and source
			expect(compiled.multipleItems[0]).toEqual({
				data: { id: '1', name: 'Item 1', value: 100 },
				source: 'function',
			});
			expect(compiled.multipleItems[1]).toEqual({
				data: { id: '2', name: 'Item 2', value: 200 },
				source: 'function',
			});

			// Should not have id or metadata fields
			expect(compiled.multipleItems[0]).not.toHaveProperty('id');
			expect(compiled.multipleItems[0]).not.toHaveProperty('metadata');
		});

		it('should extract single objects in compileAdditionalContext', () => {
			const singleItem = { id: '1', name: 'Single Item', value: 42 };

			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('singleItem', singleItem, {
						labelField: 'name',
					});
			});

			const compiled = useCedarStore.getState().compileAdditionalContext();

			// Should be a single object, not an array
			expect(compiled.singleItem).toEqual({
				data: { id: '1', name: 'Single Item', value: 42 },
				source: 'function',
			});
			expect(Array.isArray(compiled.singleItem)).toBe(false);

			// Should not have id or metadata fields
			expect(compiled.singleItem).not.toHaveProperty('id');
			expect(compiled.singleItem).not.toHaveProperty('metadata');
		});

		it('should preserve single-item arrays in compileAdditionalContext', () => {
			const singleItemArray = [{ id: '1', name: 'Array Item', value: 42 }];

			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('arrayItem', singleItemArray, {
						labelField: 'name',
					});
			});

			const compiled = useCedarStore.getState().compileAdditionalContext();

			// Should preserve array structure since input was [item]
			// expect(Array.isArray(compiled.arrayItem)).toBe(true);
			expect(compiled.arrayItem).toEqual([
				{
					data: { id: '1', name: 'Array Item', value: 42 },
					source: 'function',
				},
			]);
		});

		it('should handle mixed sources in compileAdditionalContext', () => {
			// Add context via putAdditionalContext (function source)
			act(() => {
				useCedarStore.getState().putAdditionalContext('functionItems', {
					id: '1',
					name: 'Function Item',
				});
			});

			// Add context via updateAdditionalContext (subscription source)
			act(() => {
				useCedarStore.getState().updateAdditionalContext({
					subscriptionItems: [
						{
							data: { id: 'sub1', title: 'Subscription Item' },
							source: 'subscription',
						},
					],
				});
			});

			const compiled = useCedarStore.getState().compileAdditionalContext();

			// Function source should be simplified and extracted (single item)
			expect(compiled.functionItems).toEqual({
				data: { id: '1', name: 'Function Item' },
				source: 'function',
			});

			// Subscription source - should preserve array structure since input was an array
			expect(compiled.subscriptionItems).toEqual([
				{
					data: {
						id: 'sub1',
						title: 'Subscription Item',
					},
					source: 'subscription',
				},
			]);
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
			// Single item should be stored as single value
			expect(Array.isArray(context.singleItem)).toBe(false);
			const entry = context.singleItem as ContextEntry;
			expect(entry.metadata?.label).toBe('Test: 42');
		});

		it('should replace existing context when using same key', () => {
			// First add some context (single item)
			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('replaceTest', { id: '1', title: 'First' });
			});

			let context = useCedarStore.getState().additionalContext;
			// Should be stored as single value
			expect(Array.isArray(context.replaceTest)).toBe(false);
			const singleEntry = context.replaceTest as ContextEntry;
			expect((singleEntry.data as { title: string }).title).toBe('First');

			// Now replace it with new data (multiple items)
			act(() => {
				useCedarStore.getState().putAdditionalContext('replaceTest', [
					{ id: '2', title: 'Second' },
					{ id: '3', title: 'Third' },
				]);
			});

			context = useCedarStore.getState().additionalContext;
			// Should now be an array
			expect(Array.isArray(context.replaceTest)).toBe(true);
			const arrayEntries = context.replaceTest as ContextEntry[];
			expect(arrayEntries.length).toBe(2);
			expect((arrayEntries[0].data as { title: string }).title).toBe('Second');
			expect((arrayEntries[1].data as { title: string }).title).toBe('Third');
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

		it('should set source as "function" for putAdditionalContext entries', () => {
			const testData = [
				{ id: '1', name: 'Item 1' },
				{ id: '2', name: 'Item 2' },
			];

			act(() => {
				useCedarStore
					.getState()
					.putAdditionalContext('functionSourceTest', testData, {
						labelField: 'name',
					});
			});

			const context = useCedarStore.getState().additionalContext;
			expect(context.functionSourceTest).toHaveLength(2);
			expect(context.functionSourceTest[0].source).toBe('function');
			expect(context.functionSourceTest[1].source).toBe('function');
		});
	});

	describe('useSubscribeStateToAgentContext hook', () => {
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

			renderHook(() => useSubscribeStateToAgentContext('testState', mapFn));

			expect(mapFn).toHaveBeenCalled();

			// Check that context was updated - should be array since there are 2 items
			const context = useCedarStore.getState().additionalContext;
			expect(context.items).toBeDefined();
			expect(Array.isArray(context.items)).toBe(true);
			expect((context.items as ContextEntry[]).length).toBe(2);
		});

		it('should store single mapped value as single context entry', () => {
			// Register a state with a single item
			act(() => {
				useCedarStore.getState().registerState({
					key: 'singleItemState',
					value: { id: '1', title: 'Single Item' },
					setValue: jest.fn(),
				});
			});

			const mapFn = jest.fn((state: { id: string; title: string }) => ({
				selectedItem: state,
			}));

			renderHook(() =>
				useSubscribeStateToAgentContext('singleItemState', mapFn)
			);

			const context = useCedarStore.getState().additionalContext;
			// Should be stored as single value, not array
			expect(Array.isArray(context.selectedItem)).toBe(false);
			const entry = context.selectedItem as ContextEntry;
			expect(entry.source).toBe('subscription');
			expect(entry.data).toEqual({ id: '1', title: 'Single Item' });
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
				icon: React.createElement('span', {}, '👀'),
				color: '#2ECC40',
				order: 1,
			};

			renderHook(() =>
				useSubscribeStateToAgentContext('parametersState', mapFn, options)
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
				useSubscribeStateToAgentContext('functionalLabelState', mapFn, options)
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
				useSubscribeStateToAgentContext('nestedState', mapFn, options)
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
				useSubscribeStateToAgentContext('singleValueState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			// Single value should be stored as single value
			expect(Array.isArray(context.selectedItem)).toBe(false);
			const entry = context.selectedItem as ContextEntry;
			expect(entry.data).toEqual({
				id: 'single',
				name: 'Single Item',
			});
			expect(entry.metadata?.label).toBe('Single Item');
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
			renderHook(() => useSubscribeStateToAgentContext('fallbackState', mapFn));

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
				useSubscribeStateToAgentContext('complexState', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			// complex should be an array since mapFn returns an array
			expect(Array.isArray(context.complex)).toBe(true);
			const items = context.complex as ContextEntry[];
			expect(items.length).toBe(1);
			const item = items[0];

			// Data should be exactly the original object
			expect(item.data).toEqual(complexData[0]);
			expect((item.data as (typeof complexData)[0]).nested.deep.value).toBe(
				'preserved'
			);
			expect((item.data as (typeof complexData)[0]).array).toEqual([1, 2, 3]);
			expect((item.data as (typeof complexData)[0]).metadata).toEqual({
				original: 'metadata',
			});

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

			renderHook(() => useSubscribeStateToAgentContext('emptyState', mapFn));

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

			renderHook(() => useSubscribeStateToAgentContext('testState', mapFn));

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

			// Valid array should remain as array since mapFn returned an array
			expect(Array.isArray(context.validArray)).toBe(true);
			const validArrayEntries = context.validArray as ContextEntry[];
			expect(validArrayEntries.length).toBe(1);
			expect(validArrayEntries[0].source).toBe('subscription');

			// Valid single value should be stored as single value
			expect(Array.isArray(context.validSingle)).toBe(false);
			const validSingleEntry = context.validSingle as ContextEntry;
			expect(validSingleEntry.source).toBe('subscription');
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
				useSubscribeStateToAgentContext('stateWithOptions', mapFn, options)
			);

			const context = useCedarStore.getState().additionalContext;
			// itemsWithOptions should be an array since mapFn returns an array
			expect(Array.isArray(context.itemsWithOptions)).toBe(true);

			const items = context.itemsWithOptions as ContextEntry[];
			expect(items.length).toBe(1);
			const item = items[0];
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
				useSubscribeStateToAgentContext('updatingState', mapFn, options)
			);

			// Check initial context
			let context = useCedarStore.getState().additionalContext;
			// items should be an array since mapFn returns an array
			expect(Array.isArray(context.items)).toBe(true);
			const initialItems = context.items as ContextEntry[];
			expect(initialItems.length).toBe(1);
			expect(initialItems[0].metadata?.label).toBe('Initial');

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

			// Check updated context - now should be array with 2 items
			context = useCedarStore.getState().additionalContext;
			expect(Array.isArray(context.items)).toBe(true);
			expect((context.items as ContextEntry[]).length).toBe(2);
			expect((context.items as ContextEntry[])[0].metadata?.label).toBe(
				'Updated'
			);
			expect((context.items as ContextEntry[])[1].metadata?.label).toBe(
				'New Item'
			);
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

			renderHook(() => useSubscribeStateToAgentContext('nullState', mapFn));

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
				useSubscribeStateToAgentContext('undefinedState', mapFn)
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
				useSubscribeStateToAgentContext('nonExistentState', mapFn)
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

	describe('compileFrontendTools', () => {
		it('should return an empty object when no tools are registered', () => {
			const { result } = renderHook(() => useCedarStore());

			const tools = result.current.compileFrontendTools();
			expect(tools).toEqual({});
		});

		it('should return registered tools with their schemas', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register a test tool
			act(() => {
				result.current.registerTool({
					name: 'testTool',
					description: 'A test tool',
					argsSchema: z.object({
						message: z.string(),
						count: z.number().optional(),
					}),
					execute: async (args) => {
						console.log('Test tool executed', args);
					},
				});
			});

			const tools = result.current.compileFrontendTools();

			expect(Object.keys(tools)).toHaveLength(1);
			expect(tools.testTool).toBeDefined();
			expect(tools.testTool.name).toBe('testTool');
			expect(tools.testTool.description).toBe('A test tool');
			expect(tools.testTool.argsSchema).toBeDefined();

			// The schema should have $ref structure
			expect(tools.testTool.argsSchema.$ref).toBe('#/definitions/testTool');
			expect(tools.testTool.argsSchema.definitions).toBeDefined();
			expect(tools.testTool.argsSchema.definitions.testTool).toBeDefined();
			expect(tools.testTool.argsSchema.definitions.testTool.type).toBe(
				'object'
			);
			expect(
				tools.testTool.argsSchema.definitions.testTool.properties
			).toBeDefined();
			expect(
				tools.testTool.argsSchema.definitions.testTool.properties.message
			).toBeDefined();
			expect(
				tools.testTool.argsSchema.definitions.testTool.properties.count
			).toBeDefined();
		});

		it('should include frontend tools in compileAdditionalContext when tools are registered', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register multiple tools
			act(() => {
				result.current.registerTool({
					name: 'tool1',
					description: 'First tool',
					argsSchema: z.object({
						input: z.string(),
					}),
					execute: async (args) => {
						console.log('Tool 1', args);
					},
				});

				result.current.registerTool({
					name: 'tool2',
					description: 'Second tool',
					argsSchema: z.object({
						value: z.number(),
						enabled: z.boolean(),
					}),
					execute: async (args) => {
						console.log('Tool 2', args);
					},
				});
			});

			const context = result.current.compileAdditionalContext();

			expect(context.frontendTools).toBeDefined();
			expect(Object.keys(context.frontendTools)).toHaveLength(2);

			// Check first tool
			expect(context.frontendTools.tool1).toBeDefined();
			expect(context.frontendTools.tool1.name).toBe('tool1');
			expect(context.frontendTools.tool1.description).toBe('First tool');
			expect(context.frontendTools.tool1.argsSchema.$ref).toBe(
				'#/definitions/tool1'
			);
			expect(
				context.frontendTools.tool1.argsSchema.definitions.tool1.properties
					.input
			).toBeDefined();

			// Check second tool
			expect(context.frontendTools.tool2).toBeDefined();
			expect(context.frontendTools.tool2.name).toBe('tool2');
			expect(context.frontendTools.tool2.description).toBe('Second tool');
			expect(context.frontendTools.tool2.argsSchema.$ref).toBe(
				'#/definitions/tool2'
			);
			expect(
				context.frontendTools.tool2.argsSchema.definitions.tool2.properties
					.value
			).toBeDefined();
			expect(
				context.frontendTools.tool2.argsSchema.definitions.tool2.properties
					.enabled
			).toBeDefined();
		});

		it('should not include frontendTools field when no tools are registered', () => {
			const { result } = renderHook(() => useCedarStore());

			const context = result.current.compileAdditionalContext();

			expect(context.frontendTools).toBeUndefined();
		});
	});

	describe('useSubscribeStateToAgentContext memoization', () => {
		it('should memoize mapping function to prevent unnecessary re-renders', () => {
			// Register a test state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'memoTestState',
					value: [{ id: '1', title: 'Item 1' }],
					setValue: jest.fn(),
				});
			});

			let renderCount = 0;
			const mapFn = jest.fn((state: unknown[]) => {
				renderCount++;
				return { items: state };
			});

			// First render
			const { rerender } = renderHook(() =>
				useSubscribeStateToAgentContext('memoTestState', mapFn)
			);

			expect(mapFn).toHaveBeenCalledTimes(1);
			expect(renderCount).toBe(1);

			// Re-render with the same function reference - should not call mapFn again
			rerender();
			expect(mapFn).toHaveBeenCalledTimes(1); // Still 1 because memoized
			expect(renderCount).toBe(1);

			// Create a new function with same logic - should call mapFn again
			const newMapFn = jest.fn((state: unknown[]) => {
				renderCount++;
				return { items: state };
			});

			renderHook(() =>
				useSubscribeStateToAgentContext('memoTestState', newMapFn)
			);

			expect(newMapFn).toHaveBeenCalledTimes(1);
			expect(renderCount).toBe(2); // New function was called
		});

		it('should memoize options to prevent unnecessary useEffect re-runs', () => {
			// Register a test state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'optionsMemoTestState',
					value: [{ id: '1', title: 'Item 1' }],
					setValue: jest.fn(),
				});
			});

			let effectRunCount = 0;
			const mapFn = jest.fn((state: unknown[]) => {
				effectRunCount++;
				return { items: state };
			});

			const color = '#FF0000';
			const order = 1;
			const labelField = 'title' as const;

			// First render with individual option values
			const { rerender } = renderHook(() =>
				useSubscribeStateToAgentContext('optionsMemoTestState', mapFn, {
					color,
					order,
					labelField,
				})
			);

			expect(effectRunCount).toBe(1);

			// Re-render with same individual values in a new object - memoization should prevent useEffect re-run
			rerender(() =>
				useSubscribeStateToAgentContext('optionsMemoTestState', mapFn, {
					color, // Same value
					order, // Same value
					labelField, // Same value
				})
			);

			// Should still be 1 because memoization recognizes same option values
			expect(effectRunCount).toBe(1);
		});

		it('should re-render when options content actually changes', () => {
			// Register a test state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'optionsChangeTestState',
					value: [{ id: '1', title: 'Item 1' }],
					setValue: jest.fn(),
				});
			});

			let renderCount = 0;
			const mapFn = jest.fn((state: unknown[]) => {
				renderCount++;
				return { items: state };
			});

			const initialOptions = {
				color: '#FF0000',
				order: 1,
			};

			// First render
			renderHook(() =>
				useSubscribeStateToAgentContext(
					'optionsChangeTestState',
					mapFn,
					initialOptions
				)
			);

			expect(renderCount).toBe(1);

			// Change options content - should trigger re-render
			const changedOptions = {
				color: '#00FF00', // Different color
				order: 1,
			};

			renderHook(() =>
				useSubscribeStateToAgentContext(
					'optionsChangeTestState',
					mapFn,
					changedOptions
				)
			);

			expect(renderCount).toBe(2); // Should have re-rendered due to color change
		});

		it('should handle function options in memoization correctly', () => {
			// Register a test state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'functionOptionsTestState',
					value: [{ id: '1', title: 'Item 1' }],
					setValue: jest.fn(),
				});
			});

			let renderCount = 0;
			const mapFn = jest.fn((state: unknown[]) => {
				renderCount++;
				return { items: state };
			});

			const iconFunction = jest.fn(() => '🎯');
			const labelFunction = jest.fn(
				(item: unknown) => (item as { title: string }).title
			);

			const options = {
				icon: iconFunction,
				labelField: labelFunction,
				color: '#FF0000',
			};

			// First render
			const { rerender } = renderHook(() =>
				useSubscribeStateToAgentContext(
					'functionOptionsTestState',
					mapFn,
					options
				)
			);

			expect(renderCount).toBe(1);

			// Re-render with same function references - should not re-render
			rerender();
			expect(renderCount).toBe(1);

			// Create new functions with same logic - should trigger re-render
			const newIconFunction = jest.fn(() => '🎯');
			const newLabelFunction = jest.fn(
				(item: unknown) => (item as { title: string }).title
			);

			const newOptions = {
				icon: newIconFunction,
				labelField: newLabelFunction,
				color: '#FF0000',
			};

			renderHook(() =>
				useSubscribeStateToAgentContext(
					'functionOptionsTestState',
					mapFn,
					newOptions
				)
			);

			expect(renderCount).toBe(2); // Should re-render due to function changes
		});

		it('should handle undefined options correctly in memoization', () => {
			// Register a test state
			act(() => {
				useCedarStore.getState().registerState({
					key: 'undefinedOptionsTestState',
					value: [{ id: '1', title: 'Item 1' }],
					setValue: jest.fn(),
				});
			});

			let renderCount = 0;
			const mapFn = jest.fn((state: unknown[]) => {
				renderCount++;
				return { items: state };
			});

			// First render with undefined options
			const { rerender } = renderHook(() =>
				useSubscribeStateToAgentContext(
					'undefinedOptionsTestState',
					mapFn,
					undefined
				)
			);

			expect(renderCount).toBe(1);

			// Re-render with undefined options - should not re-render
			rerender();
			expect(renderCount).toBe(1);

			// Change to empty object - should trigger re-render
			renderHook(() =>
				useSubscribeStateToAgentContext('undefinedOptionsTestState', mapFn, {})
			);

			expect(renderCount).toBe(2);
		});
	});

	describe('compileStateSetters', () => {
		it('should return empty objects when no states are registered', () => {
			const { result } = renderHook(() => useCedarStore());

			const compiled = result.current.compileStateSetters();

			expect(compiled.stateSetters).toEqual({});
			expect(compiled.setters).toEqual({});
			expect(compiled.schemas).toEqual({});
		});

		it('should compile state setters and schemas correctly', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register a state with setters
			act(() => {
				result.current.registerState({
					key: 'testState',
					initialValue: { count: 0 },
					schema: z.object({ count: z.number() }),
					description: 'A test state',
					stateSetters: {
						increment: {
							name: 'increment',
							description: 'Increment the count',
							argsSchema: z.object({ amount: z.number().optional() }),
							execute: (args, setValue) => {
								setValue((prev) => ({
									count: prev.count + (args.amount || 1),
								}));
							},
						},
					},
				});
			});

			const compiled = result.current.compileStateSetters();

			// Check stateSetters
			expect(compiled.stateSetters).toBeDefined();
			expect(compiled.stateSetters.increment).toBeDefined();
			expect(compiled.stateSetters.increment.name).toBe('increment');
			expect(compiled.stateSetters.increment.stateKey).toBe('testState');
			expect(compiled.stateSetters.increment.description).toBe(
				'Increment the count'
			);
			expect(compiled.stateSetters.increment.argsSchema).toBeDefined();

			// Check schemas
			expect(compiled.schemas).toBeDefined();
			expect(compiled.schemas.testState).toBeDefined();
			expect(compiled.schemas.testState.stateKey).toBe('testState');
			expect(compiled.schemas.testState.description).toBe('A test state');
			expect(compiled.schemas.testState.schema).toBeDefined();
		});

		it('should be used by compileAdditionalContext', () => {
			const { result } = renderHook(() => useCedarStore());

			// Register a state with setters
			act(() => {
				result.current.registerState({
					key: 'testState',
					initialValue: { value: 'test' },
					schema: z.object({ value: z.string() }),
					stateSetters: {
						setValue: {
							name: 'setValue',
							description: 'Set the value',
							argsSchema: z.object({ newValue: z.string() }),
							execute: (args, setValue) => {
								setValue({ value: args.newValue });
							},
						},
					},
				});
			});

			const context = result.current.compileAdditionalContext();

			// Verify that the compiled state setters are included
			expect(context.stateSetters).toBeDefined();
			expect(context.stateSetters.setValue).toBeDefined();
			expect(context.stateSetters.setValue.name).toBe('setValue');
			expect(context.stateSetters.setValue.stateKey).toBe('testState');

			expect(context.schemas).toBeDefined();
			expect(context.schemas.testState).toBeDefined();
		});
	});
});

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
			expect(item.metadata?.color).toBe('#ff0000');
			expect(item.metadata?.order).toBe(1);
			expect(item.metadata?.showInChat).toBe(false);
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

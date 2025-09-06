import { useCedarStore } from '../../../src/store/CedarStore';
import { DEFAULT_THREAD_ID } from '../../../src/store/messages/MessageTypes';

/**
 * Basic tests for the thread-based message system that work correctly with Zustand
 */

describe('MessagesSlice - Thread System (Basic)', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState((state) => ({
			...state,
			threadMap: {
				[DEFAULT_THREAD_ID]: {
					id: DEFAULT_THREAD_ID,
					lastLoaded: new Date().toISOString(),
					messages: [],
				},
			},
			mainThreadId: DEFAULT_THREAD_ID,
			messages: [],
			isProcessing: false,
			showChat: false,
		}));
	});

	describe('Core Functionality', () => {
		it('should initialize with default thread', () => {
			const state = useCedarStore.getState();

			expect(state.mainThreadId).toBe(DEFAULT_THREAD_ID);
			expect(state.threadMap[DEFAULT_THREAD_ID]).toBeDefined();
			expect(state.getAllThreadIds()).toEqual([DEFAULT_THREAD_ID]);
		});

		it('should create new threads and update state', () => {
			// Create thread
			const newThreadId = useCedarStore.getState().createThread();

			// Get fresh state to see updates
			const state = useCedarStore.getState();

			expect(newThreadId).toBeDefined();
			expect(state.getAllThreadIds()).toContain(newThreadId);
			expect(state.threadMap[newThreadId]).toBeDefined();
			expect(state.threadMap[newThreadId].messages).toEqual([]);
		});

		it('should add messages to threads correctly', () => {
			// Create thread
			const threadId = useCedarStore.getState().createThread();

			// Add message
			const message = useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Test message',
				},
				true,
				threadId
			);

			// Get fresh state
			const state = useCedarStore.getState();

			expect(message.id).toBeDefined();
			expect(state.threadMap[threadId].messages).toHaveLength(1);
			expect(state.threadMap[threadId].messages[0].content).toBe(
				'Test message'
			);
		});

		it('should switch between threads', () => {
			// Create new thread
			const newThreadId = useCedarStore.getState().createThread();

			// Add message to default thread
			useCedarStore.getState().addMessage({
				role: 'user',
				type: 'text',
				content: 'Default message',
			});

			// Add message to new thread
			useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'New thread message',
				},
				true,
				newThreadId
			);

			// Switch to new thread
			useCedarStore.getState().switchThread(newThreadId);

			const state = useCedarStore.getState();
			expect(state.mainThreadId).toBe(newThreadId);
		});

		it('should isolate messages between threads', () => {
			// Create two threads
			const thread1 = useCedarStore.getState().createThread();
			const thread2 = useCedarStore.getState().createThread();

			// Add messages to different threads
			useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Thread 1 message',
				},
				true,
				thread1
			);

			useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Thread 2 message',
				},
				true,
				thread2
			);

			const state = useCedarStore.getState();

			expect(state.threadMap[thread1].messages).toHaveLength(1);
			expect(state.threadMap[thread2].messages).toHaveLength(1);
			expect(state.threadMap[thread1].messages[0].content).toBe(
				'Thread 1 message'
			);
			expect(state.threadMap[thread2].messages[0].content).toBe(
				'Thread 2 message'
			);
		});

		it('should work with backward compatible API', () => {
			// Add message using old API (no threadId)
			const message = useCedarStore.getState().addMessage({
				role: 'user',
				type: 'text',
				content: 'Backward compatible message',
			});

			const state = useCedarStore.getState();

			// Should appear in default thread
			expect(state.threadMap[DEFAULT_THREAD_ID].messages).toHaveLength(1);
			expect(state.threadMap[DEFAULT_THREAD_ID].messages[0]).toEqual(message);
		});

		it('should update and delete messages in specific threads', () => {
			// Create thread and add message
			const threadId = useCedarStore.getState().createThread();
			const message = useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Original content',
				},
				true,
				threadId
			);

			// Update message
			useCedarStore.getState().updateMessage(
				message.id,
				{
					content: 'Updated content',
				},
				threadId
			);

			let state = useCedarStore.getState();
			expect(state.threadMap[threadId].messages[0].content).toBe(
				'Updated content'
			);

			// Delete message
			useCedarStore.getState().deleteMessage(message.id, threadId);

			state = useCedarStore.getState();
			expect(state.threadMap[threadId].messages).toHaveLength(0);
		});

		it('should clear messages in specific threads', () => {
			// Create thread and add messages
			const threadId = useCedarStore.getState().createThread();
			useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Message 1',
				},
				true,
				threadId
			);
			useCedarStore.getState().addMessage(
				{
					role: 'assistant',
					type: 'text',
					content: 'Message 2',
				},
				true,
				threadId
			);

			let state = useCedarStore.getState();
			expect(state.threadMap[threadId].messages).toHaveLength(2);

			// Clear messages
			useCedarStore.getState().clearMessages(threadId);

			state = useCedarStore.getState();
			expect(state.threadMap[threadId].messages).toHaveLength(0);
		});

		it('should handle thread deletion correctly', () => {
			// Create threads
			const thread1 = useCedarStore.getState().createThread();
			const thread2 = useCedarStore.getState().createThread();

			let state = useCedarStore.getState();
			expect(state.getAllThreadIds()).toHaveLength(3); // default + 2 new

			// Delete thread1
			useCedarStore.getState().deleteThread(thread1);

			state = useCedarStore.getState();
			expect(state.getAllThreadIds()).toHaveLength(2);
			expect(state.getAllThreadIds()).not.toContain(thread1);
			expect(state.getAllThreadIds()).toContain(thread2);
		});

		it('should prevent deletion of default and current threads', () => {
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

			// Try to delete default thread
			useCedarStore.getState().deleteThread(DEFAULT_THREAD_ID);
			expect(consoleSpy).toHaveBeenCalledWith('Cannot delete default thread');

			// Create and switch to custom thread
			const customThread = useCedarStore.getState().createThread();
			useCedarStore.getState().switchThread(customThread);

			// Try to delete current thread
			useCedarStore.getState().deleteThread(customThread);
			expect(consoleSpy).toHaveBeenCalledWith('Cannot delete current thread');

			consoleSpy.mockRestore();
		});
	});

	describe('Message Type Support', () => {
		it('should handle different message types in different threads', () => {
			const textThread = useCedarStore.getState().createThread('text');
			const todoThread = useCedarStore.getState().createThread('todo');

			// Add text message
			useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'Simple text',
				},
				true,
				textThread
			);

			// Add todo message
			useCedarStore.getState().addMessage(
				{
					role: 'assistant',
					type: 'todolist',
					content: 'Todo list',
					items: [
						{ text: 'Task 1', done: false },
						{ text: 'Task 2', done: true },
					],
				},
				true,
				todoThread
			);

			const state = useCedarStore.getState();

			expect(state.threadMap[textThread].messages[0].type).toBe('text');
			expect(state.threadMap[todoThread].messages[0].type).toBe('todolist');
		});
	});

	describe('Utility Methods', () => {
		it('should find messages by ID and role', () => {
			const threadId = useCedarStore.getState().createThread();

			const userMsg = useCedarStore.getState().addMessage(
				{
					role: 'user',
					type: 'text',
					content: 'User message',
				},
				true,
				threadId
			);

			const assistantMsg = useCedarStore.getState().addMessage(
				{
					role: 'assistant',
					type: 'text',
					content: 'Assistant message',
				},
				true,
				threadId
			);

			const state = useCedarStore.getState();

			// Test getMessageById
			expect(state.getMessageById(userMsg.id, threadId)).toEqual(userMsg);
			expect(state.getMessageById('non-existent', threadId)).toBeUndefined();

			// Test getMessagesByRole
			const userMessages = state.getMessagesByRole('user', threadId);
			const assistantMessages = state.getMessagesByRole('assistant', threadId);

			expect(userMessages).toHaveLength(1);
			expect(assistantMessages).toHaveLength(1);
			expect(userMessages[0].content).toBe('User message');
			expect(assistantMessages[0].content).toBe('Assistant message');
		});
	});
});

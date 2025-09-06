import { renderHook } from '@testing-library/react';
import {
	useThreadController,
	useCedarStore,
} from '../../../src/store/CedarStore';
import { act } from '@testing-library/react';

describe('useThreadController', () => {
	beforeEach(() => {
		// Reset the store before each test
		useCedarStore.setState({
			mainThreadId: 'main',
			threadMap: {
				main: {
					id: 'main',
					name: 'Main Thread',
					messages: [],
					createdAt: Date.now(),
					updatedAt: Date.now(),
				},
			},
		});
	});

	it('should not cause infinite re-renders', () => {
		let renderCount = 0;
		renderHook(() => {
			renderCount++;
			return useThreadController();
		});

		// Initial render
		expect(renderCount).toBe(1);

		// Wait a bit to ensure no additional renders happen
		act(() => {
			// Force a re-render by updating something unrelated
			useCedarStore.setState({});
		});

		// Should still be 1 render (no infinite loop)
		expect(renderCount).toBe(1);
	});

	it('should return stable threadIds reference when threadMap does not change', () => {
		const { result, rerender } = renderHook(() => useThreadController());

		const firstThreadIds = result.current.threadIds;

		// Rerender without changing threadMap
		rerender();

		const secondThreadIds = result.current.threadIds;

		// The array reference should be the same
		expect(firstThreadIds).toBe(secondThreadIds);
	});

	it('should update threadIds when threadMap changes', () => {
		const { result } = renderHook(() => useThreadController());

		const initialThreadIds = result.current.threadIds;
		expect(initialThreadIds).toEqual(['main']);

		// Add a new thread
		act(() => {
			result.current.createThread('thread2', 'Thread 2');
		});

		// ThreadIds should now include the new thread
		expect(result.current.threadIds).toContain('main');
		expect(result.current.threadIds).toContain('thread2');
		expect(result.current.threadIds.length).toBe(2);
	});

	it('should maintain stable function references', () => {
		const { result, rerender } = renderHook(() => useThreadController());

		const firstFunctions = {
			setMainThreadId: result.current.setMainThreadId,
			createThread: result.current.createThread,
			deleteThread: result.current.deleteThread,
			switchThread: result.current.switchThread,
			getAllThreadIds: result.current.getAllThreadIds,
		};

		rerender();

		const secondFunctions = {
			setMainThreadId: result.current.setMainThreadId,
			createThread: result.current.createThread,
			deleteThread: result.current.deleteThread,
			switchThread: result.current.switchThread,
			getAllThreadIds: result.current.getAllThreadIds,
		};

		// All function references should be stable
		expect(firstFunctions.setMainThreadId).toBe(
			secondFunctions.setMainThreadId
		);
		expect(firstFunctions.createThread).toBe(secondFunctions.createThread);
		expect(firstFunctions.deleteThread).toBe(secondFunctions.deleteThread);
		expect(firstFunctions.switchThread).toBe(secondFunctions.switchThread);
		expect(firstFunctions.getAllThreadIds).toBe(
			secondFunctions.getAllThreadIds
		);
	});
});

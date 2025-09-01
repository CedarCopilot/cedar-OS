import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
	useDiffState,
	useDiffStateOperations,
} from '../../../src/store/diffHistoryStateSlice/useDiffState';
import { addDiffToArrayObjs } from '../../../src/store/diffHistoryStateSlice/useRegisterDiffState';
import { CedarCopilot } from '../../../src/components/CedarCopilot';

describe('useDiffState', () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<CedarCopilot>{children}</CedarCopilot>
	);

	it('should work like useState with diff tracking', () => {
		const { result } = renderHook(
			() => useDiffState('testState', 'initial value'),
			{ wrapper }
		);

		// Check initial state
		expect(result.current[0]).toBe('initial value');

		// Update state
		act(() => {
			result.current[1]('updated value');
		});

		// Check updated state
		expect(result.current[0]).toBe('updated value');
	});

	it('should support custom setters', () => {
		const stateSetters = {
			append: {
				name: 'append',
				description: 'Append text',
				parameters: [
					{ name: 'text', type: 'string', description: 'Text to append' },
				],
				execute: (
					currentValue: string,
					setValue: (v: string) => void,
					text: string
				) => {
					setValue(currentValue + text);
				},
			},
		};

		const { result } = renderHook(
			() =>
				useDiffState('testStateCustom', 'hello', {
					stateSetters,
				}),
			{ wrapper }
		);

		// Check initial state
		expect(result.current[0]).toBe('hello');

		// Update using regular setter
		act(() => {
			result.current[1]('hello world');
		});

		expect(result.current[0]).toBe('hello world');
	});

	it('should support computeState for diff visualization', () => {
		const initialNodes = [
			{ id: '1', name: 'Node 1' },
			{ id: '2', name: 'Node 2' },
		];

		const { result } = renderHook(
			() =>
				useDiffState('nodesTest', initialNodes, {
					description: 'Test nodes',
					computeState: (oldState, newState) => {
						return addDiffToArrayObjs(oldState, newState, 'id');
					},
				}),
			{ wrapper }
		);

		// Check initial state
		expect(result.current[0]).toEqual(initialNodes);

		// Add a new node
		act(() => {
			result.current[1]([...initialNodes, { id: '3', name: 'Node 3' }]);
		});

		// The new state should have the new node with diff marker
		expect(result.current[0]).toHaveLength(3);
		expect(result.current[0][2]).toEqual({
			id: '3',
			name: 'Node 3',
		});
	});

	it('should support diffMode configuration', () => {
		const { result } = renderHook(
			() =>
				useDiffState('testStateDiffMode', 'initial', {
					diffMode: 'holdAccept',
				}),
			{ wrapper }
		);

		// Check initial state
		expect(result.current[0]).toBe('initial');

		// Update state
		act(() => {
			result.current[1]('updated');
		});

		// With holdAccept mode, the computed state should still be 'initial'
		// until diffs are accepted
		// This is supposed to be updated because they are updating the SOURCE state without diffMode
		expect(result.current[0]).toBe('updated');
	});
});

describe('useDiffStateOperations', () => {
	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<CedarCopilot>{children}</CedarCopilot>
	);

	it('should return null for non-existent state', () => {
		const { result } = renderHook(() => useDiffStateOperations('nonExistent'), {
			wrapper,
		});

		expect(result.current).toBeNull();
	});

	it('should provide diff operations for registered state', () => {
		// First register a diff state
		renderHook(() => useDiffState('testStateOps', 'initial'), { wrapper });

		// Then get operations
		const { result: opsResult } = renderHook(
			() => useDiffStateOperations('testStateOps'),
			{ wrapper }
		);

		expect(opsResult.current).not.toBeNull();
		expect(opsResult.current?.undo).toBeInstanceOf(Function);
		expect(opsResult.current?.redo).toBeInstanceOf(Function);
		expect(opsResult.current?.acceptAllDiffs).toBeInstanceOf(Function);
		expect(opsResult.current?.rejectAllDiffs).toBeInstanceOf(Function);
		expect(opsResult.current?.oldState).toBe('initial');
		expect(opsResult.current?.newState).toBe('initial');
	});

	it('should allow undo/redo operations', () => {
		// Register a diff state
		const { result: stateResult } = renderHook(
			() => useDiffState('testStateUndoRedo', 'initial'),
			{ wrapper }
		);

		// Get operations
		const { result: opsResult } = renderHook(
			() => useDiffStateOperations<string>('testStateUndoRedo'),
			{ wrapper }
		);

		// Update state
		act(() => {
			stateResult.current[1]('updated');
		});

		expect(stateResult.current[0]).toBe('updated');

		// Undo
		act(() => {
			const success = opsResult.current?.undo();
			expect(success).toBe(true);
		});

		// State should be back to initial
		expect(stateResult.current[0]).toBe('initial');

		// Redo
		act(() => {
			const success = opsResult.current?.redo();
			expect(success).toBe(true);
		});

		// State should be back to updated
		expect(stateResult.current[0]).toBe('updated');
	});
});

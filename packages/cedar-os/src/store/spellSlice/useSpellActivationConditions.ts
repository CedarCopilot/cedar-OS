'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSpells } from '@/store/CedarStore';

// Hotkey definitions
export enum Hotkey {
	// Single keys
	A = 'a',
	B = 'b',
	C = 'c',
	D = 'd',
	E = 'e',
	F = 'f',
	G = 'g',
	H = 'h',
	I = 'i',
	J = 'j',
	K = 'k',
	L = 'l',
	M = 'm',
	N = 'n',
	O = 'o',
	P = 'p',
	Q = 'q',
	R = 'r',
	S = 's',
	T = 't',
	U = 'u',
	V = 'v',
	W = 'w',
	X = 'x',
	Y = 'y',
	Z = 'z',

	// Function keys
	F1 = 'f1',
	F2 = 'f2',
	F3 = 'f3',
	F4 = 'f4',
	F5 = 'f5',
	F6 = 'f6',
	F7 = 'f7',
	F8 = 'f8',
	F9 = 'f9',
	F10 = 'f10',
	F11 = 'f11',
	F12 = 'f12',

	// Special keys
	ESCAPE = 'escape',
	ENTER = 'enter',
	SPACE = 'space',
	TAB = 'tab',
	DELETE = 'delete',
	BACKSPACE = 'backspace',

	// Arrow keys
	ARROW_UP = 'arrowup',
	ARROW_DOWN = 'arrowdown',
	ARROW_LEFT = 'arrowleft',
	ARROW_RIGHT = 'arrowright',

	// Modifier combinations (use + to combine)
	CTRL = 'ctrl',
	CMD = 'cmd',
	META = 'meta',
	ALT = 'alt',
	SHIFT = 'shift',
}

export enum MouseEvent {
	RIGHT_CLICK = 'right-click',
	DOUBLE_CLICK = 'double-click',
	MIDDLE_CLICK = 'middle-click',
	MOUSE_SCROLL = 'mouse-scroll',
}

export enum SelectionEvent {
	TEXT_SELECT = 'text-select',
}

export type HotkeyCombo = string; // e.g., "ctrl+s", "cmd+shift+p"

export interface ActivationConditions {
	hotkeys?: (Hotkey | HotkeyCombo)[];
	mouseEvents?: MouseEvent[];
	selectionEvents?: SelectionEvent[];
}

export interface ActivationState {
	isActive: boolean;
	triggerData?: {
		type: 'hotkey' | 'mouse' | 'selection';
		event?: Hotkey | HotkeyCombo | MouseEvent | SelectionEvent;
		mousePosition?: { x: number; y: number };
		selectedText?: string;
		originalEvent?: Event;
	};
}

interface UseSpellActivationConditionsOptions {
	spellId: string;
	conditions: ActivationConditions;
	onActivate?: (state: ActivationState) => void;
	onDeactivate?: () => void;
	preventDefaultEvents?: boolean;
	ignoreInputElements?: boolean;
}

export function useSpellActivationConditions({
	spellId,
	conditions,
	onActivate,
	onDeactivate,
	preventDefaultEvents = true,
	ignoreInputElements = true,
}: UseSpellActivationConditionsOptions): ActivationState {
	const { spells, activateSpell, deactivateSpell } = useSpells();
	const [activationState, setActivationState] = useState<ActivationState>({
		isActive: false,
	});

	// Check if the spell is registered and active
	const isSpellActive = spells[spellId] === true;

	// Helper to check if event target is an input element
	const isInputElement = useCallback(
		(target: EventTarget | null) => {
			if (!ignoreInputElements) return false;
			if (!target || !(target instanceof HTMLElement)) return false;
			return (
				target.closest('input, textarea, [contenteditable="true"]') !== null
			);
		},
		[ignoreInputElements]
	);

	// Parse hotkey combo string
	const parseHotkeyCombo = useCallback(
		(
			combo: string
		): {
			key: string;
			modifiers: {
				ctrl: boolean;
				cmd: boolean;
				meta: boolean;
				alt: boolean;
				shift: boolean;
			};
		} => {
			const parts = combo.toLowerCase().split('+');
			const key = parts[parts.length - 1];
			return {
				key,
				modifiers: {
					ctrl: parts.includes('ctrl'),
					cmd: parts.includes('cmd'),
					meta: parts.includes('meta') || parts.includes('cmd'),
					alt: parts.includes('alt'),
					shift: parts.includes('shift'),
				},
			};
		},
		[]
	);

	// Check if keyboard event matches hotkey combo
	const matchesHotkey = useCallback(
		(event: KeyboardEvent, hotkey: Hotkey | HotkeyCombo): boolean => {
			if (typeof hotkey === 'string' && hotkey.includes('+')) {
				// It's a combo
				const combo = parseHotkeyCombo(hotkey);
				const keyMatches = event.key.toLowerCase() === combo.key;
				const modifiersMatch =
					event.ctrlKey === combo.modifiers.ctrl &&
					event.metaKey === combo.modifiers.meta &&
					event.altKey === combo.modifiers.alt &&
					event.shiftKey === combo.modifiers.shift;
				return keyMatches && modifiersMatch;
			} else {
				// Single key
				return event.key.toLowerCase() === hotkey.toLowerCase();
			}
		},
		[parseHotkeyCombo]
	);

	// Handle activation
	const handleActivation = useCallback(
		(triggerData: ActivationState['triggerData']) => {
			const newState: ActivationState = {
				isActive: true,
				triggerData,
			};
			setActivationState(newState);
			activateSpell(spellId);
			onActivate?.(newState);
		},
		[spellId, activateSpell, onActivate]
	);

	// Handle deactivation
	const handleDeactivation = useCallback(() => {
		setActivationState({ isActive: false });
		deactivateSpell(spellId);
		onDeactivate?.();
	}, [spellId, deactivateSpell, onDeactivate]);

	// Hotkey handlers
	useEffect(() => {
		if (!conditions.hotkeys || conditions.hotkeys.length === 0) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isInputElement(event.target)) return;

			for (const hotkey of conditions.hotkeys!) {
				if (matchesHotkey(event, hotkey)) {
					if (preventDefaultEvents) {
						event.preventDefault();
						event.stopPropagation();
					}

					if (activationState.isActive) {
						handleDeactivation();
					} else {
						handleActivation({
							type: 'hotkey',
							event: hotkey,
							originalEvent: event,
						});
					}
					break;
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [
		conditions.hotkeys,
		isInputElement,
		matchesHotkey,
		preventDefaultEvents,
		activationState.isActive,
		handleActivation,
		handleDeactivation,
	]);

	// Mouse event handlers
	useEffect(() => {
		if (!conditions.mouseEvents || conditions.mouseEvents.length === 0) return;

		const handlers: { [key: string]: (event: Event) => void } = {};

		if (conditions.mouseEvents.includes(MouseEvent.RIGHT_CLICK)) {
			handlers.contextmenu = (event: Event) => {
				const mouseEvent = event as globalThis.MouseEvent;
				if (preventDefaultEvents) {
					event.preventDefault();
				}
				handleActivation({
					type: 'mouse',
					event: MouseEvent.RIGHT_CLICK,
					mousePosition: { x: mouseEvent.clientX, y: mouseEvent.clientY },
					originalEvent: event,
				});
			};
		}

		if (conditions.mouseEvents.includes(MouseEvent.DOUBLE_CLICK)) {
			handlers.dblclick = (event: Event) => {
				const mouseEvent = event as globalThis.MouseEvent;
				handleActivation({
					type: 'mouse',
					event: MouseEvent.DOUBLE_CLICK,
					mousePosition: { x: mouseEvent.clientX, y: mouseEvent.clientY },
					originalEvent: event,
				});
			};
		}

		if (conditions.mouseEvents.includes(MouseEvent.MIDDLE_CLICK)) {
			handlers.auxclick = (event: Event) => {
				const mouseEvent = event as globalThis.MouseEvent;
				if (mouseEvent.button === 1) {
					// Middle button
					if (preventDefaultEvents) {
						event.preventDefault();
					}
					handleActivation({
						type: 'mouse',
						event: MouseEvent.MIDDLE_CLICK,
						mousePosition: { x: mouseEvent.clientX, y: mouseEvent.clientY },
						originalEvent: event,
					});
				}
			};
		}

		// Add event listeners
		Object.entries(handlers).forEach(([eventName, handler]) => {
			window.addEventListener(eventName, handler);
		});

		// Cleanup
		return () => {
			Object.entries(handlers).forEach(([eventName, handler]) => {
				window.removeEventListener(eventName, handler);
			});
		};
	}, [conditions.mouseEvents, preventDefaultEvents, handleActivation]);

	// Text selection handlers
	useEffect(() => {
		if (
			!conditions.selectionEvents ||
			!conditions.selectionEvents.includes(SelectionEvent.TEXT_SELECT)
		) {
			return;
		}

		let selectionTimeout: NodeJS.Timeout;

		const handleSelectionChange = () => {
			clearTimeout(selectionTimeout);
			selectionTimeout = setTimeout(() => {
				const selection = window.getSelection();
				const selectedText = selection?.toString().trim();

				if (selectedText && selectedText.length > 0) {
					handleActivation({
						type: 'selection',
						event: SelectionEvent.TEXT_SELECT,
						selectedText,
					});
				} else if (
					activationState.isActive &&
					activationState.triggerData?.type === 'selection'
				) {
					handleDeactivation();
				}
			}, 200); // Debounce selection events
		};

		document.addEventListener('selectionchange', handleSelectionChange);

		return () => {
			clearTimeout(selectionTimeout);
			document.removeEventListener('selectionchange', handleSelectionChange);
		};
	}, [
		conditions.selectionEvents,
		activationState.isActive,
		activationState.triggerData,
		handleActivation,
		handleDeactivation,
	]);

	// Handle external spell state changes
	useEffect(() => {
		if (!isSpellActive && activationState.isActive) {
			handleDeactivation();
		}
	}, [isSpellActive, activationState.isActive, handleDeactivation]);

	return activationState;
}

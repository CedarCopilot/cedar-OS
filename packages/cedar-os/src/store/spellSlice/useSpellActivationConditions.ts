'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useSpells } from '@/store/CedarStore';
import SpellActivationManager from './SpellActivationManager';

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
	// Mouse + modifier combos
	SHIFT_CLICK = 'shift+click',
	CTRL_CLICK = 'ctrl+click',
	CMD_CLICK = 'cmd+click',
	ALT_CLICK = 'alt+click',
}

export enum SelectionEvent {
	TEXT_SELECT = 'text-select',
}

// Activation modes
export enum ActivationMode {
	/**
	 * Toggle mode: Press to activate, press again to deactivate
	 * Good for persistent UI elements or modes
	 */
	TOGGLE = 'toggle',

	/**
	 * Hold mode: Activate on keydown/mousedown, deactivate on keyup/mouseup
	 * Good for temporary actions like radial menus
	 */
	HOLD = 'hold',

	/**
	 * Trigger mode: Fire once with optional cooldown
	 * Good for single actions that shouldn't be spammed
	 */
	TRIGGER = 'trigger',
}

// Combo string type for keyboard shortcuts
// Examples: "ctrl+s", "cmd+shift+p", "ctrl+alt+delete"
// We use a branded type to provide better IntelliSense while allowing any string
export type HotkeyCombo = string & { __brand?: 'HotkeyCombo' };

// Helper type for common hotkey combinations (for better IntelliSense)
export type CommonHotkeyCombo =
	| 'ctrl+s'
	| 'ctrl+c'
	| 'ctrl+v'
	| 'ctrl+x'
	| 'ctrl+z'
	| 'ctrl+shift+z'
	| 'cmd+s'
	| 'cmd+c'
	| 'cmd+v'
	| 'cmd+x'
	| 'cmd+z'
	| 'cmd+shift+z'
	| 'cmd+shift+p'
	| 'ctrl+shift+p'
	| 'alt+enter'
	| HotkeyCombo; // Allow any other string combo

// Union type for all activation events
export type ActivationEvent =
	| Hotkey
	| MouseEvent
	| SelectionEvent
	| HotkeyCombo;

// Activation conditions with mode configuration
export interface ActivationConditions {
	/**
	 * Array of events that can trigger activation
	 */
	events: ActivationEvent[];

	/**
	 * The activation mode (defaults to TOGGLE if not specified)
	 */
	mode?: ActivationMode;

	/**
	 * Cooldown in milliseconds for TRIGGER mode
	 * Prevents rapid re-triggering
	 */
	cooldown?: number;
}

export interface ActivationState {
	isActive: boolean;
	triggerData?: {
		type: 'hotkey' | 'mouse' | 'selection';
		event?: ActivationEvent;
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

/**
 * Hook to manage spell activation conditions using the centralized manager
 */
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

	// Get the centralized manager instance
	const manager = useRef(SpellActivationManager.getInstance());

	// Track if this spell is registered
	const isRegistered = useRef(false);

	// Use refs for callbacks to avoid re-registration issues
	const onActivateRef = useRef(onActivate);
	const onDeactivateRef = useRef(onDeactivate);

	useEffect(() => {
		onActivateRef.current = onActivate;
		onDeactivateRef.current = onDeactivate;
	}, [onActivate, onDeactivate]);

	// Handle activation callback
	const handleActivation = useCallback(
		(state: ActivationState) => {
			setActivationState(state);
			activateSpell(spellId);
			onActivateRef.current?.(state);
		},
		[spellId, activateSpell]
	);

	// Handle deactivation callback
	const handleDeactivation = useCallback(() => {
		setActivationState({ isActive: false });
		deactivateSpell(spellId);
		onDeactivateRef.current?.();
	}, [spellId, deactivateSpell]);

	// Register with the manager
	useEffect(() => {
		// Register on mount or when dependencies change
		manager.current.register(spellId, conditions, {
			onActivate: handleActivation,
			onDeactivate: handleDeactivation,
			preventDefaultEvents,
			ignoreInputElements,
		});
		isRegistered.current = true;

		// Cleanup on unmount or before re-registration
		return () => {
			manager.current.unregister(spellId);
			isRegistered.current = false;
		};
	}, [
		spellId,
		// Don't include callbacks in dependencies to avoid re-registration on every render
		// Only re-register if these critical props change
		JSON.stringify(conditions),
		preventDefaultEvents,
		ignoreInputElements,
	]);

	// Removed duplicate re-registration - handled in main effect

	// No need for interval sync - the callbacks handle state updates

	// Handle external spell state changes
	const isSpellActive = spells[spellId] === true;
	useEffect(() => {
		if (!isSpellActive && activationState.isActive) {
			handleDeactivation();
		}
	}, [isSpellActive, activationState.isActive, handleDeactivation]);

	return activationState;
}

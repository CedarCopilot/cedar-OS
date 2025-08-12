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

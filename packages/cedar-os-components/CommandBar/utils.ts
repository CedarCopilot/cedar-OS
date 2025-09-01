import type { ActivationEvent } from 'cedar-os';

/**
 * Map individual keys to their display symbols
 */
const getKeySymbol = (key: string): string => {
	switch (key.toLowerCase()) {
		case 'cmd':
		case 'meta':
			return '⌘';
		case 'ctrl':
			return '⌃';
		case 'alt':
			return '⌥';
		case 'shift':
			return '⇧';
		case 'enter':
			return '↵';
		case 'tab':
			return '⇥';
		case 'escape':
			return '⎋';
		case 'space':
			return '␣';
		case 'arrowup':
			return '↑';
		case 'arrowdown':
			return '↓';
		case 'arrowleft':
			return '←';
		case 'arrowright':
			return '→';
		default:
			return key.toUpperCase();
	}
};

/**
 * Convert ActivationEvent to display string for keyboard shortcuts
 */
export const getShortcutDisplay = (
	activationEvent: ActivationEvent
): string => {
	if (typeof activationEvent === 'string') {
		// Handle HotkeyCombo strings like 'cmd+s', 'ctrl+shift+p'
		if (activationEvent.includes('+')) {
			return activationEvent
				.split('+')
				.map((part) => getKeySymbol(part))
				.join('');
		}
		// Handle single keys
		return getKeySymbol(activationEvent);
	}

	// Handle Hotkey enum values
	return getKeySymbol(String(activationEvent));
};

import type { ActivationEvent } from 'cedar-os';

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
				.map((part) => {
					switch (part.toLowerCase()) {
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
							return part.toUpperCase();
					}
				})
				.join('');
		}
		// Handle single keys
		switch (activationEvent) {
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
				return activationEvent.toUpperCase();
		}
	}

	// Handle Hotkey enum values
	switch (activationEvent) {
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
			return String(activationEvent).toUpperCase();
	}
};

import {
	Hotkey,
	MouseEvent as SpellMouseEvent,
	SelectionEvent,
	ActivationMode,
	type ActivationEvent,
	type ActivationConditions,
	type ActivationState,
} from '@/store/spellSlice/SpellTypes';

type ActivationCallback = (state: ActivationState) => void;
type DeactivationCallback = () => void;

interface SpellRegistration {
	spellId: string;
	conditions: ActivationConditions;
	onActivate?: ActivationCallback;
	onDeactivate?: DeactivationCallback;
	preventDefaultEvents?: boolean;
	ignoreInputElements?: boolean;
	// Internal state
	isActive: boolean;
	lastTriggerTime: number;
	isOnCooldown: boolean;
	heldKeys: Set<string>;
	activeHoldEvent: ActivationEvent | null;
}

/**
 * Centralized manager for spell activations.
 * Maintains a single set of event listeners and routes events to registered spells.
 */
class SpellActivationManager {
	private static instance: SpellActivationManager | null = null;
	private registrations = new Map<string, SpellRegistration>();
	private isListening = false;
	private lastMousePosition = { x: 0, y: 0 };

	// Bound event handlers (for proper removal)
	private boundHandlers = {
		keydown: this.handleKeyDown.bind(this),
		keyup: this.handleKeyUp.bind(this),
		mousemove: this.handleMouseMove.bind(this),
		mouseup: this.handleMouseUp.bind(this),
		click: this.handleClick.bind(this),
		contextmenu: this.handleContextMenu.bind(this),
		dblclick: this.handleDoubleClick.bind(this),
		auxclick: this.handleAuxClick.bind(this),
		selectionchange: this.handleSelectionChange.bind(this),
	};

	private selectionTimeout: NodeJS.Timeout | null = null;

	private constructor() {
		// Private constructor for singleton
	}

	static getInstance(): SpellActivationManager {
		if (!SpellActivationManager.instance) {
			SpellActivationManager.instance = new SpellActivationManager();
		}
		return SpellActivationManager.instance;
	}

	/**
	 * Register a spell with its activation conditions
	 */
	register(
		spellId: string,
		conditions: ActivationConditions,
		callbacks: {
			onActivate?: ActivationCallback;
			onDeactivate?: DeactivationCallback;
			preventDefaultEvents?: boolean;
			ignoreInputElements?: boolean;
		}
	): void {
		const registration: SpellRegistration = {
			spellId,
			conditions,
			onActivate: callbacks.onActivate,
			onDeactivate: callbacks.onDeactivate,
			preventDefaultEvents: callbacks.preventDefaultEvents ?? true,
			ignoreInputElements: callbacks.ignoreInputElements ?? true,
			isActive: false,
			lastTriggerTime: 0,
			isOnCooldown: false,
			heldKeys: new Set(),
			activeHoldEvent: null,
		};

		this.registrations.set(spellId, registration);
		this.startListening();
	}

	/**
	 * Unregister a spell
	 */
	unregister(spellId: string): void {
		const registration = this.registrations.get(spellId);
		if (registration && registration.isActive) {
			// Deactivate if active
			this.deactivateSpell(registration);
		}
		this.registrations.delete(spellId);

		// Stop listening if no more registrations
		if (this.registrations.size === 0) {
			this.stopListening();
		}
	}

	/**
	 * Get activation state for a spell
	 */
	getActivationState(spellId: string): ActivationState {
		const registration = this.registrations.get(spellId);
		return {
			isActive: registration?.isActive ?? false,
		};
	}

	/**
	 * Start listening to events (if not already)
	 */
	private startListening(): void {
		if (this.isListening) return;
		this.isListening = true;

		// Keyboard events
		window.addEventListener('keydown', this.boundHandlers.keydown);
		window.addEventListener('keyup', this.boundHandlers.keyup);

		// Mouse events
		window.addEventListener('mousemove', this.boundHandlers.mousemove);
		window.addEventListener('mouseup', this.boundHandlers.mouseup);
		window.addEventListener('click', this.boundHandlers.click);
		window.addEventListener('contextmenu', this.boundHandlers.contextmenu);
		window.addEventListener('dblclick', this.boundHandlers.dblclick);
		window.addEventListener('auxclick', this.boundHandlers.auxclick);

		// Selection events
		document.addEventListener(
			'selectionchange',
			this.boundHandlers.selectionchange
		);
	}

	/**
	 * Stop listening to events
	 */
	private stopListening(): void {
		if (!this.isListening) return;
		this.isListening = false;

		// Remove all event listeners
		window.removeEventListener('keydown', this.boundHandlers.keydown);
		window.removeEventListener('keyup', this.boundHandlers.keyup);
		window.removeEventListener('mousemove', this.boundHandlers.mousemove);
		window.removeEventListener('mouseup', this.boundHandlers.mouseup);
		window.removeEventListener('click', this.boundHandlers.click);
		window.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
		window.removeEventListener('dblclick', this.boundHandlers.dblclick);
		window.removeEventListener('auxclick', this.boundHandlers.auxclick);
		document.removeEventListener(
			'selectionchange',
			this.boundHandlers.selectionchange
		);

		// Clear selection timeout
		if (this.selectionTimeout) {
			clearTimeout(this.selectionTimeout);
			this.selectionTimeout = null;
		}
	}

	/**
	 * Helper to check if event target is an input element
	 */
	private isInputElement(
		target: EventTarget | null,
		ignoreInputElements: boolean
	): boolean {
		if (!ignoreInputElements) return false;
		if (!target || !(target instanceof HTMLElement)) return false;
		return target.closest('input, textarea, [contenteditable="true"]') !== null;
	}

	/**
	 * Parse hotkey combo string
	 */
	private parseHotkeyCombo(combo: string): {
		key: string;
		modifiers: {
			ctrl: boolean;
			cmd: boolean;
			meta: boolean;
			alt: boolean;
			shift: boolean;
		};
	} {
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
	}

	/**
	 * Check if keyboard event matches hotkey
	 */
	private matchesHotkey(
		event: KeyboardEvent,
		hotkey: Hotkey | string
	): boolean {
		if (typeof hotkey === 'string' && hotkey.includes('+')) {
			// It's a combo - must match all modifiers exactly
			const combo = this.parseHotkeyCombo(hotkey);
			const keyMatches = event.key.toLowerCase() === combo.key;
			const modifiersMatch =
				event.ctrlKey === combo.modifiers.ctrl &&
				event.metaKey === combo.modifiers.meta &&
				event.altKey === combo.modifiers.alt &&
				event.shiftKey === combo.modifiers.shift;
			return keyMatches && modifiersMatch;
		} else {
			// Single key - should NOT have any modifiers (except shift for capital letters)
			// We allow shift for typing capital letters
			const hasUnexpectedModifiers =
				event.ctrlKey || event.metaKey || event.altKey;
			if (hasUnexpectedModifiers) {
				return false;
			}
			return event.key.toLowerCase() === hotkey.toLowerCase();
		}
	}

	/**
	 * Check if a string is a keyboard combo
	 */
	private isKeyboardCombo(value: string): boolean {
		return value.includes('+') && !value.includes('click');
	}

	/**
	 * Extract event types from conditions
	 */
	private extractEventTypes(events: ActivationEvent[]) {
		const hotkeyEvents = events.filter(
			(c): c is Hotkey | string =>
				Object.values(Hotkey).includes(c as Hotkey) ||
				(typeof c === 'string' && this.isKeyboardCombo(c))
		);

		const mouseEvents = events.filter((c): c is SpellMouseEvent =>
			Object.values(SpellMouseEvent).includes(c as SpellMouseEvent)
		);

		const selectionEvents = events.filter((c): c is SelectionEvent =>
			Object.values(SelectionEvent).includes(c as SelectionEvent)
		);

		return { hotkeyEvents, mouseEvents, selectionEvents };
	}

	/**
	 * Activate a spell
	 */
	private activateSpell(
		registration: SpellRegistration,
		triggerData: ActivationState['triggerData'],
		event?: ActivationEvent
	): void {
		const mode = registration.conditions.mode || ActivationMode.TOGGLE;
		const cooldown = registration.conditions.cooldown || 0;

		// Check cooldown for TRIGGER mode
		if (mode === ActivationMode.TRIGGER) {
			const now = Date.now();
			if (
				registration.isOnCooldown ||
				now - registration.lastTriggerTime < cooldown
			) {
				return;
			}
			registration.lastTriggerTime = now;
			if (cooldown > 0) {
				registration.isOnCooldown = true;
				setTimeout(() => {
					registration.isOnCooldown = false;
				}, cooldown);
			}
		}

		// For HOLD mode, track the active event
		if (mode === ActivationMode.HOLD && event) {
			registration.activeHoldEvent = event;
		}

		registration.isActive = true;
		const state: ActivationState = {
			isActive: true,
			triggerData,
		};

		registration.onActivate?.(state);

		// For TRIGGER mode, immediately deactivate after a short delay
		if (mode === ActivationMode.TRIGGER) {
			setTimeout(() => {
				this.deactivateSpell(registration);
			}, 100); // Brief activation for visual feedback
		}
	}

	/**
	 * Deactivate a spell
	 */
	private deactivateSpell(registration: SpellRegistration): void {
		registration.activeHoldEvent = null;
		registration.heldKeys.clear();
		registration.isActive = false;
		registration.onDeactivate?.();
	}

	// Event Handlers

	private handleMouseMove(event: MouseEvent): void {
		this.lastMousePosition = { x: event.clientX, y: event.clientY };
	}

	private handleKeyDown(event: KeyboardEvent): void {
		// Process each registration
		for (const registration of this.registrations.values()) {
			if (
				this.isInputElement(
					event.target,
					registration.ignoreInputElements ?? true
				)
			) {
				continue;
			}

			const { hotkeyEvents } = this.extractEventTypes(
				registration.conditions.events
			);
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;

			for (const hotkey of hotkeyEvents) {
				if (this.matchesHotkey(event, hotkey)) {
					if (registration.preventDefaultEvents) {
						event.preventDefault();
						event.stopPropagation();
					}

					const keyString =
						typeof hotkey === 'string' ? hotkey : (hotkey as string);

					if (mode === ActivationMode.TOGGLE) {
						if (registration.isActive) {
							this.deactivateSpell(registration);
						} else {
							this.activateSpell(
								registration,
								{
									type: 'hotkey',
									event: hotkey as ActivationEvent,
									mousePosition: this.lastMousePosition,
									originalEvent: event,
								},
								hotkey as ActivationEvent
							);
						}
					} else if (mode === ActivationMode.HOLD) {
						// For HOLD mode, only activate if not already active
						// We track held keys to handle key repeat events properly
						if (!registration.heldKeys.has(keyString)) {
							registration.heldKeys.add(keyString);
							// Only activate if not already active
							if (!registration.isActive) {
								this.activateSpell(
									registration,
									{
										type: 'hotkey',
										event: hotkey as ActivationEvent,
										mousePosition: this.lastMousePosition,
										originalEvent: event,
									},
									hotkey as ActivationEvent
								);
							}
						}
						// If key is already held, just ignore the repeat event
					} else if (mode === ActivationMode.TRIGGER) {
						if (!registration.isActive) {
							this.activateSpell(
								registration,
								{
									type: 'hotkey',
									event: hotkey as ActivationEvent,
									mousePosition: this.lastMousePosition,
									originalEvent: event,
								},
								hotkey as ActivationEvent
							);
						}
					}
					break;
				}
			}
		}
	}

	private handleKeyUp(event: KeyboardEvent): void {
		// Process HOLD mode registrations
		for (const registration of this.registrations.values()) {
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;
			if (mode !== ActivationMode.HOLD) continue;

			const { hotkeyEvents } = this.extractEventTypes(
				registration.conditions.events
			);

			for (const hotkey of hotkeyEvents) {
				// Use the same matching logic as keydown
				if (this.matchesHotkey(event, hotkey)) {
					const keyString =
						typeof hotkey === 'string' ? hotkey : (hotkey as string);
					registration.heldKeys.delete(keyString);

					// Deactivate if this was the last held key and spell is active
					// This handles cases where multiple keys could activate the same spell
					if (registration.heldKeys.size === 0 && registration.isActive) {
						this.deactivateSpell(registration);
					}
					break;
				}
			}
		}
	}

	private handleClick(event: MouseEvent): void {
		// Handle modifier+click combos
		for (const registration of this.registrations.values()) {
			const { mouseEvents } = this.extractEventTypes(
				registration.conditions.events
			);
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;

			let matchedEvent: SpellMouseEvent | null = null;

			if (event.shiftKey && mouseEvents.includes(SpellMouseEvent.SHIFT_CLICK)) {
				matchedEvent = SpellMouseEvent.SHIFT_CLICK;
			} else if (
				event.ctrlKey &&
				mouseEvents.includes(SpellMouseEvent.CTRL_CLICK)
			) {
				matchedEvent = SpellMouseEvent.CTRL_CLICK;
			} else if (
				event.metaKey &&
				mouseEvents.includes(SpellMouseEvent.CMD_CLICK)
			) {
				matchedEvent = SpellMouseEvent.CMD_CLICK;
			} else if (
				event.altKey &&
				mouseEvents.includes(SpellMouseEvent.ALT_CLICK)
			) {
				matchedEvent = SpellMouseEvent.ALT_CLICK;
			}

			if (matchedEvent) {
				if (registration.preventDefaultEvents) {
					event.preventDefault();
					event.stopPropagation();
				}

				if (mode === ActivationMode.TOGGLE) {
					if (registration.isActive) {
						this.deactivateSpell(registration);
					} else {
						this.activateSpell(
							registration,
							{
								type: 'mouse',
								event: matchedEvent,
								mousePosition: { x: event.clientX, y: event.clientY },
								originalEvent: event,
							},
							matchedEvent
						);
					}
				} else {
					this.activateSpell(
						registration,
						{
							type: 'mouse',
							event: matchedEvent,
							mousePosition: { x: event.clientX, y: event.clientY },
							originalEvent: event,
						},
						matchedEvent
					);
				}
			}
		}
	}

	private handleContextMenu(event: MouseEvent): void {
		for (const registration of this.registrations.values()) {
			const { mouseEvents } = this.extractEventTypes(
				registration.conditions.events
			);
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;

			if (mouseEvents.includes(SpellMouseEvent.RIGHT_CLICK)) {
				if (registration.preventDefaultEvents) {
					event.preventDefault();
				}

				if (mode === ActivationMode.HOLD) {
					// For hold mode with right-click, activate immediately
					this.activateSpell(
						registration,
						{
							type: 'mouse',
							event: SpellMouseEvent.RIGHT_CLICK,
							mousePosition: { x: event.clientX, y: event.clientY },
							originalEvent: event,
						},
						SpellMouseEvent.RIGHT_CLICK
					);

					// Set up mouseup handler for deactivation
					const handleMouseUp = () => {
						if (registration.activeHoldEvent === SpellMouseEvent.RIGHT_CLICK) {
							this.deactivateSpell(registration);
						}
						window.removeEventListener('mouseup', handleMouseUp);
					};
					window.addEventListener('mouseup', handleMouseUp);
				} else {
					// For other modes, handle normally
					if (mode === ActivationMode.TOGGLE && registration.isActive) {
						this.deactivateSpell(registration);
					} else {
						this.activateSpell(
							registration,
							{
								type: 'mouse',
								event: SpellMouseEvent.RIGHT_CLICK,
								mousePosition: { x: event.clientX, y: event.clientY },
								originalEvent: event,
							},
							SpellMouseEvent.RIGHT_CLICK
						);
					}
				}
			}
		}
	}

	private handleDoubleClick(event: MouseEvent): void {
		for (const registration of this.registrations.values()) {
			const { mouseEvents } = this.extractEventTypes(
				registration.conditions.events
			);
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;

			if (mouseEvents.includes(SpellMouseEvent.DOUBLE_CLICK)) {
				if (mode === ActivationMode.TOGGLE && registration.isActive) {
					this.deactivateSpell(registration);
				} else {
					this.activateSpell(
						registration,
						{
							type: 'mouse',
							event: SpellMouseEvent.DOUBLE_CLICK,
							mousePosition: { x: event.clientX, y: event.clientY },
							originalEvent: event,
						},
						SpellMouseEvent.DOUBLE_CLICK
					);
				}
			}
		}
	}

	private handleAuxClick(event: MouseEvent): void {
		if (event.button !== 1) return; // Only middle button

		for (const registration of this.registrations.values()) {
			const { mouseEvents } = this.extractEventTypes(
				registration.conditions.events
			);
			const mode = registration.conditions.mode || ActivationMode.TOGGLE;

			if (mouseEvents.includes(SpellMouseEvent.MIDDLE_CLICK)) {
				if (registration.preventDefaultEvents) {
					event.preventDefault();
				}

				if (mode === ActivationMode.TOGGLE && registration.isActive) {
					this.deactivateSpell(registration);
				} else {
					this.activateSpell(
						registration,
						{
							type: 'mouse',
							event: SpellMouseEvent.MIDDLE_CLICK,
							mousePosition: { x: event.clientX, y: event.clientY },
							originalEvent: event,
						},
						SpellMouseEvent.MIDDLE_CLICK
					);
				}
			}
		}
	}

	private handleMouseUp(): void {
		// This is handled inline for right-click hold mode
		// Could be extended for other mouse hold scenarios
	}

	private handleSelectionChange(): void {
		// Clear previous timeout
		if (this.selectionTimeout) {
			clearTimeout(this.selectionTimeout);
		}

		// Debounce selection events
		this.selectionTimeout = setTimeout(() => {
			const selection = window.getSelection();
			const selectedText = selection?.toString().trim();

			for (const registration of this.registrations.values()) {
				const { selectionEvents } = this.extractEventTypes(
					registration.conditions.events
				);

				if (selectionEvents.includes(SelectionEvent.TEXT_SELECT)) {
					if (selectedText && selectedText.length > 0) {
						this.activateSpell(
							registration,
							{
								type: 'selection',
								event: SelectionEvent.TEXT_SELECT,
								selectedText,
							},
							SelectionEvent.TEXT_SELECT
						);
					} else if (registration.isActive) {
						// Deactivate if no text selected
						this.deactivateSpell(registration);
					}
				}
			}
		}, 200);
	}
}

export default SpellActivationManager;

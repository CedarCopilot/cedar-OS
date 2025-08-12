import { StateCreator } from 'zustand';
import { CedarStore } from '@/store/CedarOSTypes';
import {
	createActionLog,
	updateActionLog,
} from '@/components/guidance/utils/actionSupabase';

import {
	getPositionFromElement,
	PositionOrElement,
} from '@/components/guidance/utils/positionUtils';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageInput } from '@/store/messages/MessageTypes';

/**
 * Action Queue Management:
 * - currentAction: The action currently being executed
 * - queue: Contains only pending actions (doesn't include currentAction)
 *
 * This structure avoids redundancy by ensuring the current action is not duplicated
 * in the queue. New actions are always added to the queue. Queue processing starts
 * automatically when adding an action to an empty queue with no current action.
 *
 * When an action completes (nextAction is called):
 * 1. The current action's onEnd callback is executed if it exists
 * 2. The next action is taken from the queue and becomes the current action
 */

// Define action types
export type ActionType =
	| 'CURSOR_TAKEOVER'
	| 'VIRTUAL_CLICK'
	| 'VIRTUAL_DRAG'
	| 'MULTI_VIRTUAL_CLICK'
	| 'CHAT'
	| 'IDLE'
	| 'CHAT_TOOLTIP'
	| 'VIRTUAL_TYPING'
	| 'DIALOGUE'
	| 'SURVEY'
	| 'EXECUTE_CLICK'
	| 'EXECUTE_TYPING'
	| 'TOAST'
	| 'IF'
	| 'GATE_IF'
	| 'NAVIGATE'
	| 'RIGHT_CLICK'
	| 'DIALOGUE_BANNER';

// Base action interface
export interface BaseAction {
	id?: string; // Made optional so it can be auto-generated
	type: ActionType;
	onEnd?: () => void;
}

// Cursor takeover action
export interface CursorTakeoverAction extends BaseAction {
	type: 'CURSOR_TAKEOVER';
	isRedirected: boolean;
	cursorColor?: string;
	messages?: string[]; // Array of messages to display in sequence
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
}

// Virtual click action
export interface VirtualClickAction extends BaseAction {
	type: 'VIRTUAL_CLICK';
	endPosition: PositionOrElement; // Can be a Position object or an HTML element
	startPosition?: PositionOrElement; // Can be a Position object or an HTML element
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom'; // Position of the tooltip relative to the cursor
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor the tooltip to the target element's rect or to the cursor
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void); // Controls how the action advances to the next one
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	disableClickableArea?: boolean; // When true, disables click interaction on the clickable area
}

// Virtual drag action
export interface VirtualDragAction extends BaseAction {
	type: 'VIRTUAL_DRAG';
	endPosition: PositionOrElement; // Can be a Position object or an HTML element
	startPosition?: PositionOrElement; // Can be a Position object or an HTML element
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom'; // Position of the tooltip relative to the cursor
	tooltipAnchor?: 'rect' | 'cursor'; // Whether to anchor the tooltip to the target element's rect or to the cursor
	startTooltip?: {
		tooltipText: string;
		tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
		tooltipAnchor?: 'rect' | 'cursor';
	};
	advanceMode?:
		| 'external'
		| 'clickable'
		| (() => boolean)
		| ((nextAction: () => void) => void); // Controls how the action advances to the next one. Default is equivalent to 'external'
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	dragCursor?: boolean; // When true, uses a drag cursor animation (closed fist -> open)
}

// Multi virtual click action
export interface MultiVirtualClickAction extends BaseAction {
	type: 'MULTI_VIRTUAL_CLICK';
	actions: Omit<VirtualClickAction, 'id' | 'type'>[]; // Array of virtual click actions to execute in sequence
	loop?: boolean; // Whether to loop through all click actions
	delay?: number; // Delay between each click in milliseconds
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void); // Controls how the action advances to the next one
}

// Virtual typing action
export interface VirtualTypingAction extends BaseAction {
	type: 'VIRTUAL_TYPING';
	endPosition: PositionOrElement; // Can be a Position object or an HTML element
	startPosition?: PositionOrElement; // Can be a Position object or an HTML element
	expectedValue: string | ((value: string) => boolean); // The expected value to type or a function to validate the value
	checkExistingValue?: boolean; // Whether to check if the existing value matches expected before typing
	typingDelay?: number; // Delay between each character in milliseconds
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	/**
	 * Determines where the tooltip should anchor when displayed. If set to "rect", the tooltip
	 * is positioned relative to the target element's bounding rect. If set to "cursor", the tooltip
	 * follows the cursor itself.
	 *
	 * Defaults to "rect" to mimic existing behaviour in VIRTUAL_CLICK.
	 */
	tooltipAnchor?: 'rect' | 'cursor';
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void); // Controls how the action advances to the next one
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
}

// Chat action: dispatch messages via addMessage
export interface ChatAction extends BaseAction {
	type: 'CHAT';
	/**
	 * The message to dispatch when this action runs.
	 */
	content: MessageInput;
	/**
	 * Delay in milliseconds before dispatching the primary message.
	 */
	messageDelay?: number;
	/**
	 * Whether to automatically advance to the next action after dispatching the primary message.
	 * Defaults to true.
	 */
	autoAdvance?: boolean;
	/**
	 * Additional messages to dispatch sequentially. Each can override delay and autoAdvance.
	 */
	customMessages?: {
		content: MessageInput;
		messageDelay?: number;
		autoAdvance?: boolean;
	}[];
}

// Chat tooltip action
export interface ChatTooltipAction extends BaseAction {
	type: 'CHAT_TOOLTIP';
	content: string;
	position?: 'left' | 'right' | 'top' | 'bottom';
	backgroundColor?: string;
	textColor?: string;
	animateCharacters?: boolean;
	duration?: number; // If set, automatically complete after this duration
}

// Idle action
export interface IdleAction extends BaseAction {
	type: 'IDLE';
	duration?: number; // Duration in milliseconds
	advanceFunction?: (nextAction: (actionId?: string) => void) => void; // Function to call with nextAction as parameter
}

// Dialogue action
export interface DialogueAction extends BaseAction {
	type: 'DIALOGUE';
	text: string;
	style?: React.CSSProperties;
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void);
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	highlightElements?:
		| PositionOrElement[]
		| { _lazy: true; resolve: () => PositionOrElement[] }; // Optional array of elements to highlight or a lazy resolver
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
}

// Dialogue banner action (banner without overlays)
export interface DialogueBannerAction extends BaseAction {
	type: 'DIALOGUE_BANNER';
	/** Optional text for typewriter or fallback if no children */
	text?: string;
	/** Optional children for custom banner content */
	children?: React.ReactNode;
	style?: React.CSSProperties;
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void);
}

// Define question types for the survey
export type SurveyQuestionType =
	| 'shortText'
	| 'longText'
	| 'number'
	| 'thumbs'
	| 'slider'
	| 'nps';

// Base survey question interface with common properties
export interface BaseSurveyQuestion {
	id: string;
	question: string;
	required?: boolean;
	value?: string | number | boolean;
}

// Short text question type
export interface ShortTextQuestion extends BaseSurveyQuestion {
	type: 'shortText';
	placeholder?: string;
}

// Long text question type
export interface LongTextQuestion extends BaseSurveyQuestion {
	type: 'longText';
	placeholder?: string;
}

// Number input question type
export interface NumberQuestion extends BaseSurveyQuestion {
	type: 'number';
	placeholder?: string;
	min?: number;
	max?: number;
	step?: number;
}

// Thumbs up/down question type
export interface ThumbsQuestion extends BaseSurveyQuestion {
	type: 'thumbs';
}

// Slider question type
export interface SliderQuestion extends BaseSurveyQuestion {
	type: 'slider';
	min: number; // Required for slider
	max: number; // Required for slider
	step?: number;
	defaultValue?: number;
	labels?: string[]; // For labels like ['Poor', 'Good', 'Excellent']
}

// NPS (Net Promoter Score) question type (always 0-10 range)
export interface NPSQuestion extends BaseSurveyQuestion {
	type: 'nps';
}

// Union type of all survey question types
export type SurveyQuestion =
	| ShortTextQuestion
	| LongTextQuestion
	| NumberQuestion
	| ThumbsQuestion
	| SliderQuestion
	| NPSQuestion;

// Survey action
export interface SurveyAction extends BaseAction {
	type: 'SURVEY';
	title?: string;
	description?: string;
	questions: SurveyQuestion[];
	blocking?: boolean; // When true, user must complete the survey to proceed (defaults to false)
	submitButtonText?: string;
	cancelButtonText?: string;
	onSubmit?: (responses: Record<string, string | number | boolean>) => void;
	trigger_id?: string; // Optional trigger ID to associate with feedback
}

// Execute click action (performs an actual DOM click)
export interface ExecuteClickAction extends BaseAction {
	type: 'EXECUTE_CLICK';
	target: PositionOrElement; // Element to physically click
	startPosition?: PositionOrElement; // Optional starting position for animation
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	blocking?: boolean;
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	showCursor?: boolean; // When true, shows virtual cursor animation before clicking (default: true)
}

// Execute typing action
export interface ExecuteTypingAction extends BaseAction {
	type: 'EXECUTE_TYPING';
	endPosition: PositionOrElement; // Element to type into
	expectedValue: string; // The expected value to type
}

// Toast action
export interface ToastAction extends BaseAction {
	type: 'TOAST';
	title?: string;
	description: string;
	variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
	duration?: number; // Duration in milliseconds before auto-closing (default: 4000ms)
	position?: 'bottom-right' | 'bottom-left' | 'bottom' | 'top'; // Position of the toast on the screen
	toastMode?: boolean; // When true, makes the toast look like a piece of toast with butter
	action?: {
		icon?: 'link' | 'action' | 'check'; // Custom icon to display in the toast
		label: string;
		onClick?: () => void;
	};
}

// IF action - conditionally shows one of two actions based on a condition
export interface IFAction extends BaseAction {
	type: 'IF';
	condition: boolean | (() => boolean) | (() => Promise<boolean>); // Condition to check - function (sync or async) or boolean
	trueAction: ActionInput; // Action to show if condition is true
	falseAction: ActionInput; // Action to show if condition is false
	advanceCondition?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void); // Controls how the action advances to the next one
}

// GATE_IF action - conditionally adds a set of actions to the queue based on a one-time condition check
export interface GateIfAction extends BaseAction {
	type: 'GATE_IF';
	condition: boolean | (() => boolean) | (() => Promise<boolean>); // Condition to check - function (sync or async) or boolean
	trueActions: ActionInput[]; // Actions to add if condition is true
	falseActions: ActionInput[]; // Actions to add if condition is false
}

// Navigation action
export interface NavigateAction extends BaseAction {
	type: 'NAVIGATE';
	url: string; // URL to navigate to
}

// Right click indicator action
export interface RightClickAction extends BaseAction {
	type: 'RIGHT_CLICK';
	duration?: number; // optional auto-dismiss after duration ms
}

// Union type of all possible actions
export type Action =
	| CursorTakeoverAction
	| VirtualClickAction
	| VirtualDragAction
	| ChatAction
	| ChatTooltipAction
	| IdleAction
	| MultiVirtualClickAction
	| VirtualTypingAction
	| DialogueAction
	| SurveyAction
	| ExecuteClickAction
	| ExecuteTypingAction
	| ToastAction
	| IFAction
	| GateIfAction
	| NavigateAction
	| RightClickAction
	| DialogueBannerAction;

// Type alias for actions with optional IDs
export type MakeIdOptional<T> = T extends BaseAction
	? Omit<T, 'id'> & { id?: string }
	: never;
export type ActionInput = MakeIdOptional<Action>;

export interface ActionsSlice {
	queue: Action[];
	currentAction: Action | null;
	isActive: boolean;
	prevCursorPosition: { x: number; y: number } | null;
	onQueueComplete: (() => void) | null;
	isAnimatingOut: boolean;
	actionLogId: string;
	actionSessionId: string;

	// Actions
	addAction: (action: ActionInput, actionConfigId?: string) => void;
	addActions: (actions: ActionInput[], actionConfigId?: string) => void;
	removeAction: (id: string) => void;
	replaceActions: (actions: ActionInput[], actionConfigId?: string) => void;
	clearQueue: () => void;
	nextAction: (actionId?: string) => void;
	setIsActive: (active: boolean) => void;
	setPrevCursorPosition: (position: { x: number; y: number } | null) => void;
	setOnQueueComplete: (callback: (() => void) | null) => void;
	setIsAnimatingOut: (animating: boolean) => void;
	addActionsToStart: (actions: ActionInput[] | ActionInput) => void;
	setActionSessionId: (sessionId: string) => void;
	setCurrentAction: (action: Action | null) => void;
}

// Create the slice
export const createActionsSlice: StateCreator<
	CedarStore,
	[],
	[],
	ActionsSlice
> = (set, get) => ({
	// Default state
	queue: [],
	currentAction: null,
	isActive: true,
	prevCursorPosition: null,
	onQueueComplete: null,
	isAnimatingOut: false,
	actionLogId: '',
	actionSessionId: '',

	// Actions
	setCurrentAction: (action) => set({ currentAction: action }),
	addAction: async (action: ActionInput, actionConfigId?: string) => {
		// Generate UUID if id is not provided
		const actionWithId = {
			...action,
			id: action.id || uuidv4(),
		} as Action;

		const state = get();

		// Create action log if this is the first action and we have user/product IDs
		if (
			!state.currentAction &&
			state.queue.length === 0 &&
			state.userId &&
			state.productId
		) {
			try {
				const data = await createActionLog(
					state.userId,
					state.productId,
					state.actionSessionId,
					actionConfigId,
					[actionWithId]
				);
				if (data.log) {
					set({
						actionLogId: data.log.id,
						actionSessionId: data.log.session_id,
					});
				}
			} catch (error) {
				console.error('Error creating action log:', error);
			}
		}

		if (!state.currentAction && state.queue.length === 0) {
			set({
				queue: [actionWithId],
			});
			requestAnimationFrame(() => get().nextAction());
		} else {
			set((state: CedarStore) => ({
				queue: [...state.queue, actionWithId],
			}));
		}
	},

	addActions: async (actions: ActionInput[], actionConfigId?: string) => {
		// Generate UUIDs for actions without ids
		const actionsWithIds = actions.map((action) => ({
			...action,
			id: action.id || uuidv4(),
		})) as Action[];

		if (actionsWithIds.length === 0) return;

		const state = get();

		// Create action log if this is the first action and we have user/product IDs
		if (
			!state.currentAction &&
			state.queue.length === 0 &&
			state.userId &&
			state.productId
		) {
			try {
				const data = await createActionLog(
					state.userId,
					state.productId,
					state.actionSessionId,
					actionConfigId,
					actionsWithIds
				);
				if (data.log) {
					set({
						actionLogId: data.log.id,
						actionSessionId: data.log.session_id,
					});
				}
			} catch (error) {
				console.error('Error creating action log:', error);
			}
		}

		if (!state.currentAction && state.queue.length === 0) {
			set({
				queue: actionsWithIds,
			});
			requestAnimationFrame(() => get().nextAction());
		} else {
			set((state: CedarStore) => ({
				queue: [...state.queue, ...actionsWithIds],
			}));
		}
	},

	replaceActions: async (actions: ActionInput[], actionConfigId?: string) => {
		// Generate UUIDs for actions without ids
		const actionsWithIds = actions.map((action) => ({
			...action,
			id: action.id || uuidv4(),
		})) as Action[];

		const state = get();

		// Create action log if we have user/product IDs
		if (state.userId && state.productId) {
			try {
				const data = await createActionLog(
					state.userId,
					state.productId,
					state.actionSessionId,
					actionConfigId,
					actionsWithIds
				);
				if (data.log) {
					set({
						actionLogId: data.log.id,
						actionSessionId: data.log.session_id,
					});
				}
			} catch (error) {
				console.error('Error creating action log:', error);
			}
		}

		// Replace the queue with new actions
		set({
			queue: actionsWithIds,
		});

		requestAnimationFrame(() => get().nextAction());
	},

	removeAction: (id: string) => {
		set((state: CedarStore) => {
			// Check if we're removing the current action
			if (state.currentAction?.id === id) {
				const newCurrentAction = state.queue.length > 0 ? state.queue[0] : null;
				const newQueue = state.queue.length > 0 ? state.queue.slice(1) : [];

				return {
					currentAction: newCurrentAction,
					queue: newQueue,
				};
			} else {
				// Otherwise just filter the queue
				const newQueue = state.queue.filter(
					(action: Action) => action.id !== id
				);
				return {
					queue: newQueue,
				};
			}
		});
	},

	clearQueue: () => {
		set({
			queue: [],
			currentAction: null,
		});
	},

	nextAction: async (actionId?: string) => {
		const state = get();
		// Only validate the actionId if one is provided
		if (
			actionId &&
			state.currentAction &&
			actionId !== state.currentAction.id
		) {
			return;
		}

		// Execute onEnd callback of current action if it exists
		if (state.currentAction?.onEnd) {
			try {
				state.currentAction.onEnd();
			} catch (error) {
				console.error('Error in onEnd callback:', error);
			}
		}

		// Update action log if we have one and a current action
		if (state.actionLogId && state.currentAction) {
			try {
				await updateActionLog(state.actionLogId, {
					action: state.currentAction,
				});
			} catch (error) {
				console.error('Error updating action log:', error);
			}
		}

		// Get the next action from the queue
		const nextActionInQueue = state.queue[0];

		// Handle navigation action
		if (nextActionInQueue?.type === 'NAVIGATE') {
			const navigateAction = nextActionInQueue as NavigateAction;
			window.open(navigateAction.url, '_blank');

			set((state: CedarStore) => {
				// Atomic check: only update if current action still matches actionId
				if (
					actionId &&
					(!state.currentAction || state.currentAction.id !== actionId)
				) {
					return state; // No changes
				}
				const newQueue = state.queue.slice(1);
				return {
					queue: newQueue,
					currentAction: null,
				};
			});
			return;
		}

		// Special handling for function-based advance modes
		if (
			(nextActionInQueue?.type === 'VIRTUAL_CLICK' ||
				nextActionInQueue?.type === 'VIRTUAL_DRAG' ||
				nextActionInQueue?.type === 'DIALOGUE') &&
			typeof nextActionInQueue?.advanceMode === 'function'
		) {
			// Call the function to check if we should advance
			// For DIALOGUE type with function advanceMode, the DialogueBox component will handle it
			// The function should return a boolean (true=advance, false=don't advance)
			if ((nextActionInQueue.advanceMode as () => boolean)()) {
				set((state: CedarStore) => {
					// Atomic check: only update if current action still matches actionId
					if (
						actionId &&
						(!state.currentAction || state.currentAction.id !== actionId)
					) {
						return state; // No changes
					}
					const newQueue = state.queue.slice(1);
					return {
						queue: newQueue,
						currentAction: null,
					};
				});

				requestAnimationFrame(() => get().nextAction()); // Use requestAnimationFrame instead of a 1ms timeout
				return;
			}
		}

		// Store position if current action is a cursor click or virtual drag
		if (
			state.currentAction?.type === 'VIRTUAL_CLICK' ||
			state.currentAction?.type === 'VIRTUAL_DRAG' ||
			state.currentAction?.type === 'VIRTUAL_TYPING'
		) {
			try {
				// Convert to Position object if it's an HTML element
				const endPosition = getPositionFromElement(
					state.currentAction.endPosition
				);

				// Only update if we successfully got a position
				if (
					endPosition &&
					typeof endPosition.x === 'number' &&
					typeof endPosition.y === 'number'
				) {
					set({ prevCursorPosition: endPosition });
				}

				// If next action is also VIRTUAL_CLICK/DRAG/TYPING, update normally without fadeout
				if (
					nextActionInQueue &&
					(nextActionInQueue.type === 'VIRTUAL_CLICK' ||
						nextActionInQueue.type === 'VIRTUAL_DRAG' ||
						nextActionInQueue.type === 'VIRTUAL_TYPING') &&
					!nextActionInQueue.startPosition
				) {
					set((state: CedarStore) => {
						// Atomic check: only update if current action still matches actionId
						if (
							actionId &&
							(!state.currentAction || state.currentAction.id !== actionId)
						) {
							return state; // No changes
						}
						const [newCurrentAction, ...newQueue] = state.queue;
						return {
							currentAction: newCurrentAction,
							queue: newQueue,
						};
					});
				} else {
					// Start fadeout animation
					set({ isAnimatingOut: true });

					// Wait for animation to complete before updating the queue
					setTimeout(() => {
						set((state: CedarStore) => {
							// Atomic check: only update if current action still matches actionId
							if (
								actionId &&
								(!state.currentAction || state.currentAction.id !== actionId)
							) {
								return state; // No changes
							}
							const [newCurrentAction, ...newQueue] = state.queue;
							if (state.queue.length > 0) {
								return {
									currentAction: newCurrentAction,
									queue: newQueue,
									isAnimatingOut: false,
								};
							} else {
								return {
									currentAction: null,
									isAnimatingOut: false,
								};
							}
						});
					}, 300); // Duration of fadeout animation
				}
			} catch (error) {
				console.error('Failed to update prevCursorPosition:', error);
			}
		} else {
			// Regular handling for other action types
			set((state: CedarStore) => {
				// Atomic check: only update if current action still matches actionId
				if (
					actionId &&
					(!state.currentAction || state.currentAction.id !== actionId)
				) {
					return state; // No changes
				}
				if (state.queue.length > 0) {
					const [newCurrentAction, ...newQueue] = state.queue;
					return {
						currentAction: newCurrentAction,
						queue: newQueue,
					};
				} else {
					return {
						currentAction: null,
					};
				}
			});
		}

		// Check if this was the last action
		if (state.queue.length === 0) {
			set((state: CedarStore) => {
				// Atomic check: only update if current action still matches actionId
				if (
					actionId &&
					(!state.currentAction || state.currentAction.id !== actionId)
				) {
					return { isAnimatingOut: false };
				}
				return {
					isAnimatingOut: false,
					currentAction: null,
					queue: [],
				};
			});

			// Update action log as completed
			if (state.actionLogId) {
				try {
					await updateActionLog(state.actionLogId, {
						completed: true,
					});
				} catch (error) {
					console.error('Error completing action log:', error);
				}
			}

			// Call onQueueComplete if it exists
			if (state.onQueueComplete) {
				try {
					state.onQueueComplete();
				} catch (error) {
					console.error('Error in onQueueComplete callback:', error);
				}
			}
		}
	},

	setIsActive: (active: boolean) => set({ isActive: active }),
	setPrevCursorPosition: (position: { x: number; y: number } | null) =>
		set({ prevCursorPosition: position }),
	setOnQueueComplete: (callback: (() => void) | null) =>
		set({
			onQueueComplete: callback,
		}),
	setIsAnimatingOut: (animating: boolean) => set({ isAnimatingOut: animating }),

	addActionsToStart: (actions: ActionInput[] | ActionInput) => {
		const state = get();

		// Convert single action input to array if necessary
		const actionsToAdd = Array.isArray(actions) ? actions : [actions];

		// Generate UUIDs for actions without ids
		const actionsWithIds = actionsToAdd.map((action) => ({
			...action,
			id: action.id || uuidv4(),
		})) as Action[];

		// Add the actions to the start of the queue
		set({
			queue: [...actionsWithIds, ...state.queue],
		});
		requestAnimationFrame(() => get().nextAction());
	},

	setActionSessionId: (sessionId: string) =>
		set({ actionSessionId: sessionId }),
});

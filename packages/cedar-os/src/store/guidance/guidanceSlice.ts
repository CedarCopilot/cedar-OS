import { CedarStore } from '@/store/CedarOSTypes';
import { StateCreator } from 'zustand';

import {
	getPositionFromElement,
	PositionOrElement,
} from '@/components/guidance/utils/positionUtils';
import { MessageInput } from '@/store/messages/MessageTypes';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getShadedColor } from '@/styles/stylingUtils';

// Guidance styling configuration
export interface GuidanceStylingConfig {
	textColor?: string;
	tooltipStyle?: 'solid' | 'lined';
	tooltipSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
}

/**
 * Guidance Queue Management:
 * - currentGuidance: The guidance currently being executed
 * - queue: Contains only pending guidances (doesn't include currentGuidance)
 *
 * This structure avoids redundancy by ensuring the current guidance is not duplicated
 * in the queue. New guidances are always added to the queue. Queue processing starts
 * automatically when adding a guidance to an empty queue with no current guidance.
 *
 * When a guidance completes (nextGuidance is called):
 * 1. The current guidance's onEnd callback is executed if it exists
 * 2. The next guidance is taken from the queue and becomes the current guidance
 */

// Define guidance types
export type GuidanceType =
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

// Base guidance interface
export interface BaseGuidance {
	id?: string; // Made optional so it can be auto-generated
	type: GuidanceType;
	onEnd?: () => void;
}

// Cursor takeover guidance
export interface CursorTakeoverGuidance extends BaseGuidance {
	type: 'CURSOR_TAKEOVER';
	isRedirected: boolean;
	cursorColor?: string;
	messages?: string[]; // Array of messages to display in sequence
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
}

// Virtual click guidance
export interface VirtualClickGuidance extends BaseGuidance {
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
		| ((nextGuidance: () => void) => void); // Controls how the guidance advances to the next one
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	disableClickableArea?: boolean; // When true, disables click interaction on the clickable area
}

// Virtual drag guidance
export interface VirtualDragGuidance extends BaseGuidance {
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
		| ((nextGuidance: () => void) => void); // Controls how the guidance advances to the next one. Default is equivalent to 'external'
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	dragCursor?: boolean; // When true, uses a drag cursor animation (closed fist -> open)
}

// Multi virtual click guidance
export interface MultiVirtualClickGuidance extends BaseGuidance {
	type: 'MULTI_VIRTUAL_CLICK';
	guidances: Omit<VirtualClickGuidance, 'id' | 'type'>[]; // Array of virtual click guidances to execute in sequence
	loop?: boolean; // Whether to loop through all click guidances
	delay?: number; // Delay between each click in milliseconds
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextGuidance: () => void) => void); // Controls how the guidance advances to the next one
}

// Virtual typing guidance
export interface VirtualTypingGuidance extends BaseGuidance {
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
		| ((nextGuidance: () => void) => void); // Controls how the guidance advances to the next one
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
}

// Chat guidance: dispatch messages via addMessage
export interface ChatGuidance extends BaseGuidance {
	type: 'CHAT';
	/**
	 * The message to dispatch when this guidance runs.
	 */
	content: MessageInput;
	/**
	 * Delay in milliseconds before dispatching the primary message.
	 */
	messageDelay?: number;
	/**
	 * Whether to automatically advance to the next guidance after dispatching the primary message.
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

// Chat tooltip guidance
export interface ChatTooltipGuidance extends BaseGuidance {
	type: 'CHAT_TOOLTIP';
	content: string;
	position?: 'left' | 'right' | 'top' | 'bottom';
	backgroundColor?: string;
	textColor?: string;
	animateCharacters?: boolean;
	duration?: number; // If set, automatically complete after this duration
}

// Idle guidance
export interface IdleGuidance extends BaseGuidance {
	type: 'IDLE';
	duration?: number; // Duration in milliseconds
	advanceFunction?: (nextGuidance: (guidanceId?: string) => void) => void; // Function to call with nextGuidance as parameter
}

// Dialogue guidance
export interface DialogueGuidance extends BaseGuidance {
	type: 'DIALOGUE';
	text: string;
	style?: React.CSSProperties;
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextGuidance: () => void) => void);
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	highlightElements?:
		| PositionOrElement[]
		| { _lazy: true; resolve: () => PositionOrElement[] }; // Optional array of elements to highlight or a lazy resolver
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
}

// Dialogue banner guidance (banner without overlays)
export interface DialogueBannerGuidance extends BaseGuidance {
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
		| ((nextGuidance: () => void) => void);
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

// Survey guidance
export interface SurveyGuidance extends BaseGuidance {
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

// Execute click guidance (performs an actual DOM click)
export interface ExecuteClickGuidance extends BaseGuidance {
	type: 'EXECUTE_CLICK';
	target: PositionOrElement; // Element to physically click
	startPosition?: PositionOrElement; // Optional starting position for animation
	tooltipText?: string;
	tooltipPosition?: 'left' | 'right' | 'top' | 'bottom';
	blocking?: boolean;
	shouldScroll?: boolean; // When false, disables automatic scrolling to elements that are outside viewport
	showCursor?: boolean; // When true, shows virtual cursor animation before clicking (default: true)
}

// Execute typing guidance
export interface ExecuteTypingGuidance extends BaseGuidance {
	type: 'EXECUTE_TYPING';
	endPosition: PositionOrElement; // Element to type into
	expectedValue: string; // The expected value to type
}

// Toast guidance
export interface ToastGuidance extends BaseGuidance {
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

// IF guidance - conditionally shows one of two guidances based on a condition
export interface IFGuidance extends BaseGuidance {
	type: 'IF';
	condition: boolean | (() => boolean) | (() => Promise<boolean>); // Condition to check - function (sync or async) or boolean
	trueGuidance: GuidanceInput; // Guidance to show if condition is true
	falseGuidance: GuidanceInput; // Guidance to show if condition is false
	advanceCondition?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextGuidance: () => void) => void); // Controls how the guidance advances to the next one
}

// GATE_IF guidance - conditionally adds a set of guidances to the queue based on a one-time condition check
export interface GateIfGuidance extends BaseGuidance {
	type: 'GATE_IF';
	condition: boolean | (() => boolean) | (() => Promise<boolean>); // Condition to check - function (sync or async) or boolean
	trueGuidances: GuidanceInput[]; // Guidances to add if condition is true
	falseGuidances: GuidanceInput[]; // Guidances to add if condition is false
}

// Navigation guidance
export interface NavigateGuidance extends BaseGuidance {
	type: 'NAVIGATE';
	url: string; // URL to navigate to
}

// Right click indicator guidance
export interface RightClickGuidance extends BaseGuidance {
	type: 'RIGHT_CLICK';
	duration?: number; // optional auto-dismiss after duration ms
}

// Union type of all possible guidances
export type Guidance =
	| CursorTakeoverGuidance
	| VirtualClickGuidance
	| VirtualDragGuidance
	| ChatGuidance
	| ChatTooltipGuidance
	| IdleGuidance
	| MultiVirtualClickGuidance
	| VirtualTypingGuidance
	| DialogueGuidance
	| SurveyGuidance
	| ExecuteClickGuidance
	| ExecuteTypingGuidance
	| ToastGuidance
	| IFGuidance
	| GateIfGuidance
	| NavigateGuidance
	| RightClickGuidance
	| DialogueBannerGuidance;

// Default guidance styling
const DEFAULT_GUIDANCE_STYLING: GuidanceStylingConfig = {
	tooltipStyle: 'lined',
	tooltipSize: 'sm',
};

// Type alias for guidances with optional IDs
export type MakeIdOptional<T> = T extends BaseGuidance
	? Omit<T, 'id'> & { id?: string }
	: never;
export type GuidanceInput = MakeIdOptional<Guidance>;

export interface GuidanceSlice {
	queue: Guidance[];
	currentGuidance: Guidance | null;
	isActive: boolean;
	prevCursorPosition: { x: number; y: number } | null;
	onQueueComplete: (() => void) | null;
	isAnimatingOut: boolean;
	guidanceLogId: string;
	guidanceSessionId: string;
	guidanceStyling: GuidanceStylingConfig;

	// Guidances
	addGuidance: (guidance: GuidanceInput, guidanceConfigId?: string) => void;
	addGuidances: (guidances: GuidanceInput[], guidanceConfigId?: string) => void;
	removeGuidance: (id: string) => void;
	replaceGuidances: (
		guidances: GuidanceInput[],
		guidanceConfigId?: string
	) => void;
	clearQueue: () => void;
	nextGuidance: (guidanceId?: string) => void;
	setIsActive: (active: boolean) => void;
	setPrevCursorPosition: (position: { x: number; y: number } | null) => void;
	setOnQueueComplete: (callback: (() => void) | null) => void;
	setIsAnimatingOut: (animating: boolean) => void;
	addGuidancesToStart: (guidances: GuidanceInput[] | GuidanceInput) => void;
	setGuidanceSessionId: (sessionId: string) => void;
	setCurrentGuidance: (guidance: Guidance | null) => void;

	// Guidance styling actions
	setGuidanceStyling: (styling: Partial<GuidanceStylingConfig>) => void;
	getGuidanceTextColor: (baseColor: string) => string;
}

// Create the slice
export const createGuidanceSlice: StateCreator<
	CedarStore,
	[],
	[],
	GuidanceSlice
> = (set, get) => ({
	// Default state
	queue: [],
	currentGuidance: null,
	isActive: true,
	prevCursorPosition: null,
	onQueueComplete: null,
	isAnimatingOut: false,
	guidanceLogId: '',
	guidanceSessionId: '',
	guidanceStyling: DEFAULT_GUIDANCE_STYLING,

	// Guidances
	setCurrentGuidance: (guidance) => set({ currentGuidance: guidance }),
	addGuidance: async (guidance: GuidanceInput) => {
		// Generate UUID if id is not provided
		const guidanceWithId = {
			...guidance,
			id: guidance.id || uuidv4(),
		} as Guidance;

		const state = get();

		if (!state.currentGuidance && state.queue.length === 0) {
			set({
				queue: [guidanceWithId],
			});
			requestAnimationFrame(() => get().nextGuidance());
		} else {
			set((state: CedarStore) => ({
				queue: [...state.queue, guidanceWithId],
			}));
		}
	},

	addGuidances: async (guidances: GuidanceInput[]) => {
		// Generate UUIDs for guidances without ids
		const guidancesWithIds = guidances.map((guidance) => ({
			...guidance,
			id: guidance.id || uuidv4(),
		})) as Guidance[];

		if (guidancesWithIds.length === 0) return;

		const state = get();

		if (!state.currentGuidance && state.queue.length === 0) {
			set({
				queue: guidancesWithIds,
			});
			requestAnimationFrame(() => get().nextGuidance());
		} else {
			set((state: CedarStore) => ({
				queue: [...state.queue, ...guidancesWithIds],
			}));
		}
	},

	replaceGuidances: async (guidances: GuidanceInput[]) => {
		// Generate UUIDs for guidances without ids
		const guidancesWithIds = guidances.map((guidance) => ({
			...guidance,
			id: guidance.id || uuidv4(),
		})) as Guidance[];

		// Replace the queue with new guidances
		set({
			queue: guidancesWithIds,
		});

		requestAnimationFrame(() => get().nextGuidance());
	},

	removeGuidance: (id: string) => {
		set((state: CedarStore) => {
			// Check if we're removing the current guidance
			if (state.currentGuidance?.id === id) {
				const newCurrentGuidance =
					state.queue.length > 0 ? state.queue[0] : null;
				const newQueue = state.queue.length > 0 ? state.queue.slice(1) : [];

				return {
					currentGuidance: newCurrentGuidance,
					queue: newQueue,
				};
			} else {
				// Otherwise just filter the queue
				const newQueue = state.queue.filter(
					(guidance: Guidance) => guidance.id !== id
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
			currentGuidance: null,
		});
	},

	nextGuidance: async (guidanceId?: string) => {
		const state = get();
		// Only validate the guidanceId if one is provided
		if (
			guidanceId &&
			state.currentGuidance &&
			guidanceId !== state.currentGuidance.id
		) {
			return;
		}

		// Execute onEnd callback of current guidance if it exists
		if (state.currentGuidance?.onEnd) {
			try {
				state.currentGuidance.onEnd();
			} catch (error) {
				console.error('Error in onEnd callback:', error);
			}
		}

		// Get the next guidance from the queue
		const nextGuidanceInQueue = state.queue[0];

		// Handle navigation guidance
		if (nextGuidanceInQueue?.type === 'NAVIGATE') {
			const navigateGuidance = nextGuidanceInQueue as NavigateGuidance;
			window.open(navigateGuidance.url, '_blank');

			set((state: CedarStore) => {
				// Atomic check: only update if current guidance still matches guidanceId
				if (
					guidanceId &&
					(!state.currentGuidance || state.currentGuidance.id !== guidanceId)
				) {
					return state; // No changes
				}
				const newQueue = state.queue.slice(1);
				return {
					queue: newQueue,
					currentGuidance: null,
				};
			});
			return;
		}

		// Special handling for function-based advance modes
		if (
			(nextGuidanceInQueue?.type === 'VIRTUAL_CLICK' ||
				nextGuidanceInQueue?.type === 'VIRTUAL_DRAG' ||
				nextGuidanceInQueue?.type === 'DIALOGUE') &&
			typeof nextGuidanceInQueue?.advanceMode === 'function'
		) {
			// Call the function to check if we should advance
			// For DIALOGUE type with function advanceMode, the DialogueBox component will handle it
			// The function should return a boolean (true=advance, false=don't advance)
			if ((nextGuidanceInQueue.advanceMode as () => boolean)()) {
				set((state: CedarStore) => {
					// Atomic check: only update if current guidance still matches guidanceId
					if (
						guidanceId &&
						(!state.currentGuidance || state.currentGuidance.id !== guidanceId)
					) {
						return state; // No changes
					}
					const newQueue = state.queue.slice(1);
					return {
						queue: newQueue,
						currentGuidance: null,
					};
				});

				requestAnimationFrame(() => get().nextGuidance()); // Use requestAnimationFrame instead of a 1ms timeout
				return;
			}
		}

		// Store position if current guidance is a cursor click or virtual drag
		if (
			state.currentGuidance?.type === 'VIRTUAL_CLICK' ||
			state.currentGuidance?.type === 'VIRTUAL_DRAG' ||
			state.currentGuidance?.type === 'VIRTUAL_TYPING'
		) {
			try {
				// Convert to Position object if it's an HTML element
				const endPosition = getPositionFromElement(
					state.currentGuidance.endPosition
				);

				// Only update if we successfully got a position
				if (
					endPosition &&
					typeof endPosition.x === 'number' &&
					typeof endPosition.y === 'number'
				) {
					set({ prevCursorPosition: endPosition });
				}

				// If next guidance is also VIRTUAL_CLICK/DRAG/TYPING, update normally without fadeout
				if (
					nextGuidanceInQueue &&
					(nextGuidanceInQueue.type === 'VIRTUAL_CLICK' ||
						nextGuidanceInQueue.type === 'VIRTUAL_DRAG' ||
						nextGuidanceInQueue.type === 'VIRTUAL_TYPING') &&
					!nextGuidanceInQueue.startPosition
				) {
					set((state: CedarStore) => {
						// Atomic check: only update if current guidance still matches guidanceId
						if (
							guidanceId &&
							(!state.currentGuidance ||
								state.currentGuidance.id !== guidanceId)
						) {
							return state; // No changes
						}
						const [newCurrentGuidance, ...newQueue] = state.queue;
						return {
							currentGuidance: newCurrentGuidance,
							queue: newQueue,
						};
					});
				} else {
					// Start fadeout animation
					set({ isAnimatingOut: true });

					// Wait for animation to complete before updating the queue
					setTimeout(() => {
						set((state: CedarStore) => {
							// Atomic check: only update if current guidance still matches guidanceId
							if (
								guidanceId &&
								(!state.currentGuidance ||
									state.currentGuidance.id !== guidanceId)
							) {
								return state; // No changes
							}
							const [newCurrentGuidance, ...newQueue] = state.queue;
							if (state.queue.length > 0) {
								return {
									currentGuidance: newCurrentGuidance,
									queue: newQueue,
									isAnimatingOut: false,
								};
							} else {
								return {
									currentGuidance: null,
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
			// Regular handling for other guidance types
			set((state: CedarStore) => {
				// Atomic check: only update if current guidance still matches guidanceId
				if (
					guidanceId &&
					(!state.currentGuidance || state.currentGuidance.id !== guidanceId)
				) {
					return state; // No changes
				}
				if (state.queue.length > 0) {
					const [newCurrentGuidance, ...newQueue] = state.queue;
					return {
						currentGuidance: newCurrentGuidance,
						queue: newQueue,
					};
				} else {
					return {
						currentGuidance: null,
					};
				}
			});
		}

		// Check if this was the last guidance
		if (state.queue.length === 0) {
			set((state: CedarStore) => {
				// Atomic check: only update if current guidance still matches guidanceId
				if (
					guidanceId &&
					(!state.currentGuidance || state.currentGuidance.id !== guidanceId)
				) {
					return { isAnimatingOut: false };
				}
				return {
					isAnimatingOut: false,
					currentGuidance: null,
					queue: [],
				};
			});

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

	addGuidancesToStart: (guidances: GuidanceInput[] | GuidanceInput) => {
		const state = get();

		// Convert single guidance input to array if necessary
		const guidancesToAdd = Array.isArray(guidances) ? guidances : [guidances];

		// Generate UUIDs for guidances without ids
		const guidancesWithIds = guidancesToAdd.map((guidance) => ({
			...guidance,
			id: guidance.id || uuidv4(),
		})) as Guidance[];

		// Add the guidances to the start of the queue
		set({
			queue: [...guidancesWithIds, ...state.queue],
		});
		requestAnimationFrame(() => get().nextGuidance());
	},

	setGuidanceSessionId: (sessionId: string) =>
		set({ guidanceSessionId: sessionId }),

	// Guidance styling actions
	setGuidanceStyling: (newStyling) =>
		set((state) => ({
			guidanceStyling: { ...state.guidanceStyling, ...newStyling },
		})),

	getGuidanceTextColor: (baseColor: string) => {
		const state = get();
		return state.guidanceStyling.textColor || getShadedColor(baseColor, 80);
	},
});

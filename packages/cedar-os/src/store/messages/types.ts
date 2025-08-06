import { CedarStore } from '@/store/types';
import type { ReactNode } from 'react';

export interface ChatResponse {
	messages: Message[];
}

// Base properties that all messages share
export interface BaseMessage {
	id: string;
	role: MessageRole;
	content: string;
	createdAt?: string;
	metadata?: Record<string, unknown>;
	type: string;
}

// Helper for creating typed messages
export type TypedMessage<
	T extends string,
	P extends object = object
> = BaseMessage & {
	type: T;
} & P;

// Message types
export type MessageRole = 'bot' | 'user' | 'assistant';

// Type for input messages where ID is optional - will be auto-generated if not provided
export type MessageInput =
	| (Omit<TextMessage, 'id'> & { id?: string })
	| (Omit<StorylineMessage, 'id'> & { id?: string })
	| (Omit<MultipleChoiceMessage, 'id'> & { id?: string })
	| (Omit<TodoListMessage, 'id'> & { id?: string })
	| (Omit<DialogueOptionsMessage, 'id'> & { id?: string })
	| (Omit<TickerMessage, 'id'> & { id?: string })
	| (Omit<SliderMessage, 'id'> & { id?: string })
	| (Omit<ActionMessage, 'id'> & { id?: string })
	| (Omit<CustomMessage<string, Record<string, unknown>>, 'id'> & {
			id?: string;
	  });

// Default Cedar message types as a union
export type DefaultMessage =
	| TextMessage
	| TodoListMessage
	| TickerMessage
	| DialogueOptionsMessage
	| MultipleChoiceMessage
	| StorylineMessage
	| SliderMessage
	| ActionMessage
	| StageUpdateMessage
	| CustomMessage<string, Record<string, unknown>>;

// Type helper to extract a specific message by type
export type MessageByType<T extends string, M = DefaultMessage> = Extract<
	M,
	{ type: T }
>;

// Keep the old Message type for backwards compatibility
export type Message =
	| DefaultMessage
	| CustomMessage<string, Record<string, unknown>>;

// Message that contains text content
export type TextMessage = BaseMessage & {
	type: 'text';
};

// Action message (default)
export type ActionMessage = BaseMessage & {
	type: 'action';
	stateKey?: string;
	setterKey?: string;
	args?: unknown[];
};

/**
 * Helper type to build a strongly-typed ActionMessage for a particular
 * state + setter combination.
 *
 * @example
 * type AddNodeMessage = ActionMessageFor<'roadmap', 'addNode', [NewNode]>;
 */
export type ActionMessageFor<
	StateKey extends string,
	SetterKey extends string,
	Args extends unknown[] = []
> = BaseMessage & {
	type: 'action';
	stateKey: StateKey;
	setterKey: SetterKey;
	args: Args;
};

export type StorylineMessage = BaseMessage & {
	type: 'storyline';
	sections: StorylineSection[];
};

export type StorylineSection =
	| {
			type: 'storyline_section';
			title: string;
			icon?: string;
			description: string;
	  }
	| string;

// Insert new message types
export interface TodoListItem {
	text: string;
	done: boolean;
	description?: string;
}

export interface TodoListMessage extends BaseMessage {
	type: 'todolist';
	items: TodoListItem[];
}

export interface MultipleChoiceMessage extends BaseMessage {
	type: 'multiple_choice';
	choices: string[];
	allowFreeInput?: boolean;
	multiselect?: boolean;
	/** Optional callback when a choice is selected */
	onChoice?: (choice: string, store: CedarStore) => void;
}

// Button type for ticker
export interface TickerButton {
	title: string;
	description: string;
	icon?: ReactNode;
	colour?: string;
}

/** Message type for ticker display */
export interface TickerMessage extends BaseMessage {
	type: 'ticker';
	// Buttons to display in the ticker
	buttons: TickerButton[];
	/** Optional callback when Next is clicked */
	onChoice?: (store: CedarStore) => void;
}

// Add dialogue options message type
export interface DialogueOptionChoice {
	title: string;
	description?: string;
	icon?: ReactNode;
	hoverText?: string;
}

export interface DialogueOptionsMessage extends BaseMessage {
	type: 'dialogue_options';
	options: DialogueOptionChoice[];
	allowFreeInput?: boolean;
	/** Optional callback when an option is selected */
	onChoice?: (choice: DialogueOptionChoice | string, store: CedarStore) => void;
}

// Slider message type for slider input
export interface SliderMessage extends BaseMessage {
	type: 'slider';
	min: number;
	max: number;
	onChange?: (value: number, store: CedarStore) => void;
}

export type StageUpdateStatus =
	| 'in_progress'
	| 'complete'
	| 'error'
	| 'thinking';

export interface StageUpdateMessage extends BaseMessage {
	type: 'stage_update';
	status: StageUpdateStatus;
	message: string;
}

// Export a type helper for creating custom message types
export type CustomMessage<
	T extends string,
	P extends Record<string, unknown> = Record<string, never>
> = BaseMessage & { type: T } & P & Record<string, unknown>;

// ============================================================================
// MESSAGE PROCESSOR SYSTEM - Unified handler/renderer system
// ============================================================================

// Message processor function types
export type MessageProcessorExecute<T extends Message = Message> = (
	obj: T,
	store: CedarStore
) => void | Promise<void>;
export type MessageProcessorRender<T extends Message = Message> =
	React.ComponentType<{ message: T }>;

/**
 * Unified Message Processor - combines handler and renderer functionality
 * Can execute business logic, provide custom rendering, or both
 */
export interface MessageProcessor<T extends Message = Message> {
	type: string;
	namespace?: string; // For handling type conflicts
	priority?: number; // Higher numbers = higher priority (default: 0)

	// Optional: Execute business logic
	execute?: MessageProcessorExecute<T>;

	// Optional: Provide custom rendering
	render?: MessageProcessorRender<T>;

	// Optional: Validation
	validate?: (obj: Message) => obj is T;
}

/**
 * Entry stored in the processor registry at runtime
 */
export interface MessageProcessorEntry<T extends Message = Message> {
	type: string;
	namespace?: string;
	priority: number; // Always has a value (defaults applied)
	execute?: MessageProcessorExecute<T>;
	render?: MessageProcessorRender<T>;
	validate?: (obj: Message) => obj is T;
}

// Registry for message processors - supports multiple processors per type
export type MessageProcessorRegistry = Record<string, MessageProcessorEntry[]>;

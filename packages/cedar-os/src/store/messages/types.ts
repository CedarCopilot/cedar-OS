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
	| (Omit<ActionMessage, 'id'> & { id?: string })
	| (Omit<StorylineMessage, 'id'> & { id?: string })
	| (Omit<MultipleChoiceMessage, 'id'> & { id?: string })
	| (Omit<TodoListMessage, 'id'> & { id?: string })
	| (Omit<DialogueOptionsMessage, 'id'> & { id?: string })
	| (Omit<TickerMessage, 'id'> & { id?: string })
	| (Omit<SliderMessage, 'id'> & { id?: string })
	| (Omit<StageUpdateMessage, 'id'> & { id?: string });

// Default Cedar message types as a union
export type DefaultMessage =
	| TextMessage
	| TodoListMessage
	| TickerMessage
	| DialogueOptionsMessage
	| MultipleChoiceMessage
	| StorylineMessage
	| SliderMessage
	| StageUpdateMessage
	| ActionMessage;

// Type helper to extract a specific message by type
export type MessageByType<T extends string, M = DefaultMessage> = Extract<
	M,
	{ type: T }
>;

// Keep the old Message type for backwards compatibility
export type Message = DefaultMessage;

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
> = BaseMessage & { type: T } & P;

// Message handler type – processes structured objects and may add messages
export type MessageHandler<
	O extends Record<string, unknown> = Record<string, unknown>
> = (obj: O, store: CedarStore) => boolean;

/**
 * Configuration object used when registering a message handler – mirrors
 * MessageRendererConfig but swaps `renderer` for `handler`.
 */
export interface MessageHandlerConfig<
	O extends Record<string, unknown> = Record<string, unknown>
> {
	type: string;
	handler: MessageHandler<O>;
	priority?: number;
	validateMessage?: (obj: Record<string, unknown>) => obj is O;
}

/**
 * Entry stored in the registry at runtime – mirrors MessageRendererEntry but
 * contains a `handler` function instead of a `renderer`.
 */
export interface MessageHandlerEntry<
	O extends Record<string, unknown> = Record<string, unknown>
> {
	type: string;
	handler: MessageHandler;
	priority?: number;
	validateMessage?: (obj: Record<string, unknown>) => obj is O;
}

// Message renderer function type
export type MessageRenderer = (message: BaseMessage) => ReactNode;

// Message renderer configuration used when **registering** via hook
export interface MessageRendererConfig<T extends BaseMessage = BaseMessage> {
	type: T['type'];
	renderer: React.ComponentType<{ message: T }>;
	priority?: number;
	validateMessage?: (message: BaseMessage) => message is T;
}

// Entry stored in the registry at runtime (after wrapping) – includes resolved renderer function
export interface MessageRendererEntry<T extends BaseMessage = BaseMessage> {
	type: T['type'];
	renderer: MessageRenderer; // function (message) => ReactNode
	priority?: number;
	validateMessage?: (message: BaseMessage) => message is T;
}

// Registry for message renderers
export type MessageRendererRegistry = Record<string, MessageRendererEntry>;

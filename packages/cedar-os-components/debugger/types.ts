// Shared types for debugger components
import type { registeredState } from 'cedar-os';

export interface DebugLogEntry {
	id: string;
	timestamp: Date;
	type:
		| 'request'
		| 'response'
		| 'error'
		| 'stream-complete'
		| 'stream-error'
		| 'handler';
	provider?: string;
	apiRoute?: string;
	processorName?: string; // Name of the response processor that handled this
	data: {
		params?: Record<string, unknown>;
		response?: Record<string, unknown>;
		error?: Error;
		streamContent?: string;
		streamObjects?: object[];
		completedItems?: (string | object)[];
		handledObject?: Record<string, unknown>; // For handler logs
		handlers?: Array<{
			processorName: string;
			handledObject: Record<string, unknown>;
		}>; // For tracking handlers within a request/stream
	};
	duration?: number;
}

export interface Message {
	id: string;
	role: 'user' | 'assistant' | 'bot';
	type: string;
	content?: string;
	timestamp?: string;
	createdAt?: string;
	threadId?: string;
	[key: string]: unknown;
}

export interface Badge {
	label: string;
	color: 'gray' | 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'amber';
}

export interface CollapsibleSectionProps {
	id: string;
	title: string;
	isExpanded: boolean;
	onToggle: () => void;
	badges: Badge[];
	children: React.ReactNode;
}

export interface TabProps {
	onCopy: (text: string, id: string) => void;
	copiedId: string | null;
}

export interface NetworkTabProps extends TabProps {
	logs: DebugLogEntry[];
}

export interface MessagesTabProps extends TabProps {
	messages: Message[];
}

export interface StatesTabProps extends TabProps {
	states: Record<string, registeredState>;
}

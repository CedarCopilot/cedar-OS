import type { ReactNode } from 'react';

/**
 * Represents an entry in the additional context
 */
export interface ContextEntry {
	id: string;
	source: 'mention' | 'subscription' | 'manual';
	data: unknown;
	metadata?: {
		label?: string;
		icon?: ReactNode;
		color?: string; // Hex color
		/** Whether this entry should be shown in the chat UI (ContextBadgeRow). Defaults to true */
		showInChat?: boolean;
		order?: number; // Order for display (lower numbers appear first)
		[key: string]: unknown;
	};
}

/**
 * Additional context structure
 */
export interface AdditionalContext {
	[key: string]: ContextEntry[];
}

/**
 * Represents an item in the mention list
 */
export interface MentionItem {
	id: string | null;
	label?: string | null;
	data?: unknown;
	metadata?: {
		icon?: ReactNode;
		color?: string; // Hex color
		/** Whether this mention item should be shown as a badge after insertion (default true) */
		showInChat?: boolean;
		[key: string]: unknown;
	};
	providerId?: string; // Internal use only
}

/**
 * Interface for mention providers
 */
export interface MentionProvider {
	id: string;
	trigger: string;
	label?: string;
	description?: string;
	color?: string;
	icon?: ReactNode;
	getItems: (query: string) => MentionItem[] | Promise<MentionItem[]>;
	toContextEntry: (item: MentionItem) => ContextEntry;
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (
		item: MentionItem,
		attrs: Record<string, any>
	) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

/**
 * Configuration for state-based mention providers
 */
export interface StateBasedMentionProviderConfig {
	stateKey: string;
	trigger?: string;
	labelField?: string | ((item: any) => string);
	searchFields?: string[];
	description?: string;
	icon?: ReactNode;
	color?: string; // Hex color
	order?: number; // Order for display (lower numbers appear first)
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (
		item: MentionItem,
		attrs: Record<string, any>
	) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

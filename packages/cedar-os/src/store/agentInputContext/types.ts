import type { ReactNode } from 'react';

/**
 * Represents an entry in the additional context
 */
export interface ContextEntry {
	id: string;
	source: 'mention' | 'subscription' | 'manual';
	data: any;
	metadata?: {
		label?: string;
		icon?: ReactNode;
		color?: string; // Hex color
		[key: string]: any;
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
	id: string;
	label: string;
	data?: any;
	metadata?: {
		icon?: ReactNode;
		color?: string; // Hex color
		[key: string]: any;
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
	renderEditorItem?: (item: MentionItem, attrs: any) => ReactNode;
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
	renderMenuItem?: (item: MentionItem) => ReactNode;
	renderEditorItem?: (item: MentionItem, attrs: any) => ReactNode;
	renderContextBadge?: (entry: ContextEntry) => ReactNode;
}

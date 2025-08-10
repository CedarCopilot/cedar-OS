'use client';

import type { StorageConfig, DefaultMessage, Message } from 'cedar-os';

// --------------------
// Types & helpers
// --------------------

type MastraUIPart = { type: string; text?: string };

interface MastraBackendMessage {
	id: string;
	role: 'user' | 'assistant' | 'system' | string;
	content: {
		format: number;
		parts: MastraUIPart[];
		content?: string;
	};
	createdAt: string | Date;
	threadId?: string;
	resourceId?: string;
}

export const transformMastraMessages = (
	backend: MastraBackendMessage[]
): DefaultMessage[] => {
	const output: DefaultMessage[] = [];

	backend.forEach((msg) => {
		const role: 'user' | 'assistant' | 'bot' =
			msg.role === 'assistant'
				? 'assistant'
				: (msg.role as 'user' | 'bot' | 'assistant');

		// Extract text content (plain or JSON string)
		const textPart = msg.content?.parts?.find(
			(p): p is MastraUIPart & { text: string } => p.type === 'text'
		);
		const rawText = msg.content?.content || textPart?.text;

		let parsed: unknown;
		if (rawText) {
			try {
				parsed = JSON.parse(rawText);
			} catch {
				/* ignore parse errors – treat as plain text later */
			}
		}

		const baseMetadata = {
			threadId: msg.threadId,
			resourceId: msg.resourceId,
			parts: msg.content?.parts as MastraUIPart[],
			format: msg.content?.format,
		};

		if (parsed && typeof parsed === 'object' && parsed !== null) {
			const parsedObj = parsed as Record<string, unknown>;

			// 1. content -> simple text message
			if (typeof parsedObj.content === 'string') {
				output.push({
					id: `${msg.id}-content`,
					role,
					content: parsedObj.content,
					createdAt: new Date(msg.createdAt).toISOString(),
					type: 'text',
					metadata: baseMetadata,
				});
			}

			// 2. object -> assume already a Cedar message
			if (parsedObj.object && typeof parsedObj.object === 'object') {
				const objMsg = parsedObj.object as DefaultMessage;
				const finalObj: DefaultMessage = { ...objMsg };
				if (!finalObj.id) finalObj.id = `${msg.id}-object`;
				if (!finalObj.role) finalObj.role = role;
				if (!finalObj.createdAt)
					finalObj.createdAt = new Date(msg.createdAt).toISOString();
				output.push(finalObj);
			}

			// 3. action -> surface as descriptive text
			if (parsedObj.action && typeof parsedObj.action === 'object') {
				const actionObj = parsedObj.action as Record<string, unknown>;
				const actionContent = `Action: ${JSON.stringify(actionObj)}`;
				output.push({
					id: `${msg.id}-action`,
					role,
					content: actionContent,
					createdAt: new Date(msg.createdAt).toISOString(),
					type: 'text',
					metadata: { ...baseMetadata, action: actionObj },
				});
			}
		} else {
			// fallback plain text
			output.push({
				id: msg.id,
				role,
				content: rawText ?? 'No content',
				createdAt: new Date(msg.createdAt).toISOString(),
				type: 'text',
				metadata: baseMetadata,
			});
		}
	});

	return output;
};

// --------------------
// Adapters
// --------------------

// No storage adapter
export const noStorageAdapter: StorageConfig = {
	type: 'none',
};

export const localStorageAdapter: StorageConfig = {
	type: 'local',
	options: {
		key: 'product-roadmap',
	},
};

export const customStorageAdapter: StorageConfig = {
	type: 'custom',
	adapter: {
		listThreads: async (userId?: string | null) => {
			console.log('listThreads - fetching threads for user', userId);
			try {
				const res = await fetch(
					`http://localhost:4111/threads?userId=${userId ?? ''}`
				);
				if (!res.ok) throw new Error('Failed to fetch threads');
				return (await res.json()) as [];
			} catch (err) {
				console.error('Error fetching threads:', err);
				return [];
			}
		},
		loadMessages: async (
			_userId: string | null | undefined,
			threadId: string
		) => {
			try {
				const res = await fetch(`http://localhost:4111/threads/${threadId}`);
				if (!res.ok) throw new Error('Failed to fetch messages');
				const raw = await res.json();
				const transformed = transformMastraMessages(
					Array.isArray(raw) ? raw : [raw]
				);
				return transformed as Message[];
			} catch (err) {
				console.error('Error fetching thread messages:', err);
				return [];
			}
		},
		persistMessage: async (
			_userId: string | null | undefined,
			threadId: string,
			message: Message
		) => {
			console.log(
				'persistMessage - not implemented, received:',
				threadId,
				message
			);
			return message;
		},
	},
};

import { StateCreator } from 'zustand';
import type {
	BaseMessage,
	DefaultMessage,
	MessageByType,
	MessageRenderer,
	MessageRole,
} from './types';

/**
 * Type Safety Note:
 *
 * This slice uses type assertions (as unknown as X) in several places. This is
 * intentional and necessary due to TypeScript's limitations with generic constraints
 * and conditional types.
 *
 * The issue: When you have a generic type M that extends BaseMessage (a union of
 * message types), and you try to extract a specific type using MessageByType<T, M>,
 * TypeScript cannot prove that this extracted type is assignable back to M.
 *
 * This is because M could theoretically be instantiated with a different subtype
 * of BaseMessage than what we're working with. Even though we know at runtime
 * that our message types are part of the union M, TypeScript's type system
 * cannot make this guarantee at compile time.
 *
 * The type assertions are safe because:
 * 1. We control the message creation and ensure type consistency
 * 2. The type parameter T is constrained to M['type']
 * 3. The MessageByType helper correctly extracts the matching type from the union
 *
 * Alternative approaches like using function overloads or removing the generic
 * constraints would sacrifice the type inference benefits that make this API
 * ergonomic to use.
 */

// Typed messages slice interface
export interface TypedMessagesSlice<M extends BaseMessage = DefaultMessage> {
	// State
	messages: M[];
	isProcessing: boolean;
	showChat: boolean;

	// Message renderer registry
	messageRenderers: Map<string, MessageRenderer<any>>;

	// Fully typed actions
	addMessage: <T extends M['type']>(
		message: Omit<MessageByType<T, M>, 'id'> & { type: T }
	) => MessageByType<T, M>;

	addMessages: (messages: Array<Omit<M, 'id'>>) => M[];

	updateMessage: <T extends M['type']>(
		id: string,
		updates: Partial<MessageByType<T, M>>
	) => void;

	deleteMessage: (id: string) => void;
	clearMessages: () => void;
	setIsProcessing: (isProcessing: boolean) => void;
	setShowChat: (showChat: boolean) => void;
	setMessages: (messages: M[]) => void;

	// Renderer management
	registerMessageRenderer: <T extends M['type']>(
		config: MessageRenderer<MessageByType<T, M>>
	) => void;

	unregisterMessageRenderer: (type: string) => void;
	getMessageRenderer: (type: string) => MessageRenderer | undefined;

	// Utility methods
	getMessageById: (id: string) => M | undefined;
	getMessagesByRole: (role: MessageRole) => M[];
}

// Generic typed message slice creator
export function createTypedMessagesSlice<
	M extends BaseMessage = DefaultMessage
>(): StateCreator<TypedMessagesSlice<M>, [], [], TypedMessagesSlice<M>> {
	return (set, get) => ({
		messages: [],
		isProcessing: false,
		showChat: false,
		messageRenderers: new Map(),

		setMessages: (messages: M[]) => set({ messages }),

		setShowChat: (showChat: boolean) => set({ showChat }),

		addMessage: <T extends M['type']>(
			messageData: Omit<MessageByType<T, M>, 'id'> & { type: T }
		): MessageByType<T, M> => {
			const id = `message-${Date.now()}-${Math.random()
				.toString(36)
				.substring(2, 9)}`;
			const createdAt = new Date().toISOString();

			// Create the full message
			const newMessage = {
				...messageData,
				id,
				createdAt,
			};

			set((state: TypedMessagesSlice<M>) => ({
				// TypeScript can't prove that MessageByType<T, M> is assignable to M
				// because M could be instantiated with a different subtype. This is safe
				// because we know the message types are part of the union M.
				messages: [...state.messages, newMessage as unknown as M],
			}));

			// Return with type assertion - safe because input type matches output type
			return newMessage as unknown as MessageByType<T, M>;
		},

		addMessages: (messagesData: Array<Omit<M, 'id'>>) => {
			const newMessages = messagesData.map((messageData) => {
				const id = `message-${Date.now()}-${Math.random()
					.toString(36)
					.substring(2, 9)}`;
				const createdAt = new Date().toISOString();

				return {
					...messageData,
					id,
					createdAt,
				} as M;
			});

			set((state: TypedMessagesSlice<M>) => ({
				messages: [...state.messages, ...newMessages],
			}));

			return newMessages;
		},

		updateMessage: <T extends M['type']>(
			id: string,
			updates: Partial<MessageByType<T, M>>
		) => {
			set((state: TypedMessagesSlice<M>) => ({
				messages: state.messages.map((msg) =>
					msg.id === id ? ({ ...msg, ...updates } as M) : msg
				),
			}));
		},

		deleteMessage: (id: string) => {
			set((state: TypedMessagesSlice<M>) => ({
				messages: state.messages.filter((msg) => msg.id !== id),
			}));
		},

		clearMessages: () => set({ messages: [] }),

		setIsProcessing: (isProcessing: boolean) => set({ isProcessing }),

		// Renderer management
		registerMessageRenderer: <T extends M['type']>(
			config: MessageRenderer<MessageByType<T, M>>
		) => {
			set((state: TypedMessagesSlice<M>) => {
				const newRenderers = new Map(state.messageRenderers);
				newRenderers.set(config.type, config);
				return { messageRenderers: newRenderers };
			});
		},

		unregisterMessageRenderer: (type: string) => {
			set((state: TypedMessagesSlice<M>) => {
				const newRenderers = new Map(state.messageRenderers);
				newRenderers.delete(type);
				return { messageRenderers: newRenderers };
			});
		},

		getMessageRenderer: (type: string) => {
			return get().messageRenderers.get(type);
		},

		// Utility methods
		getMessageById: (id: string) => {
			return get().messages.find((msg: M) => msg.id === id);
		},

		getMessagesByRole: (role: MessageRole) => {
			return get().messages.filter((msg: M) => msg.role === role);
		},
	});
}

import { MessageRenderer } from '@/store/messages/types';
import { Message } from '@/store/messages/types';

export function createMessageRenderer<T extends Message>(
	p: MessageRenderer<T>
): MessageRenderer<Message> {
	// cast-through-unknown to bypass the contravariance error
	return p as unknown as MessageRenderer<Message>;
}

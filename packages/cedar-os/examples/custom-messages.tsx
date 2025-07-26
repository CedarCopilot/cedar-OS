import { ChatBubbles } from '@/components/chatMessages/ChatBubbles';
import { useMessageRenderer } from '@/hooks/useMessageRenderer';
import {
	createCedarStore,
	createTypedMessagesSlice,
	DefaultMessage,
	MessageByType,
	TypedMessage,
} from '@/store/CedarStore';
import React from 'react';

// Step 1: Define custom message types
type CustomMessages =
	| DefaultMessage // Include all default message types
	| TypedMessage<
			'image',
			{
				imageUrl: string;
				alt?: string;
				width?: number;
				height?: number;
			}
	  >
	| TypedMessage<
			'chart',
			{
				chartType: 'line' | 'bar' | 'pie';
				data: any[];
				options?: any;
			}
	  >
	| TypedMessage<
			'code',
			{
				language: string;
				code: string;
				filename?: string;
				highlightLines?: number[];
			}
	  >;

// Step 2: Create a typed messages slice
const customMessagesSlice = createTypedMessagesSlice<CustomMessages>();

// Step 3: Create the extended store
export const useAppStore = createCedarStore({
	extend: [customMessagesSlice] as const,
	persistOptions: {
		name: 'my-app-store',
	},
});

// Step 4: Create custom message renderers
const ImageMessageRenderer: React.FC<{
	message: MessageByType<'image', CustomMessages>;
}> = ({ message }) => {
	return (
		<div className='p-4 bg-gray-50 rounded-lg'>
			<img
				src={message.imageUrl}
				alt={message.alt || 'Image'}
				width={message.width}
				height={message.height}
				className='rounded-md shadow-md'
			/>
			{message.content && (
				<p className='mt-2 text-sm text-gray-600'>{message.content}</p>
			)}
		</div>
	);
};

const CodeMessageRenderer: React.FC<{
	message: MessageByType<'code', CustomMessages>;
}> = ({ message }) => {
	return (
		<div className='p-4 bg-gray-900 text-gray-100 rounded-lg'>
			{message.filename && (
				<div className='text-xs text-gray-400 mb-2'>{message.filename}</div>
			)}
			<pre className='overflow-x-auto'>
				<code className={`language-${message.language}`}>{message.code}</code>
			</pre>
			{message.content && (
				<p className='mt-2 text-sm text-gray-600'>{message.content}</p>
			)}
		</div>
	);
};

const ChartMessageRenderer: React.FC<{
	message: MessageByType<'chart', CustomMessages>;
}> = ({ message }) => {
	// Simplified chart rendering
	return (
		<div className='p-4 bg-white border rounded-lg'>
			<div className='h-64 bg-gray-100 rounded flex items-center justify-center'>
				<span className='text-gray-500'>
					{message.chartType} chart: {message.data.length} data points
				</span>
			</div>
			{message.content && (
				<p className='mt-2 text-sm text-gray-600'>{message.content}</p>
			)}
		</div>
	);
};

// Step 5: Example component using the custom messages
export const CustomMessagesExample: React.FC = () => {
	const { addMessage } = useAppStore();

	// Register custom renderers
	useMessageRenderer({
		type: 'image',
		renderer: ImageMessageRenderer,
	});

	useMessageRenderer({
		type: 'code',
		renderer: CodeMessageRenderer,
	});

	useMessageRenderer({
		type: 'chart',
		renderer: ChartMessageRenderer,
	});

	const sendExampleMessages = () => {
		// Text message (default type)
		addMessage({
			type: 'text',
			role: 'user',
			content: 'Show me an example of custom messages',
		});

		// Image message (custom type)
		addMessage({
			type: 'image',
			role: 'bot',
			content: 'Here is an example image:',
			imageUrl: 'https://via.placeholder.com/400x300',
			alt: 'Example placeholder image',
			width: 400,
			height: 300,
		});

		// Code message (custom type)
		addMessage({
			type: 'code',
			role: 'bot',
			content: 'Here is the code example you requested:',
			language: 'typescript',
			filename: 'example.ts',
			code: `// Custom message type definition
type ImageMessage = TypedMessage<'image', {
  imageUrl: string;
  alt?: string;
}>;`,
		});

		// Chart message (custom type)
		addMessage({
			type: 'chart',
			role: 'bot',
			content: 'Sales data for the last quarter:',
			chartType: 'bar',
			data: [
				{ month: 'Jan', sales: 100 },
				{ month: 'Feb', sales: 120 },
				{ month: 'Mar', sales: 90 },
			],
			options: {
				title: 'Q1 Sales',
			},
		});
	};

	return (
		<div className='flex flex-col h-screen'>
			<div className='flex-1 overflow-hidden'>
				<ChatBubbles />
			</div>
			<div className='p-4 border-t'>
				<button
					onClick={sendExampleMessages}
					className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
					Send Example Messages
				</button>
			</div>
		</div>
	);
};

// Example of using the default store (no custom types)
export const DefaultStoreExample: React.FC = () => {
	// This uses the default useCedarStore from '@/store/CedarStore'
	// It works out of the box with all default message types
	return <ChatBubbles />;
};

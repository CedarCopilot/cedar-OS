import React, { useCallback } from 'react';
import { CommandBar, CommandBarContents } from './CommandBar';
import { useCedarStore } from 'cedar-os';
import { cn } from 'cedar-os';
import {
	Send,
	History,
	HelpCircle,
	Trash2,
	Download,
	Upload,
	Bot,
} from 'lucide-react';

interface CommandBarChatProps {
	/** Whether the command bar is open/visible */
	open: boolean;
	/** Callback when the command bar should close */
	onClose?: () => void;
	/** Additional CSS classes */
	className?: string;
}

export const CommandBarChat: React.FC<CommandBarChatProps> = ({
	open,
	onClose,
	className,
}) => {
	const addMessage = useCedarStore((state) => state.addMessage);
	const messages = useCedarStore((state) => state.messages);
	const clearMessages = useCedarStore((state) => state.clearMessages);

	// Handle sending a message directly
	const handleSendMessage = useCallback(
		(content: string) => {
			if (content.trim()) {
				addMessage({
					role: 'user',
					type: 'text',
					content: content.trim(),
				});
			}
		},
		[addMessage]
	);

	// Handle clearing all messages
	const handleClearMessages = useCallback(() => {
		if (window.confirm('Are you sure you want to clear all messages?')) {
			clearMessages();
		}
	}, [clearMessages]);

	// Handle exporting messages
	const handleExportMessages = useCallback(() => {
		const exportData = {
			messages,
			timestamp: new Date().toISOString(),
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json',
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `chat-messages-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, [messages]);

	// Handle importing messages
	const handleImportMessages = useCallback(() => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json';
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = (e) => {
					try {
						const data = JSON.parse(e.target?.result as string);
						if (data.messages && Array.isArray(data.messages)) {
							// Clear existing messages and import new ones
							clearMessages();
							data.messages.forEach((msg: unknown) => {
								// Type guard to ensure msg is a valid message
								if (
									typeof msg === 'object' &&
									msg !== null &&
									'role' in msg &&
									'content' in msg
								) {
									addMessage(msg as Parameters<typeof addMessage>[0]);
								}
							});
						}
					} catch {
						alert('Invalid file format');
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	}, [addMessage, clearMessages]);

	const contents: CommandBarContents = {
		groups: [
			{
				id: 'quick-actions',
				heading: 'Quick Actions',
				items: [
					{
						id: 'send-message',
						label: 'Send Message',
						icon: <Send className='w-4 h-4' />,
						shortcut: '⌘↵',
						onSelect: () => {
							const message = window.prompt('Enter your message:');
							if (message) {
								handleSendMessage(message);
							}
						},
						searchFunction: (searchText, item) => {
							// Match on label, id, and common variations
							const terms = [
								item.label.toLowerCase(),
								item.id.toLowerCase(),
								'message',
								'chat',
								'ask',
								'tell',
								'say',
							];
							return terms.some((term) => term.includes(searchText));
						},
					},
					{
						id: 'quick-help',
						label: 'Quick Help',
						icon: <HelpCircle className='w-4 h-4' />,
						shortcut: '?',
						onSelect: () => {
							handleSendMessage(
								'Help me understand how to use this product roadmap tool'
							);
						},
						searchFunction: (searchText, item) => {
							// Match on help-related terms
							const terms = [
								item.label.toLowerCase(),
								'help',
								'support',
								'guide',
								'tutorial',
								'how',
								'what',
								'?',
							];
							return terms.some((term) => term.includes(searchText));
						},
					},
				],
			},
			{
				id: 'chat-management',
				heading: 'Chat Management',
				items: [
					{
						id: 'view-history',
						label: `View History (${messages.length} messages)`,
						icon: <History className='w-4 h-4' />,
						onSelect: () => {
							// This could open a history panel or send a summary message
							const summary = `You have ${
								messages.length
							} messages in your chat history. Recent messages: ${messages
								.slice(-3)
								.map((m) => `${m.role}: ${m.content?.slice(0, 50)}...`)
								.join(', ')}`;
							addMessage({
								role: 'assistant',
								type: 'text',
								content: summary,
							});
						},
					},
					{
						id: 'clear-messages',
						label: 'Clear All Messages',
						icon: <Trash2 className='w-4 h-4' />,
						shortcut: '⌘K',
						onSelect: handleClearMessages,
						searchFunction: (searchText, item) => {
							// Match on clearing/deleting terms
							const terms = [
								item.label.toLowerCase(),
								'clear',
								'delete',
								'remove',
								'reset',
								'empty',
								'trash',
								'clean',
							];
							return terms.some((term) => term.includes(searchText));
						},
					},
					{
						id: 'export-messages',
						label: 'Export Messages',
						icon: <Download className='w-4 h-4' />,
						onSelect: handleExportMessages,
					},
					{
						id: 'import-messages',
						label: 'Import Messages',
						icon: <Upload className='w-4 h-4' />,
						onSelect: handleImportMessages,
					},
				],
			},
			{
				id: 'common-prompts',
				heading: 'Common Prompts',
				items: [
					{
						id: 'analyze-roadmap',
						label: 'Analyze Current Roadmap',
						icon: '📊',
						onSelect: () => {
							handleSendMessage(
								'Please analyze the current product roadmap and provide insights on priorities, gaps, and suggestions for improvement.'
							);
						},
						searchFunction: (searchText, item) => {
							// Match on analysis and roadmap terms
							const terms = [
								item.label.toLowerCase(),
								'analyze',
								'analysis',
								'review',
								'roadmap',
								'insights',
								'gaps',
								'priorities',
								'improvement',
								'assess',
							];
							return terms.some((term) => term.includes(searchText));
						},
					},
					{
						id: 'suggest-features',
						label: 'Suggest New Features',
						icon: '💡',
						onSelect: () => {
							handleSendMessage(
								'Based on the current roadmap, what new features would you suggest adding? Consider user needs, market trends, and technical feasibility.'
							);
						},
					},
					{
						id: 'review-priorities',
						label: 'Review Priorities',
						icon: '🎯',
						onSelect: () => {
							handleSendMessage(
								'Help me review and prioritize the features in the roadmap. Which items should be moved up or down in priority?'
							);
						},
					},
					{
						id: 'estimate-effort',
						label: 'Estimate Development Effort',
						icon: '⏱️',
						onSelect: () => {
							handleSendMessage(
								'Can you help estimate the development effort and timeline for the features in the roadmap?'
							);
						},
					},
				],
			},
			{
				id: 'ai-assistant',
				heading: 'AI Assistant',
				items: [
					{
						id: 'ask-ai',
						label: 'Ask AI',
						icon: <Bot className='w-4 h-4' />,
						shortcut: '⌘⇧A',
						onSelect: () => {
							const question = window.prompt(
								'What would you like to ask the AI?'
							);
							if (question) {
								handleSendMessage(question);
							}
						},
						searchFunction: () => true,
					},
				],
			},
		],
	};

	// Don't render if not open
	if (!open) return null;

	return (
		<div
			className={cn(
				'fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] w-2xl',
				className
			)}>
			<CommandBar
				open={open}
				contents={contents}
				onClose={onClose}
				placeholder='Type a command, ask a question, or search...'
				emptyMessage="No commands found. Try typing 'help' or 'send message'."
			/>
		</div>
	);
};

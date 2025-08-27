import React, { useCallback } from 'react';
import { CommandBar, CommandBarContents } from './CommandBar';
import { useCedarStore } from 'cedar-os';
import { cn } from 'cedar-os';
import {
	Send,
	HelpCircle,
	Bot,
	Plus,
	PlusCircle,
	Link,
	Wand2,
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
		],
		fixedBottomGroup: {
			id: 'quick-actions-bottom',
			heading: 'Quick Actions',
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
				{
					id: 'create-new-item',
					label: 'Create New Item',
					icon: <Plus className='w-4 h-4' />,
					shortcut: '⌘N',
					onSelect: () => {
						handleSendMessage(
							'Help me create a new item for the product roadmap. What should we add?'
						);
					},
					searchFunction: (searchText, item) => {
						const terms = [
							item.label.toLowerCase(),
							'create',
							'new',
							'add',
							'make',
							'item',
						];
						return terms.some((term) => term.includes(searchText));
					},
				},
				{
					id: 'add-item',
					label: 'Add Item',
					icon: <PlusCircle className='w-4 h-4' />,
					shortcut: '⌘⇧N',
					onSelect: () => {
						handleSendMessage(
							'I want to add a specific item to the roadmap. Can you help me structure it properly?'
						);
					},
					searchFunction: (searchText, item) => {
						const terms = [
							item.label.toLowerCase(),
							'add',
							'insert',
							'item',
							'feature',
						];
						return terms.some((term) => term.includes(searchText));
					},
				},
				{
					id: 'connect',
					label: 'Connect',
					icon: <Link className='w-4 h-4' />,
					shortcut: '⌘L',
					onSelect: () => {
						handleSendMessage(
							'Help me connect items in the roadmap or establish relationships between features.'
						);
					},
					searchFunction: (searchText, item) => {
						const terms = [
							item.label.toLowerCase(),
							'connect',
							'link',
							'relate',
							'relationship',
							'dependency',
						];
						return terms.some((term) => term.includes(searchText));
					},
				},
				{
					id: 'autoformat',
					label: 'Autoformat',
					icon: <Wand2 className='w-4 h-4' />,
					shortcut: '⌘⇧F',
					onSelect: () => {
						handleSendMessage(
							'Please help me automatically format and organize the roadmap items for better clarity and structure.'
						);
					},
					searchFunction: (searchText, item) => {
						const terms = [
							item.label.toLowerCase(),
							'format',
							'organize',
							'structure',
							'auto',
							'clean',
							'arrange',
						];
						return terms.some((term) => term.includes(searchText));
					},
				},
			],
		},
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

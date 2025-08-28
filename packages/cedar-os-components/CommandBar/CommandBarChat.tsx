import { cn, useCedarStore } from 'cedar-os';
import { Bot, HelpCircle, Plus, PlusCircle, Send, Wand2 } from 'lucide-react';
import React from 'react';
import { CommandBar, CommandBarContents, CommandBarItem } from './CommandBar';

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
	const sendMessage = useCedarStore((state) => state.sendMessage);
	const [searchText, setSearchText] = React.useState('');

	// Base contents that are always shown
	const baseContents: CommandBarContents = {
		groups: [
			{
				id: 'quick-actions',
				heading: 'Quick Actions',
				items: [
					{
						id: 'send-message',
						label: 'Send Message',
						icon: <Send className='w-4 h-4' />,
						onSelect: () => {
							sendMessage();
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
						ignoreInputElements: false, // Allow ? in inputs
						onSelect: () => {
							sendMessage();
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
		],
		fixedBottomGroup: {
			id: 'quick-actions-bottom',
			heading: 'Quick Actions',
			items: [
				{
					id: 'ask-ai',
					label: 'Ask AI',
					icon: <Bot className='w-4 h-4' />,
					activationEvent: 'cmd+enter',
					color: 'blue',
					onSelect: () => {
						sendMessage();
					},
					searchFunction: () => true,
					priorityFunction: (searchText, item) => {
						let score = 0;
						const text = searchText.toLowerCase();

						// High priority for question/AI-related terms
						if (text.includes('ask')) score += 100;
						if (text.includes('question')) score += 90;
						if (text.includes('help')) score += 80;
						if (text.includes('ai')) score += 70;
						if (text.includes('tell')) score += 60;
						if (text.includes('explain')) score += 50;
						if (text.includes('what')) score += 40;
						if (text.includes('how')) score += 40;
						if (text.includes('why')) score += 40;

						// Boost for exact label match
						if (text.includes(item.label.toLowerCase())) score += 30;

						return score;
					},
				},
				{
					id: 'create-new-item',
					label: 'Create Item',
					icon: <Plus className='w-4 h-4' />,
					activationEvent: 'ctrl+s',
					color: 'green',
					onSelect: () => {
						console.log(
							'Help me create a new item for the product roadmap. What should we add?'
						);
					},
					searchFunction: () => true,
					priorityFunction: (searchText, item) => {
						let score = 0;
						const text = searchText.toLowerCase();

						// High priority for creation-related terms
						if (text.includes('create')) score += 100;
						if (text.includes('make')) score += 80;
						if (text.includes('new')) score += 70;
						if (text.includes('add')) score += 60;
						if (text.includes('build')) score += 50;
						if (text.includes('start')) score += 40;

						// Boost for exact label match
						if (text.includes(item.label.toLowerCase())) score += 30;

						return score;
					},
				},
				{
					id: 'add-item',
					label: 'Add Item',
					icon: <PlusCircle className='w-4 h-4' />,
					activationEvent: 'ctrl+d',
					color: 'purple',
					onSelect: () => {
						console.log(
							'I want to add a specific item to the roadmap. Can you help me structure it properly?'
						);
					},
					searchFunction: () => true,
					priorityFunction: (searchText, item) => {
						let score = 0;
						const text = searchText.toLowerCase();

						// High priority for adding-related terms
						if (text.includes('add')) score += 100;
						if (text.includes('insert')) score += 80;
						if (text.includes('include')) score += 70;
						if (text.includes('put')) score += 60;
						if (text.includes('place')) score += 50;

						// Boost for exact label match
						if (text.includes(item.label.toLowerCase())) score += 30;

						return score;
					},
				},
				{
					id: 'autoformat',
					label: 'Autoformat',
					icon: <Wand2 className='w-4 h-4' />,
					activationEvent: 'ctrl+f',
					color: 'pink',
					onSelect: () => {
						console.log(
							'Please help me automatically format and organize the roadmap items for better clarity and structure.'
						);
					},
					searchFunction: () => true,
					priorityFunction: (searchText, item) => {
						let score = 0;
						const text = searchText.toLowerCase();

						// High priority for formatting-related terms
						if (text.includes('format')) score += 100;
						if (text.includes('organize')) score += 90;
						if (text.includes('structure')) score += 80;
						if (text.includes('clean')) score += 70;
						if (text.includes('arrange')) score += 60;
						if (text.includes('auto')) score += 50;
						if (text.includes('fix')) score += 40;
						if (text.includes('tidy')) score += 40;

						// Boost for exact label match
						if (text.includes(item.label.toLowerCase())) score += 30;

						return score;
					},
				},
			],
		},
	};

	// Common prompts group - only shown when search is empty
	const commonPromptsGroup = {
		id: 'common-prompts',
		heading: 'Common Prompts',
		items: [
			{
				id: 'analyze-roadmap',
				label: 'Analyze Current Roadmap',
				icon: '📊',
				onSelect: () => {
					sendMessage();
				},
				searchFunction: (searchText: string, item: CommandBarItem) => {
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
					sendMessage();
				},
			},
			{
				id: 'review-priorities',
				label: 'Review Priorities',
				icon: '🎯',
				onSelect: () => {
					sendMessage();
				},
			},
			{
				id: 'estimate-effort',
				label: 'Estimate Development Effort',
				icon: '⏱️',
				onSelect: () => {
					sendMessage();
				},
			},
		],
	};

	// Create dynamic contents based on search state
	const contents: CommandBarContents = React.useMemo(() => {
		const isEmpty = searchText.trim() === '';

		return {
			groups: isEmpty
				? [...baseContents.groups, commonPromptsGroup]
				: baseContents.groups,
			fixedBottomGroup: baseContents.fixedBottomGroup,
		};
	}, [searchText]);

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
				onSearchChange={setSearchText}
			/>
		</div>
	);
};

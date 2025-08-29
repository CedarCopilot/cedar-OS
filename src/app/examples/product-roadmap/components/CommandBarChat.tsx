import { CommandBar, CommandBarContents } from '@/CommandBar/CommandBar';
import { useCedarStore } from 'cedar-os';
import { Bot, Plus, PlusCircle, Wand2 } from 'lucide-react';
import React from 'react';
import type { Node } from 'reactflow';
import type { FeatureNodeData } from './FeatureNode';

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
}) => {
	const sendMessage = useCedarStore((state) => state.sendMessage);
	const [searchText, setSearchText] = React.useState('');

	// Get nodes from Cedar store
	const nodes = useCedarStore(
		(state) => (state.getCedarState?.('nodes') as Node<FeatureNodeData>[]) || []
	);

	// Get the setCedarState function to update selectedNodes
	const setCedarState = useCedarStore((state) => state.setCedarState);

	// Filter nodes based on search text
	const filteredNodes = React.useMemo(() => {
		if (!searchText.trim()) return nodes.slice(0, 8); // Show first 8 nodes when no search

		const searchLower = searchText.toLowerCase();
		return nodes
			.filter((node) => {
				return (
					node.data.title.toLowerCase().includes(searchLower) ||
					node.data.description.toLowerCase().includes(searchLower) ||
					node.data.status.toLowerCase().includes(searchLower) ||
					(node.data.nodeType &&
						node.data.nodeType.toLowerCase().includes(searchLower))
				);
			})
			.slice(0, 10); // Limit to 10 results
	}, [nodes, searchText]);

	// Create node search results group
	const nodeSearchGroup = {
		id: 'node-search',
		heading: searchText.trim()
			? `Nodes matching "${searchText}"`
			: 'Recent Nodes',
		items: filteredNodes.map((node) => ({
			id: `node-${node.id}`,
			label: node.data.title,
			icon: getNodeTypeIcon(node.data.nodeType || 'feature'),
			color: getNodeTypeColor(node.data.nodeType || 'feature'),
			onSelect: () => {
				// Select the node by updating the selectedNodes state in Cedar
				if (setCedarState) {
					setCedarState('selectedNodes', [node]);
				}

				// Close the command bar after selection
				if (onClose) {
					onClose();
				}
			},
			searchFunction: (searchText: string) => {
				const terms = [
					node.data.title.toLowerCase(),
					node.data.description.toLowerCase(),
					node.data.status.toLowerCase(),
					node.data.nodeType?.toLowerCase() || '',
				];
				return terms.some((term) => term.includes(searchText.toLowerCase()));
			},
			priorityFunction: (searchText: string) => {
				let score = 0;
				const text = searchText.toLowerCase();

				// Higher score for title matches
				if (node.data.title.toLowerCase().includes(text)) score += 100;
				// Medium score for description matches
				if (node.data.description.toLowerCase().includes(text)) score += 50;
				// Lower score for status/type matches
				if (node.data.status.toLowerCase().includes(text)) score += 30;
				if (node.data.nodeType?.toLowerCase().includes(text)) score += 20;

				// Boost for exact matches
				if (node.data.title.toLowerCase() === text) score += 200;

				return score;
			},
		})),
	};

	// Base contents with node search results
	const baseContents: CommandBarContents = {
		groups: [nodeSearchGroup],
		fixedBottomGroup: {
			id: 'quick-actions-bottom',
			heading: 'Quick Actions',
			items: [
				{
					id: 'ask-ai',
					label: 'Ask AI',
					icon: <Bot className='w-4 h-4' />,
					activationEvent: 'cmd+enter',
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
						const message =
							'Please help me automatically format and organize the roadmap items for better clarity and structure.';
						const store = useCedarStore.getState();
						store.setOverrideInputContent(message);
						sendMessage();
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

	// Don't render if not open
	if (!open) return null;

	return (
		<CommandBar
			open={open}
			contents={baseContents}
			onClose={onClose}
			placeholder='Search nodes or ask a question...'
			onSearchChange={setSearchText}
		/>
	);
};

// Helper functions for node type styling
function getNodeTypeIcon(nodeType: string): string {
	const iconMap: Record<string, string> = {
		feature: '💡',
		bug: '🐛',
		improvement: '📦',
		component: '🔧',
		utils: '🛠️',
		'agent helper': '🤖',
	};
	return iconMap[nodeType] || '💡';
}

function getNodeTypeColor(nodeType: string): string {
	const colorMap: Record<string, string> = {
		feature: 'purple',
		bug: 'red',
		improvement: 'blue',
		component: 'indigo',
		utils: 'orange',
		'agent helper': 'green',
	};
	return colorMap[nodeType] || 'purple';
}

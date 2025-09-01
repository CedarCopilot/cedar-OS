'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
	Plus,
	MessageSquare,
	Package,
	Bug,
	Zap,
	MessageCircle,
	PanelRight,
	Subtitles,
	Terminal,
	Sun,
	Moon,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useCedarStore } from 'cedar-os';
import Container3D from '@/containers/Container3D';
import { Button } from '@/components/ui/button';

interface FloatingMenuProps {
	onChatModeChange: (
		mode: 'floating' | 'sidepanel' | 'caption' | 'command'
	) => void;
	currentChatMode: 'floating' | 'sidepanel' | 'caption' | 'command';
}

export const FloatingMenu: React.FC<FloatingMenuProps> = ({
	onChatModeChange,
	currentChatMode,
}) => {
	const [showAddMenu, setShowAddMenu] = useState(false);
	const [showChatMenu, setShowChatMenu] = useState(false);

	// Use Cedar store for dark mode state
	const isDarkMode = useCedarStore((state) => state.styling.darkMode);
	const toggleDarkMode = useCedarStore((state) => state.toggleDarkMode);
	const executeStateSetter = useCedarStore((state) => state.executeStateSetter);

	// Initialize theme from localStorage or system preference and sync with Cedar store
	useEffect(() => {
		const savedTheme = localStorage.getItem('theme');
		const systemPrefersDark = window.matchMedia(
			'(prefers-color-scheme: dark)'
		).matches;

		const shouldBeDark =
			savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

		// Sync with Cedar store if different
		if (shouldBeDark !== isDarkMode) {
			toggleDarkMode();
		}

		// Apply to DOM
		if (shouldBeDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, []);

	// Sync DOM classes when Cedar store changes
	useEffect(() => {
		if (isDarkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}, [isDarkMode]);

	// Toggle theme handler
	const handleThemeToggle = useCallback(() => {
		toggleDarkMode();
	}, [toggleDarkMode]);

	// Add feature handler
	const handleAddNode = useCallback(
		(nodeType: 'feature' | 'bug' | 'improvement') => {
			const newNode = {
				id: uuidv4(),
				type: 'featureNode',
				position: {
					x: Math.random() * 400 + 200,
					y: Math.random() * 400 + 100,
				},
				data: {
					title: `New ${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)}`,
					description: `Describe your ${nodeType} here`,
					upvotes: 0,
					comments: [],
					status: (nodeType === 'bug' ? 'backlog' : 'planned') as
						| 'backlog'
						| 'planned',
					nodeType: nodeType as 'feature' | 'bug' | 'improvement',
					diff: 'added' as const,
				},
			};
			executeStateSetter({
				key: 'nodes',
				setterKey: 'addNode',
				args: { node: newNode },
			});
			setShowAddMenu(false);
		},
		[executeStateSetter]
	);

	const menuItems = [
		{
			id: 'add',
			icon: Plus,
			label: 'Add Node',
			onClick: () => {
				setShowAddMenu(!showAddMenu);
				setShowChatMenu(false);
			},
		},
		{
			id: 'chat',
			icon: MessageSquare,
			label: 'Chat Mode',
			onClick: () => {
				setShowChatMenu(!showChatMenu);
				setShowAddMenu(false);
			},
		},
		{
			id: 'theme',
			icon: isDarkMode ? Sun : Moon,
			label: isDarkMode ? 'Light Mode' : 'Dark Mode',
			onClick: handleThemeToggle,
		},
	];

	const chatModeOptions = [
		{
			id: 'command',
			icon: Terminal,
			label: 'Command',
			mode: 'command' as const,
		},
		{
			id: 'floating',
			icon: MessageCircle,
			label: 'Floating',
			mode: 'floating' as const,
		},
		{
			id: 'sidepanel',
			icon: PanelRight,
			label: 'Side Panel',
			mode: 'sidepanel' as const,
		},
		{
			id: 'caption',
			icon: Subtitles,
			label: 'Caption',
			mode: 'caption' as const,
		},
	];

	const addNodeOptions = [
		{
			id: 'feature',
			icon: Package,
			label: 'Feature',
			type: 'feature' as const,
		},
		{
			id: 'bug',
			icon: Bug,
			label: 'Bug',
			type: 'bug' as const,
		},
		{
			id: 'improvement',
			icon: Zap,
			label: 'Improvement',
			type: 'improvement' as const,
		},
	];

	return (
		<div className='fixed left-4 top-1/2 -translate-y-1/2 z-50'>
			<Container3D className='p-2'>
				<div className='flex flex-col gap-2'>
					{menuItems.map((item) => (
						<div key={item.id} className='relative group'>
							<Button variant='ghost' size='icon' onClick={item.onClick}>
								<item.icon className='w-5 h-5' />
							</Button>
							{/* Tooltip */}
							<div className='absolute left-full ml-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity'>
								<div className='bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap'>
									{item.label}
								</div>
							</div>
						</div>
					))}
				</div>
			</Container3D>

			{/* Add Menu */}
			<AnimatePresence>
				{showAddMenu && (
					<motion.div
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -10 }}
						className='absolute left-full ml-2 top-0'>
						<Container3D className='p-2'>
							<div className='flex flex-row gap-2'>
								{addNodeOptions.map((option) => (
									<Button
										key={option.id}
										variant='ghost'
										size='icon'
										onClick={() => handleAddNode(option.type)}
										title={`Add ${option.label}`}>
										<option.icon className='w-4 h-4' />
									</Button>
								))}
							</div>
						</Container3D>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Chat Mode Menu */}
			<AnimatePresence>
				{showChatMenu && (
					<motion.div
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: -10 }}
						className='absolute left-full ml-2 top-24'>
						<Container3D className='p-2'>
							<div className='flex flex-row gap-2'>
								{chatModeOptions.map((option) => (
									<Button
										key={option.id}
										variant={
											currentChatMode === option.mode ? 'secondary' : 'ghost'
										}
										onClick={() => {
											onChatModeChange(option.mode);
											setShowChatMenu(false);
										}}
										title={`${option.label} Chat`}
										className='flex items-center gap-2 whitespace-nowrap'>
										<option.icon className='w-4 h-4' />
										<span className='text-xs'>{option.label}</span>
									</Button>
								))}
							</div>
						</Container3D>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
};

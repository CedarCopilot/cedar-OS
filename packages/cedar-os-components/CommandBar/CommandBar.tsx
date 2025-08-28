import { ContextBadgeRow } from '@/chatInput/ContextBadgeRow';
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/ui/command';
import { KeyboardShortcut } from '@/ui/KeyboardShortcut';
import { EditorContent } from '@tiptap/react';
import { cn, useCedarEditor, useSpell } from 'cedar-os';
import type { ActivationEvent, ActivationMode } from 'cedar-os';
import { ActivationMode as ActivationModeEnum } from 'cedar-os';
import { motion } from 'motion/react';
import React from 'react';
import { getShortcutDisplay } from './utils';

/**
 * Determine if an activation event should ignore input elements
 * Non-modifier single keys should ignore inputs, modifier combinations should not
 */
const shouldIgnoreInputElements = (
	activationEvent: ActivationEvent
): boolean => {
	if (typeof activationEvent === 'string') {
		// If it contains modifiers (like cmd+s), don't ignore input elements
		if (activationEvent.includes('+')) {
			return false;
		}
		// Single keys should ignore input elements
		return true;
	}

	// For enum values, single keys should ignore input elements
	return true;
};

export interface CommandBarItem {
	/** Unique identifier for the item */
	id: string;
	/** Display text for the item */
	label: string;
	/** Optional icon (emoji string or React node) */
	icon?: React.ReactNode;
	/** Callback when item is selected */
	onSelect: () => void;
	/** Optional activation event for hotkey (replaces shortcut string) */
	activationEvent?: ActivationEvent;
	/** Optional activation mode (defaults to TRIGGER for command bar items) */
	activationMode?: ActivationMode;
	/** Whether the item is disabled */
	disabled?: boolean;
	/** Optional custom search function to determine if item matches search text */
	searchFunction?: (searchText: string, item: CommandBarItem) => boolean;
	/** Optional priority scoring function for better ordering based on search text */
	priorityFunction?: (searchText: string, item: CommandBarItem) => number;
	/** Optional color for background styling (e.g., 'blue', 'green', 'purple') */
	color?: string;
	/** Whether to ignore input elements for this hotkey (defaults to true for non-modifier keys) */
	ignoreInputElements?: boolean;
}

export interface CommandBarGroup {
	/** Unique identifier for the group */
	id: string;
	/** Heading text for the group */
	heading: string;
	/** Items in this group */
	items: CommandBarItem[];
}

export interface CommandBarContents {
	/** Array of command groups */
	groups: CommandBarGroup[];
	/** Optional fixed bottom group that stays at the bottom outside scroll area */
	fixedBottomGroup?: CommandBarGroup;
}

interface CommandBarProps {
	/** Whether the command bar is open/visible */
	open: boolean;
	/** Command bar contents organized into groups */
	contents: CommandBarContents;
	/** Placeholder text for the search input */
	placeholder?: string;
	/** Additional CSS classes */
	className?: string;
	/** Callback when the command bar should close */
	onClose?: () => void;
	/** Whether the command bar is in collapsed state (only shows search bar) */
	collapsed?: boolean;
	/** Callback when search text changes */
	onSearchChange?: (searchText: string) => void;
}

/**
 * Hook to register a command bar item as a spell
 */
const useCommandBarItemSpell = (
	item: CommandBarItem,
	isOpen: boolean,
	onClose?: () => void
) => {
	const spellId = `command-bar-${item.id}`;

	useSpell({
		id: spellId,
		activationConditions: {
			events: item.activationEvent ? [item.activationEvent] : [],
			mode: item.activationMode || ActivationModeEnum.TRIGGER, // Default to trigger mode for command items
		},
		onActivate: () => {
			if (isOpen && !item.disabled) {
				item.onSelect();

				onClose?.();
			}
		},
		preventDefaultEvents: true, // Prevent default browser behavior
		ignoreInputElements:
			item.ignoreInputElements ??
			shouldIgnoreInputElements(item.activationEvent || ''),
	});
};

export const CommandBar: React.FC<CommandBarProps> = ({
	open,
	contents,
	placeholder = 'Type a command or search...',
	className,
	onClose,
	collapsed: controlledCollapsed,
	onSearchChange,
}) => {
	const [isFocused, setIsFocused] = React.useState(false);
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const commandListRef = React.useRef<HTMLDivElement>(null);

	// Use Cedar editor for the input
	const { editor, getEditorText } = useCedarEditor({
		placeholder,
		onFocus: () => setIsFocused(true),
		onBlur: () => setIsFocused(false),
	});

	// Collect all items with activation events
	const allItems: CommandBarItem[] = React.useMemo(
		() => [
			...contents.groups.flatMap((group) => group.items),
			...(contents.fixedBottomGroup?.items || []),
		],
		[contents]
	);

	// Register spells for all items with activation events
	allItems.forEach((item) => {
		if (item.activationEvent) {
			// eslint-disable-next-line react-hooks/rules-of-hooks
			useCommandBarItemSpell(item, open, onClose);
		}
	});

	// Get the current search text
	const searchText = getEditorText().toLowerCase().trim();

	// Notify parent of search text changes
	React.useEffect(() => {
		onSearchChange?.(searchText);
	}, [searchText, onSearchChange]);

	// Filter and sort contents based on search text with priority scoring
	const filteredContents = React.useMemo(() => {
		if (!searchText) return contents;

		const filterAndSortItems = (items: CommandBarItem[]) => {
			// First filter items that match
			const matchingItems = items.filter((item) => {
				// Use custom search function if provided
				if (item.searchFunction) {
					return item.searchFunction(searchText, item);
				}
				// Fall back to default search behavior
				return (
					item.label.toLowerCase().includes(searchText) ||
					item.id.toLowerCase().includes(searchText)
				);
			});

			// Then sort by priority score (higher scores first)
			return matchingItems.sort((a, b) => {
				const scoreA = a.priorityFunction
					? a.priorityFunction(searchText, a)
					: 0;
				const scoreB = b.priorityFunction
					? b.priorityFunction(searchText, b)
					: 0;
				return scoreB - scoreA; // Higher scores first
			});
		};

		const filteredGroups = contents.groups
			.map((group) => ({
				...group,
				items: filterAndSortItems(group.items),
			}))
			.filter((group) => group.items.length > 0);

		// Filter and sort fixed bottom group separately
		let filteredFixedBottomGroup: CommandBarGroup | undefined;
		if (contents.fixedBottomGroup) {
			const sortedItems = filterAndSortItems(contents.fixedBottomGroup.items);

			if (sortedItems.length > 0) {
				filteredFixedBottomGroup = {
					...contents.fixedBottomGroup,
					items: sortedItems,
				};
			}
		}

		return {
			groups: filteredGroups,
			fixedBottomGroup: filteredFixedBottomGroup,
		};
	}, [contents, searchText]);

	// Create a flattened list of all items for easier keyboard navigation
	const allItemsForNavigation = React.useMemo(() => {
		const items: CommandBarItem[] = filteredContents.groups.flatMap(
			(group) => group.items
		);
		if (filteredContents.fixedBottomGroup) {
			items.push(...filteredContents.fixedBottomGroup.items);
		}
		return items;
	}, [filteredContents]);

	// Reset selected index when filtered items change and auto-select first item
	React.useEffect(() => {
		if (allItemsForNavigation.length > 0) {
			setSelectedIndex(0);
		} else {
			setSelectedIndex(-1);
		}
	}, [allItemsForNavigation]);

	// Determine if collapsed - controlled prop takes precedence, otherwise based on focus
	const isCollapsed =
		controlledCollapsed !== undefined ? controlledCollapsed : !isFocused;

	// Handle item selection
	const handleItemSelect = (item: CommandBarItem) => {
		if (!item.disabled) {
			item.onSelect();
			onClose?.();
			editor?.commands.blur();
		}
	};

	// Handle keyboard navigation
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				if (isFocused) {
					// Unfocus the input
					editor?.commands.blur();
					setIsFocused(false);
				} else {
					// Close the command bar if input is not focused
					onClose?.();
				}
			} else if (e.key === 'Tab' && !e.shiftKey && open) {
				e.preventDefault();
				if (isFocused) {
					// Unfocus the input if it's currently focused
					editor?.commands.blur();
					setIsFocused(false);
				} else {
					// Focus the input if it's not focused
					editor?.commands.focus();
				}
			} else if (
				e.key === 'ArrowDown' &&
				isFocused &&
				allItemsForNavigation.length > 0
			) {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < allItemsForNavigation.length - 1 ? prev + 1 : 0
				);
			} else if (
				e.key === 'ArrowUp' &&
				isFocused &&
				allItemsForNavigation.length > 0
			) {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : allItemsForNavigation.length - 1
				);
			} else if (
				e.key === 'ArrowRight' &&
				isFocused &&
				allItemsForNavigation.length > 0
			) {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < allItemsForNavigation.length - 1 ? prev + 1 : 0
				);
			} else if (
				e.key === 'ArrowLeft' &&
				isFocused &&
				allItemsForNavigation.length > 0
			) {
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : allItemsForNavigation.length - 1
				);
			} else if (
				e.key === 'Enter' &&
				isFocused &&
				selectedIndex >= 0 &&
				allItemsForNavigation[selectedIndex]
			) {
				e.preventDefault();
				const selectedItem = allItemsForNavigation[selectedIndex];
				handleItemSelect(selectedItem);
			}
		};

		if (open) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [open, onClose, editor, isFocused, allItemsForNavigation, selectedIndex]);

	// Don't render if not open
	if (!open) return null;

	return (
		<div
			className={cn(
				'fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] w-2xl',
				className
			)}>
			<motion.div
				className={cn(
					'rounded-lg border shadow-md overflow-hidden text-sm',
					className
				)}
				style={{ willChange: 'transform' }}
				animate={{
					height: isCollapsed ? 'auto' : 'auto',
				}}
				transition={{
					type: 'spring',
					stiffness: 300,
					damping: 30,
					mass: 0.8,
				}}>
				<Command
					className='h-full'
					shouldFilter={false}
					value={
						selectedIndex >= 0 && allItemsForNavigation[selectedIndex]
							? allItemsForNavigation[selectedIndex].id
							: ''
					}
					onValueChange={(value) => {
						// Find the index of the selected item
						const index = allItemsForNavigation.findIndex(
							(item) => item.id === value
						);
						if (index >= 0) {
							setSelectedIndex(index);
						}
					}}>
					<div className='flex w-full flex-col gap-2 px-3 py-2'>
						<ContextBadgeRow editor={editor} />
						<div className='flex w-full items-center gap-2'>
							{!isFocused && <KeyboardShortcut shortcut='⇥' />}
							<motion.div
								layoutId='chatInput'
								className='flex-1 justify-center py-'
								aria-label='Message input'>
								<EditorContent
									editor={editor}
									className='prose prose-sm max-w-none focus:outline-none outline-none focus:ring-0 ring-0 [&_*]:focus:outline-none [&_*]:outline-none [&_*]:focus:ring-0 [&_*]:ring-0 placeholder-gray-500 dark:placeholder-gray-400 [&_.ProseMirror]:p-0 [&_.ProseMirror]:outline-none'
								/>
							</motion.div>
						</div>
					</div>

					<motion.div
						ref={commandListRef}
						animate={{
							height: isCollapsed ? 0 : 'auto',
							opacity: isCollapsed ? 0 : 1,
						}}
						transition={{
							type: 'spring',
							stiffness: 300,
							damping: 30,
							mass: 0.8,
						}}
						style={{
							overflow: 'hidden',
							willChange: 'transform',
							maxHeight: '50vh',
						}}>
						{!isCollapsed && (
							<CommandList className='max-h-[50vh] overflow-y-auto'>
								{filteredContents.groups.map((group, groupIndex) => (
									<React.Fragment key={group.id}>
										{/* Add separator between groups (except before first group) */}
										{groupIndex > 0 && <CommandSeparator />}

										<CommandGroup heading={group.heading}>
											{group.items.map((item) => (
												<CommandItem
													key={item.id}
													value={item.id}
													onSelect={() => {
														handleItemSelect(item);
													}}
													onMouseDown={() => {
														handleItemSelect(item);
													}}
													disabled={item.disabled}
													className={cn(
														'flex items-center gap-2 cursor-pointer',
														item.disabled && 'opacity-50 cursor-not-allowed',
														// Apply color-based styling if color is specified
														item.color === 'blue' &&
															'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 data-[selected=true]:bg-blue-200 dark:data-[selected=true]:bg-blue-900/50',
														item.color === 'green' &&
															'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50 data-[selected=true]:bg-green-200 dark:data-[selected=true]:bg-green-900/50',
														item.color === 'purple' &&
															'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50 data-[selected=true]:bg-purple-200 dark:data-[selected=true]:bg-purple-900/50',
														item.color === 'orange' &&
															'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50 data-[selected=true]:bg-orange-200 dark:data-[selected=true]:bg-orange-900/50',
														item.color === 'pink' &&
															'bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-950/50 data-[selected=true]:bg-pink-200 dark:data-[selected=true]:bg-pink-900/50',
														item.color === 'amber' &&
															'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 data-[selected=true]:bg-amber-200 dark:data-[selected=true]:bg-amber-900/50',
														item.color === 'red' &&
															'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 data-[selected=true]:bg-red-200 dark:data-[selected=true]:bg-red-900/50',
														item.color === 'indigo' &&
															'bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 data-[selected=true]:bg-indigo-200 dark:data-[selected=true]:bg-indigo-900/50'
													)}>
													{item.icon && (
														<span className='flex-shrink-0'>
															{typeof item.icon === 'string' ? (
																<span className='text-sm'>{item.icon}</span>
															) : (
																item.icon
															)}
														</span>
													)}
													<span className='flex-1'>{item.label}</span>
													{item.activationEvent && (
														<KeyboardShortcut
															shortcut={getShortcutDisplay(
																item.activationEvent
															)}
														/>
													)}
												</CommandItem>
											))}
										</CommandGroup>
									</React.Fragment>
								))}
							</CommandList>
						)}
					</motion.div>

					{/* Fixed bottom group - always visible when expanded */}
					{!isCollapsed && filteredContents.fixedBottomGroup && (
						<div className='border-t'>
							<div className='p-2'>
								<div className='text-xs font-medium text-muted-foreground mb-2 px-2'>
									{filteredContents.fixedBottomGroup.heading}
								</div>
								<div className='flex gap-1'>
									{filteredContents.fixedBottomGroup.items.map((item) => (
										<button
											key={item.id}
											onMouseDown={() => {
												handleItemSelect(item);
											}}
											disabled={item.disabled}
											className={cn(
												'flex-1 flex items-center justify-between gap-1 p-2 rounded-md text-xs transition-colors',
												'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
												item.disabled && 'opacity-50 cursor-not-allowed',
												// Apply color-based styling if color is specified
												item.color === 'blue' &&
													'bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50',
												item.color === 'green' &&
													'bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50',
												item.color === 'purple' &&
													'bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-950/50',
												item.color === 'orange' &&
													'bg-orange-50 dark:bg-orange-950/30 hover:bg-orange-100 dark:hover:bg-orange-950/50',
												item.color === 'pink' &&
													'bg-pink-50 dark:bg-pink-950/30 hover:bg-pink-100 dark:hover:bg-pink-950/50',
												item.color === 'amber' &&
													'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50',
												item.color === 'red' &&
													'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50',
												item.color === 'indigo' &&
													'bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-950/50',
												// Selection highlights
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'blue' &&
													'bg-blue-200 dark:bg-blue-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'green' &&
													'bg-green-200 dark:bg-green-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'purple' &&
													'bg-purple-200 dark:bg-purple-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'orange' &&
													'bg-orange-200 dark:bg-orange-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'pink' &&
													'bg-pink-200 dark:bg-pink-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'amber' &&
													'bg-amber-200 dark:bg-amber-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'red' &&
													'bg-red-200 dark:bg-red-900/50',
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color === 'indigo' &&
													'bg-indigo-200 dark:bg-indigo-900/50'
											)}>
											<div className='flex items-center gap-1'>
												{item.icon && (
													<span className='flex-shrink-0'>
														{typeof item.icon === 'string' ? (
															<span className='text-sm'>{item.icon}</span>
														) : (
															item.icon
														)}
													</span>
												)}
												<span className='leading-tight truncate'>
													{item.label}
												</span>
											</div>
											{item.activationEvent && (
												<KeyboardShortcut
													shortcut={getShortcutDisplay(item.activationEvent)}
												/>
											)}
										</button>
									))}
								</div>
							</div>
						</div>
					)}
				</Command>
			</motion.div>
		</div>
	);
};

import { ContextBadgeRow } from '@/chatInput/ContextBadgeRow';
import { ChatRenderer } from '@/chatMessages/ChatRenderer';
import { ShimmerText } from '@/text/ShimmerText';
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/ui/command';
import { KeyboardShortcut } from '@/ui/KeyboardShortcut';
import { EditorContent } from '@tiptap/react';
import type { ActivationEvent, ActivationMode } from 'cedar-os';
import {
	ActivationMode as ActivationModeEnum,
	cn,
	useCedarEditor,
	useMessages,
	useMultipleSpells,
} from 'cedar-os';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { getShortcutDisplay } from './getShortcutDisplay';

// Color class mappings to avoid duplication
const COLOR_CLASSES = {
	blue: 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60 data-[selected=true]:bg-blue-200 dark:data-[selected=true]:bg-blue-800/60',
	green:
		'bg-green-50 dark:bg-green-950/40 hover:bg-green-100 dark:hover:bg-green-950/60 data-[selected=true]:bg-green-200 dark:data-[selected=true]:bg-green-800/60',
	purple:
		'bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-950/60 data-[selected=true]:bg-purple-200 dark:data-[selected=true]:bg-purple-800/60',
	orange:
		'bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-950/60 data-[selected=true]:bg-orange-200 dark:data-[selected=true]:bg-orange-800/60',
	pink: 'bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 dark:hover:bg-pink-950/60 data-[selected=true]:bg-pink-200 dark:data-[selected=true]:bg-pink-800/60',
	amber:
		'bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60 data-[selected=true]:bg-amber-200 dark:data-[selected=true]:bg-amber-800/60',
	red: 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/60 data-[selected=true]:bg-red-200 dark:data-[selected=true]:bg-red-800/60',
	indigo:
		'bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 data-[selected=true]:bg-indigo-200 dark:data-[selected=true]:bg-indigo-800/60',
	white:
		'bg-white dark:bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-200 data-[selected=true]:bg-gray-200 dark:data-[selected=true]:bg-gray-800',
} as const;

const FIXED_BOTTOM_SELECTED_CLASSES = {
	blue: 'bg-blue-200 dark:bg-blue-900/60',
	green: 'bg-green-200 dark:bg-green-900/60',
	purple: 'bg-purple-200 dark:bg-purple-900/60',
	orange: 'bg-orange-200 dark:bg-orange-900/60',
	pink: 'bg-pink-200 dark:bg-pink-900/60',
	amber: 'bg-amber-200 dark:bg-amber-900/60',
	red: 'bg-red-200 dark:bg-red-900/60',
	indigo: 'bg-indigo-200 dark:bg-indigo-900/60',
	white: 'bg-gray-200 dark:bg-gray-300',
} as const;

type ColorVariant = keyof typeof COLOR_CLASSES;

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
	/** Optional description text shown below the label */
	description?: string;
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
	/** Optional heading text for the group */
	heading?: string;
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
	/** Whether to show the latest message under the fixedBottomGroup */
	showLatestMessage?: boolean;
	/** Whether to use streaming for responses */
	stream?: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({
	open,
	contents,
	placeholder = 'Type a command or search...',
	className,
	onClose,
	collapsed: controlledCollapsed,
	onSearchChange,
	showLatestMessage = false,
	stream = true,
}) => {
	const [isFocused, setIsFocused] = React.useState(false);
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const commandListRef = React.useRef<HTMLDivElement>(null);
	const [baselineMessageIndex, setBaselineMessageIndex] = React.useState(-1);
	const messageHideTimerRef = React.useRef<NodeJS.Timeout | null>(null);
	const [forceShowLatestMessage, setForceShowLatestMessage] =
		React.useState(false);

	// Get messages for latest message display
	const { messages, isProcessing } = useMessages();

	// Get the latest non-user message for display
	const latestMessage = React.useMemo(() => {
		if (!showLatestMessage) return null;
		// Find the last non-user message of type text
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			if (message.role !== 'user' && message.type === 'text') {
				return message;
			}
		}
		return null;
	}, [messages, showLatestMessage]);

	// Check if there are any user messages between baseline and latest message
	const hasUserMessagesSinceBaseline = React.useMemo(() => {
		if (!latestMessage) return false;
		const latestMessageIndex = messages.findIndex(
			(m) => m.id === latestMessage.id
		);

		// Check if there are any user messages between baselineMessageIndex and latestMessageIndex
		for (let i = baselineMessageIndex + 2; i < latestMessageIndex; i++) {
			if (messages[i] && messages[i].role === 'user') {
				return true;
			}
		}
		return false;
	}, [latestMessage, messages, baselineMessageIndex]);

	// Check if the latest message is hidden by the baseline
	const isLatestMessageHidden = React.useMemo(() => {
		if (!latestMessage) return false;
		const messageIndex = messages.findIndex((m) => m.id === latestMessage.id);
		return messageIndex <= baselineMessageIndex || hasUserMessagesSinceBaseline;
	}, [
		latestMessage,
		messages,
		baselineMessageIndex,
		hasUserMessagesSinceBaseline,
	]);

	// Determine which message to show based on baseline and force display
	const messageToShow = React.useMemo(() => {
		if (!latestMessage) return null;
		// Show the message if it's not hidden by baseline OR if we're forcing display
		if (!isLatestMessageHidden || forceShowLatestMessage) {
			return latestMessage;
		}
		return null;
	}, [latestMessage, isLatestMessageHidden, forceShowLatestMessage]);

	// Determine what should be displayed in the message area
	const shouldShowProcessing = React.useMemo(() => {
		// Show processing if we're processing AND there's no message to show naturally (without forcing)
		return isProcessing && (!latestMessage || isLatestMessageHidden);
	}, [isProcessing, latestMessage, isLatestMessageHidden]);

	const shouldShowMessage = React.useMemo(() => {
		// Don't show message if we should show processing instead
		if (shouldShowProcessing) return false;
		// Show message if there's one to show (either naturally or forced)
		return !!messageToShow;
	}, [shouldShowProcessing, messageToShow]);

	// Auto-hide message after 10 seconds
	React.useEffect(() => {
		// Clear existing timer
		if (messageHideTimerRef.current) {
			clearTimeout(messageHideTimerRef.current);
			messageHideTimerRef.current = null;
		}

		// If there's a message to show, start a new timer
		if (latestMessage) {
			const timer = setTimeout(() => {
				// Hide the message by setting baseline to current message index
				const messageIndex = messages.findIndex(
					(m) => m.id === latestMessage.id
				);
				if (messageIndex !== -1) {
					setBaselineMessageIndex(messageIndex);
				}
			}, 5000); // 5 seconds

			messageHideTimerRef.current = timer;
		}

		// Cleanup on unmount
		return () => {
			if (messageHideTimerRef.current) {
				clearTimeout(messageHideTimerRef.current);
				messageHideTimerRef.current = null;
			}
		};
	}, [latestMessage, messages]);

	// Use Cedar editor for the input
	const { editor, getEditorText } = useCedarEditor({
		placeholder,
		onFocus: () => setIsFocused(true),
		onBlur: () => setIsFocused(false),
		onSubmit: (text, editor, clearEditor) => {
			console.log('onSubmit', text);
			// Set baseline to hide any existing messages immediately when user sends a message
			// Since the condition is `i > baselineMessageIndex`, we set it high enough to hide all current messages
			// Even after the user's message is added, this will ensure only new assistant responses are shown
			setBaselineMessageIndex(messages.length - 1);
			// Also clear any forced display of hidden messages
			setForceShowLatestMessage(false);
			// Note: CommandBar handles its own clearing when items are selected via handleItemSelect
			clearEditor?.();
		},
		onEnterOverride: (event) => {
			// Override Enter key handling if we have a selected item and conditions are met
			if (
				event.key === 'Enter' &&
				!event.ctrlKey && // Don't intercept ctrl+enter (let spells handle it)
				!event.altKey && // Don't intercept alt+enter (let spells handle it)
				!event.shiftKey && // Don't intercept shift+enter (let spells handle it)
				isFocused &&
				selectedIndex >= 0 &&
				allItemsForNavigation[selectedIndex]
			) {
				// Prevent editor's default Enter handling

				event.preventDefault();
				event.stopPropagation();
				setBaselineMessageIndex(messages.length - 1);
				const selectedItem = allItemsForNavigation[selectedIndex];
				handleItemSelect(selectedItem);
				if (!event.metaKey) {
					editor?.commands.clearContent();
				}
				return true; // Indicate that we handled the event
			}
			return false; // Let editor handle the event normally
		},
		stream,
	});

	// Use a ref to always get the current editor instance in callbacks
	const editorRef = React.useRef(editor);
	React.useEffect(() => {
		editorRef.current = editor;
	}, [editor]);

	// Collect all items with activation events
	const allItems: CommandBarItem[] = React.useMemo(
		() => [
			...contents.groups.flatMap((group) => group.items),
			...(contents.fixedBottomGroup?.items || []),
		],
		[contents]
	);

	// Create spell configurations for all items with activation events
	const spellConfigs = React.useMemo(() => {
		return allItems
			.filter((item) => item.activationEvent)
			.map((item) => ({
				id: `command-bar-${item.id}`,
				activationConditions: {
					events: [item.activationEvent!],
					mode: item.activationMode || ActivationModeEnum.TRIGGER,
				},
				onActivate: () => {
					if (open && !item.disabled) {
						item.onSelect();
						onClose?.();
						// Use ref to get current editor instance
						const currentEditor = editorRef.current;
						if (currentEditor) {
							currentEditor.commands.blur();
							currentEditor.commands.clearContent();
						}
					}
				},
				preventDefaultEvents: true,
				ignoreInputElements:
					item.ignoreInputElements ??
					shouldIgnoreInputElements(item.activationEvent!),
			}));
	}, [allItems, open, onClose]); // No editor dependency - we use ref instead

	// Register all command bar item spells using the new hook
	useMultipleSpells({ spells: spellConfigs });

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
					item.id.toLowerCase().includes(searchText) ||
					(item.description &&
						item.description.toLowerCase().includes(searchText))
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
			} else if (e.key === 'k' && (e.metaKey || e.ctrlKey) && open) {
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
				'fixed top-8 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-2xl',
				className
			)}>
			<motion.div
				className={cn(
					'rounded-lg border shadow-md overflow-hidden text-sm h-auto',
					className
				)}
				style={{ willChange: 'transform' }}
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
					}}
					onKeyDown={(e) => {
						// Only prevent cmdk's navigation when we're in the fixed bottom group
						if (
							isFocused &&
							(e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
							selectedIndex >= 0 &&
							allItemsForNavigation.length > 0
						) {
							const selectedItem = allItemsForNavigation[selectedIndex];
							const isInFixedBottomGroup =
								filteredContents.fixedBottomGroup?.items.some(
									(item) => item.id === selectedItem?.id
								);

							if (isInFixedBottomGroup) {
								// Let our custom navigation handle it for fixed bottom group
								e.preventDefault();
								e.stopPropagation();
							}
						}
					}}>
					<div className='flex w-full flex-col gap-2 px-3 py-2'>
						<div className='flex w-full items-center justify-between'>
							<ContextBadgeRow editor={editor} />
							{/* Caret button to show/hide latest message */}
							{latestMessage && (
								<motion.button
									onClick={() =>
										setForceShowLatestMessage(!forceShowLatestMessage)
									}
									className='flex-shrink-0 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									aria-label={
										forceShowLatestMessage
											? 'Hide latest message'
											: 'Show latest message'
									}>
									<motion.div
										animate={{ rotate: forceShowLatestMessage ? 180 : 0 }}
										transition={{ duration: 0.2, ease: 'easeInOut' }}>
										<ChevronDown className='w-4 h-4 text-muted-foreground' />
									</motion.div>
								</motion.button>
							)}
						</div>
						<div className='flex w-full items-center gap-2'>
							{!isFocused && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
									animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
									exit={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
									transition={{
										type: 'spring',
										stiffness: 400,
										damping: 25,
										mass: 0.5,
									}}>
									<KeyboardShortcut shortcut='⌘K' />
								</motion.div>
							)}
							<motion.div
								layoutId='chatInput'
								className='flex-1 justify-center'
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

										<CommandGroup
											{...(group.heading && { heading: group.heading })}>
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
														item.color &&
															COLOR_CLASSES[item.color as ColorVariant]
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
													<div className='flex-1'>
														<div className='text-sm font-medium'>
															{item.label}
														</div>
														{item.description && (
															<div className='text-xs text-muted-foreground'>
																{item.description}
															</div>
														)}
													</div>
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
						<div className='p-1'>
							<div className=''>
								{filteredContents.fixedBottomGroup.heading && (
									<div className='text-xs font-medium text-muted-foreground mb-2 px-2'>
										{filteredContents.fixedBottomGroup.heading}
									</div>
								)}
								<div className='flex gap-1'>
									{filteredContents.fixedBottomGroup.items.map((item) => (
										<button
											key={item.id}
											onMouseDown={() => {
												handleItemSelect(item);
											}}
											disabled={item.disabled}
											className={cn(
												'flex-1 flex items-center justify-between gap-1 p-2 rounded-md text-xs transition-colors cursor-pointer',
												'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
												item.disabled && 'opacity-50 cursor-not-allowed',
												// Default styling when no color is specified (match CommandItem)
												!item.color && 'hover:bg-muted hover:text-foreground',
												// Apply color-based styling if color is specified
												item.color && COLOR_CLASSES[item.color as ColorVariant],
												// Selection highlights
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													item.color &&
													FIXED_BOTTOM_SELECTED_CLASSES[
														item.color as ColorVariant
													],
												// Default selection highlight when no color is specified
												selectedIndex >= 0 &&
													allItemsForNavigation[selectedIndex]?.id ===
														item.id &&
													!item.color &&
													'bg-muted text-foreground'
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

					{/* Latest message display - with animation */}
					<AnimatePresence>
						{showLatestMessage &&
							(shouldShowMessage || shouldShowProcessing) && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: 'auto', opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{
										type: 'spring',
										stiffness: 300,
										damping: 30,
										mass: 0.8,
									}}
									style={{ overflow: 'hidden' }}
									className='border-t border-border'>
									<div className='px-3'>
										<div className='text-sm'>
											{shouldShowMessage && messageToShow && (
												<ChatRenderer message={messageToShow} />
											)}
											{shouldShowProcessing && (
												<div className='py-2'>
													<ShimmerText text='Thinking...' state='thinking' />
												</div>
											)}
										</div>
									</div>
								</motion.div>
							)}
					</AnimatePresence>
				</Command>
			</motion.div>
		</div>
	);
};

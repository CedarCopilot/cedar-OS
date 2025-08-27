import React from 'react';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
	CommandSeparator,
} from '@/ui/command';
import { cn, useCedarEditor } from 'cedar-os';
import { KeyboardShortcut } from '@/ui/KeyboardShortcut';
import { ContextBadgeRow } from '@/chatInput/ContextBadgeRow';
import { EditorContent } from '@tiptap/react';
import { motion } from 'motion/react';

export interface CommandBarItem {
	/** Unique identifier for the item */
	id: string;
	/** Display text for the item */
	label: string;
	/** Optional icon (emoji string or React node) */
	icon?: React.ReactNode;
	/** Callback when item is selected */
	onSelect: () => void;
	/** Optional keyboard shortcut display */
	shortcut?: string;
	/** Whether the item is disabled */
	disabled?: boolean;
	/** Optional custom search function to determine if item matches search text */
	searchFunction?: (searchText: string, item: CommandBarItem) => boolean;
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
	/** Message to show when no results are found */
	emptyMessage?: string;
	/** Additional CSS classes */
	className?: string;
	/** Callback when the command bar should close */
	onClose?: () => void;
	/** Whether the command bar is in collapsed state (only shows search bar) */
	collapsed?: boolean;
}

export const CommandBar: React.FC<CommandBarProps> = ({
	open,
	contents,
	placeholder = 'Type a command or search...',
	emptyMessage = 'No results found.',
	className,
	onClose,
	collapsed: controlledCollapsed,
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

	// Get the current search text
	const searchText = getEditorText().toLowerCase().trim();

	// Filter contents based on search text
	const filteredContents = React.useMemo(() => {
		if (!searchText) return contents;

		const filteredGroups = contents.groups
			.map((group) => {
				const filteredItems = group.items.filter((item) => {
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

				return {
					...group,
					items: filteredItems,
				};
			})
			.filter((group) => group.items.length > 0);

		// Filter fixed bottom group separately
		let filteredFixedBottomGroup: CommandBarGroup | undefined;
		if (contents.fixedBottomGroup) {
			const filteredItems = contents.fixedBottomGroup.items.filter((item) => {
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

			if (filteredItems.length > 0) {
				filteredFixedBottomGroup = {
					...contents.fixedBottomGroup,
					items: filteredItems,
				};
			}
		}

		return {
			groups: filteredGroups,
			fixedBottomGroup: filteredFixedBottomGroup,
		};
	}, [contents, searchText]);

	// Create a flattened list of all items for easier keyboard navigation
	const allItems = React.useMemo(() => {
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
		if (allItems.length > 0) {
			setSelectedIndex(0);
		} else {
			setSelectedIndex(-1);
		}
	}, [allItems]);

	// Determine if collapsed - controlled prop takes precedence, otherwise based on focus
	const isCollapsed =
		controlledCollapsed !== undefined ? controlledCollapsed : !isFocused;

	// Handle item selection
	const handleItemSelect = (item: CommandBarItem) => {
		if (!item.disabled) {
			item.onSelect();
			onClose?.();
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
				editor?.commands.focus();
			} else if (e.key === 'ArrowDown' && isFocused && allItems.length > 0) {
				e.preventDefault();
				setSelectedIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
			} else if (e.key === 'ArrowUp' && isFocused && allItems.length > 0) {
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
			} else if (
				e.key === 'Enter' &&
				isFocused &&
				selectedIndex >= 0 &&
				allItems[selectedIndex]
			) {
				e.preventDefault();
				const selectedItem = allItems[selectedIndex];
				handleItemSelect(selectedItem);
			}
		};

		if (open) {
			document.addEventListener('keydown', handleKeyDown);
		}

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [open, onClose, editor, isFocused, allItems, selectedIndex]);

	// Don't render if not open
	if (!open) return null;

	return (
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
					selectedIndex >= 0 && allItems[selectedIndex]
						? allItems[selectedIndex].id
						: ''
				}
				onValueChange={(value) => {
					// Find the index of the selected item
					const index = allItems.findIndex((item) => item.id === value);
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
							<CommandEmpty>{emptyMessage}</CommandEmpty>
							{filteredContents.groups.map((group, groupIndex) => (
								<React.Fragment key={group.id}>
									{/* Add separator between groups (except before first group) */}
									{groupIndex > 0 && <CommandSeparator />}

									<CommandGroup heading={group.heading}>
										{group.items.map((item) => (
											<CommandItem
												key={item.id}
												value={item.id}
												onSelect={() => handleItemSelect(item)}
												disabled={item.disabled}
												className={cn(
													'flex items-center gap-2',
													item.disabled && 'opacity-50 cursor-not-allowed'
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
												{item.shortcut && (
													<KeyboardShortcut shortcut={item.shortcut} />
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
						<CommandList>
							<CommandGroup heading={filteredContents.fixedBottomGroup.heading}>
								{filteredContents.fixedBottomGroup.items.map((item) => (
									<CommandItem
										key={item.id}
										value={item.id}
										onSelect={() => handleItemSelect(item)}
										disabled={item.disabled}
										className={cn(
											'flex items-center gap-2',
											item.disabled && 'opacity-50 cursor-not-allowed'
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
										{item.shortcut && (
											<KeyboardShortcut shortcut={item.shortcut} />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</div>
				)}
			</Command>
		</motion.div>
	);
};

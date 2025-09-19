import React, { useState } from 'react';
import {
	useThreadController,
	useCedarStore,
	cn,
	DEFAULT_THREAD_ID,
} from 'cedar-os';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Pencil, History, Trash } from 'lucide-react';
import { Button } from '@/ui/button';

interface ChatThreadControllerProps {
	className?: string;
	onThreadChange?: (threadId: string) => void;
	showCreateButton?: boolean;
	showThreadList?: boolean;
}

export const ChatThreadController: React.FC<ChatThreadControllerProps> = ({
	className,
	onThreadChange,
	showCreateButton = true,
	showThreadList = true,
}) => {
	const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
	const [editingName, setEditingName] = useState('');

	const {
		currentThreadId,
		threadIds,
		createThread,
		deleteThread,
		switchThread,
		updateThreadName,
	} = useThreadController();

	// Get thread details for display - select threadMap directly to avoid closure issues
	const threadMap = useCedarStore((state) => state.threadMap);

	// Derive threads from threadMap and threadIds outside the selector
	const threads = threadIds.map((id) => {
		const thread = threadMap[id];
		return {
			id,
			name: thread?.name,
			messageCount: thread?.messages.length || 0,
			lastMessage: thread?.messages?.filter((message) => message.content).pop(), // last message with content
			lastLoaded: thread?.lastLoaded,
			isDefault: id === DEFAULT_THREAD_ID,
		};
	});

	const handleCreateThread = () => {
		const newThreadId = createThread(undefined, 'New Thread');
		switchThread(newThreadId);
		onThreadChange?.(newThreadId);
	};

	const handleSelectThread = (threadId: string) => {
		switchThread(threadId);
		onThreadChange?.(threadId);
	};

	const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		deleteThread(threadId);
		// If we deleted the current thread, switch to default
		if (threadId === currentThreadId) {
			switchThread(DEFAULT_THREAD_ID);
		}
	};

	const handleEditThread = (
		threadId: string,
		currentName: string,
		e: React.MouseEvent
	) => {
		e.stopPropagation();
		setEditingThreadId(threadId);
		setEditingName(currentName);
	};

	const handleSaveEdit = (threadId: string) => {
		if (editingName.trim()) {
			updateThreadName(threadId, editingName.trim());
		}
		setEditingThreadId(null);
		setEditingName('');
	};

	const handleCancelEdit = () => {
		setEditingThreadId(null);
		setEditingName('');
	};

	const currentThread = threads.find((t) => t.id === currentThreadId);
	const currentThreadName = currentThread?.isDefault
		? 'Default Thread'
		: currentThread?.name || `Thread ${currentThreadId.slice(0, 8)}`;

	return (
		<div className={cn('flex items-center gap-1', className)}>
			{showCreateButton && (
				<Button
					onClick={handleCreateThread}
					variant='ghost'
					title='New Thread'
					aria-label='Create new thread'>
					<svg
						width='16'
						height='16'
						viewBox='0 0 24 24'
						fill='none'
						stroke='currentColor'
						strokeWidth='2'>
						<line x1='12' y1='5' x2='12' y2='19'></line>
						<line x1='5' y1='12' x2='19' y2='12'></line>
					</svg>
				</Button>
			)}

			{showThreadList && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							className='flex items-center gap-1'
							variant='ghost'
							title={`Current: ${currentThreadName}`}
							aria-label='Thread history'>
							<History size={16} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='end' className='w-56 p-1'>
						{threads.map(
							({ id, name, messageCount, lastMessage, isDefault }) => (
								<DropdownMenuItem
									key={id}
									className={cn(
										'cursor-pointer px-2 py-1.5 rounded-sm transition-colors text-xs',
										currentThreadId === id
											? 'bg-blue-600/20 focus:bg-blue-600/20 hover:bg-blue-600/20 data-[highlighted]:bg-blue-600/20'
											: 'focus:bg-accent hover:bg-accent/30 data-[highlighted]:bg-accent'
									)}
									onSelect={() => handleSelectThread(id)}>
									<div className='flex justify-between items-center w-full gap-2'>
										<div className='flex-1 min-w-0'>
											<div className='flex items-center gap-2'>
												{editingThreadId === id ? (
													<input
														type='text'
														value={editingName}
														onChange={(e) => setEditingName(e.target.value)}
														onBlur={() => handleSaveEdit(id)}
														onKeyDown={(e) => {
															if (e.key === 'Enter') {
																e.preventDefault();
																handleSaveEdit(id);
															}
															if (e.key === 'Escape') {
																e.preventDefault();
																handleCancelEdit();
															}
														}}
														className='bg-transparent border-b border-blue-500 outline-none flex-1 min-w-0'
														autoFocus
														onClick={(e) => e.stopPropagation()}
													/>
												) : (
													<div className='truncate font-medium'>
														{isDefault
															? 'Default Thread'
															: name || `Thread ${id.slice(0, 8)}`}
													</div>
												)}
												<div className='text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full flex-shrink-0'>
													{messageCount}
												</div>
											</div>
											{lastMessage && (
												<div className='text-muted-foreground mt-0.5 truncate'>
													{lastMessage.content.slice(0, 35)}
													{lastMessage.content.length > 35 && '...'}
												</div>
											)}
										</div>
										{!isDefault && (
											<div className='flex items-center gap-1'>
												<button
													onClick={(e) =>
														handleEditThread(
															id,
															name || `Thread ${id.slice(0, 8)}`,
															e
														)
													}
													className='text-muted-foreground hover:text-blue-600 text-sm leading-none flex-shrink-0 p-1 hover:bg-blue-100 rounded-sm transition-colors'
													aria-label='Edit thread name'>
													<Pencil className='h-3 w-3' />
												</button>
												<button
													onClick={(e) => handleDeleteThread(id, e)}
													className='text-muted-foreground hover:text-destructive text-sm leading-none flex-shrink-0 p-1 hover:bg-destructive/10 rounded-sm transition-colors'
													aria-label='Delete thread'>
													<Trash className='h-3 w-3' />
												</button>
											</div>
										)}
									</div>
								</DropdownMenuItem>
							)
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
};

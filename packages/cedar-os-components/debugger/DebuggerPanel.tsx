import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { useCedarStore, cn } from 'cedar-os';
import Container3D from '@/containers/Container3D';
import { NetworkTab } from './NetworkTab';
import { MessagesTab } from './MessagesTab';
import { StatesTab } from './StatesTab';
import type { DebugLogEntry, Message } from './types';
import {
	Bug,
	X,
	Network,
	MessageSquare,
	Database,
	Trash2,
	RefreshCw,
	GripHorizontal,
} from 'lucide-react';

interface DebuggerPanelProps {
	/** Initial position of the panel */
	initialPosition?: { x: number; y: number };
	/** Optional class name */
	className?: string;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
	initialPosition = { x: window.innerWidth - 80, y: 20 },
	className,
}) => {
	const store = useCedarStore();
	const [isExpanded, setIsExpanded] = useState(false);
	const [activeTab, setActiveTab] = useState('network');
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [position] = useState(initialPosition);

	// Panel dimensions state - hardcoded defaults
	const [panelWidth, setPanelWidth] = useState(500);
	const [panelHeight, setPanelHeight] = useState(350);

	// Hardcoded minimum and maximum sizes
	const minWidth = 350;
	const minHeight = 250;
	const calculatedMaxWidth =
		typeof window !== 'undefined' ? window.innerWidth * 0.8 : 1000;
	const calculatedMaxHeight =
		typeof window !== 'undefined' ? window.innerHeight * 0.8 : 800;

	// Resize state
	const [isResizing, setIsResizing] = useState<
		null | 'width' | 'height' | 'both' | 'bottom-left' | 'bottom-right'
	>(null);
	const dragStartX = useRef(0);
	const dragStartY = useRef(0);
	const dragStartWidth = useRef(0);
	const dragStartHeight = useRef(0);

	// Drag controls for both collapsed and expanded states
	const dragControls = useDragControls();
	const constraintsRef = useRef<HTMLDivElement>(null);

	// Get debugger data from store
	const agentConnectionLogs =
		(store.agentConnectionLogs as DebugLogEntry[]) || [];
	const messages = (store.messages as Message[]) || [];
	const isDebugEnabled = (store.isDebugEnabled as boolean) ?? true;

	// Get all Cedar registered states
	const registeredStates = store.registeredStates || {};

	// Resize handlers
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing) return;

			let newWidth = panelWidth;
			let newHeight = panelHeight;

			if (
				isResizing === 'width' ||
				isResizing === 'both' ||
				isResizing === 'bottom-left' ||
				isResizing === 'bottom-right'
			) {
				let deltaX = e.clientX - dragStartX.current;

				// For bottom-left corner, invert the deltaX since dragging left should increase width
				if (isResizing === 'bottom-left') {
					deltaX = -deltaX;
				}

				newWidth = Math.max(
					minWidth,
					Math.min(calculatedMaxWidth, dragStartWidth.current + deltaX)
				);
				setPanelWidth(newWidth);
			}

			if (
				isResizing === 'height' ||
				isResizing === 'both' ||
				isResizing === 'bottom-left' ||
				isResizing === 'bottom-right'
			) {
				// For bottom corners, dragging down increases height
				const deltaY = e.clientY - dragStartY.current;
				newHeight = Math.max(
					minHeight,
					Math.min(calculatedMaxHeight, dragStartHeight.current + deltaY)
				);
				setPanelHeight(newHeight);
			}
		},
		[
			isResizing,
			minWidth,
			minHeight,
			calculatedMaxWidth,
			calculatedMaxHeight,
			panelWidth,
			panelHeight,
		]
	);

	const handleMouseUp = useCallback(() => {
		setIsResizing(null);
		if (typeof document !== 'undefined') {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			document.body.style.webkitUserSelect = '';
		}
	}, []);

	useEffect(() => {
		if (isResizing) {
			if (typeof document !== 'undefined') {
				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
				document.body.style.userSelect = 'none';
				document.body.style.webkitUserSelect = 'none';

				if (isResizing === 'width') document.body.style.cursor = 'col-resize';
				if (isResizing === 'height') document.body.style.cursor = 'row-resize';
				if (
					isResizing === 'both' ||
					isResizing === 'bottom-left' ||
					isResizing === 'bottom-right'
				)
					document.body.style.cursor = 'nwse-resize';
			}
		}
		return () => {
			if (typeof document !== 'undefined') {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}, [isResizing, handleMouseMove, handleMouseUp]);

	const startResize = (
		direction: 'width' | 'height' | 'both' | 'bottom-left' | 'bottom-right',
		e: React.MouseEvent
	) => {
		e.preventDefault();
		e.stopPropagation(); // Prevent drag from interfering
		setIsResizing(direction);
		dragStartX.current = e.clientX;
		dragStartY.current = e.clientY;
		dragStartWidth.current = panelWidth;
		dragStartHeight.current = panelHeight;
	};

	const handleCopy = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const handleClearLogs = () => {
		if (store.clearDebugLogs) {
			store.clearDebugLogs();
		}
	};

	const handleToggleDebug = () => {
		if (store.setDebugEnabled) {
			store.setDebugEnabled(!isDebugEnabled);
		}
	};

	// Calculate proper panel position when expanding to keep it on screen
	const getExpandedPanelPosition = () => {
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
		const margin = 20;

		// Try to center on button position, but constrain to viewport
		let x = position.x - panelWidth / 2;
		let y = position.y - panelHeight / 2;

		// Keep within bounds
		x = Math.max(margin, Math.min(x, windowWidth - panelWidth - margin));
		y = Math.max(margin, Math.min(y, windowHeight - panelHeight - margin));

		return { x, y };
	};

	const expandedPosition = getExpandedPanelPosition();

	return (
		<>
			{/* Constraints container */}
			<motion.div
				ref={constraintsRef}
				className='fixed inset-0 pointer-events-none'
				style={{ zIndex: 9998 }}
			/>

			<AnimatePresence mode='wait'>
				{!isExpanded ? (
					// Collapsed state - Container3D button
					<motion.div
						key='collapsed'
						drag
						dragControls={dragControls}
						dragConstraints={constraintsRef}
						dragElastic={0}
						dragMomentum={false}
						initial={{ scale: 0, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0, opacity: 0 }}
						transition={{ type: 'spring', damping: 20, stiffness: 300 }}
						style={{
							position: 'fixed',
							x: position.x,
							y: position.y,
							zIndex: 9999,
							width: 48,
							height: 48,
						}}
						className={cn('cursor-move select-none', className)}>
						<div
							className='relative cursor-pointer hover:scale-105 active:scale-95 transition-transform'
							onClick={() => setIsExpanded(true)}>
							<Container3D className='w-12 h-12 flex items-center justify-center'>
								<Bug className='w-4 h-4' />
							</Container3D>
							{/* Notification badges */}
							{agentConnectionLogs.length > 0 && (
								<div className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center'>
									<span className='text-white text-xs font-bold'>
										{Math.min(agentConnectionLogs.length, 99)}
									</span>
								</div>
							)}
						</div>
					</motion.div>
				) : (
					// Expanded state - full panel
					<motion.div
						key='expanded'
						drag
						dragControls={dragControls}
						dragConstraints={constraintsRef}
						dragElastic={0.2}
						dragMomentum={false}
						dragListener={false}
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.8, opacity: 0 }}
						transition={{ type: 'spring', damping: 20, stiffness: 300 }}
						style={{
							position: 'fixed',
							x: expandedPosition.x,
							y: expandedPosition.y,
							zIndex: 9999,
							width: panelWidth,
							height: panelHeight,
						}}
						className={cn(
							'bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700',
							'flex flex-col',
							className
						)}>
						{/* Draggable Header */}
						<div
							className='flex items-center justify-between px-2 py-1 border-b border-gray-200 dark:border-gray-700 cursor-move select-none'
							onPointerDown={(e) => dragControls.start(e)}
							style={{ touchAction: 'none' }}>
							<div className='flex items-center gap-1.5'>
								<GripHorizontal className='w-3 h-3 text-gray-400' />
								<Bug className='w-3.5 h-3.5 text-purple-600 dark:text-purple-400' />
								<span className='font-medium text-xs'>Cedar Debugger</span>
								<div
									className={cn(
										'px-1.5 py-0.5 rounded-full text-xs',
										isDebugEnabled
											? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
											: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
									)}>
									{isDebugEnabled ? 'Active' : 'Paused'}
								</div>
							</div>
							<div className='flex items-center gap-1'>
								<button
									onClick={handleToggleDebug}
									className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
									title={
										isDebugEnabled ? 'Pause debugging' : 'Resume debugging'
									}>
									<RefreshCw
										className={cn(
											'w-3 h-3',
											isDebugEnabled && 'text-green-600 dark:text-green-400'
										)}
									/>
								</button>
								<button
									onClick={handleClearLogs}
									className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
									title='Clear all logs'>
									<Trash2 className='w-3 h-3' />
								</button>
								<button
									onClick={() => setIsExpanded(false)}
									className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'>
									<X className='w-3 h-3' />
								</button>
							</div>
						</div>

						{/* Tabs Content */}
						<Tabs
							value={activeTab}
							onValueChange={setActiveTab}
							className='flex-1 flex flex-col overflow-hidden'>
							<TabsList className='mx-2 mt-1 w-[calc(100%-1rem)] grid grid-cols-3 h-8'>
								<TabsTrigger
									value='network'
									className='flex items-center gap-1 text-xs py-1 px-2'>
									<Network className='w-3 h-3' />
									Network
									{agentConnectionLogs.length > 0 && (
										<span className='ml-0.5 px-1 py-0.5 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none'>
											{agentConnectionLogs.length}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger
									value='messages'
									className='flex items-center gap-1 text-xs py-1 px-2'>
									<MessageSquare className='w-3 h-3' />
									Messages
									{messages.length > 0 && (
										<span className='ml-0.5 px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none'>
											{messages.length}
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger
									value='states'
									className='flex items-center gap-1 text-xs py-1 px-2'>
									<Database className='w-3 h-3' />
									States
									{Object.keys(registeredStates).length > 0 && (
										<span className='ml-0.5 px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full min-w-[16px] h-4 flex items-center justify-center leading-none'>
											{Object.keys(registeredStates).length}
										</span>
									)}
								</TabsTrigger>
							</TabsList>

							<div className='flex-1 overflow-hidden'>
								<TabsContent value='network' className='h-full'>
									<NetworkTab
										logs={agentConnectionLogs}
										onCopy={handleCopy}
										copiedId={copiedId}
									/>
								</TabsContent>
								<TabsContent value='messages' className='h-full'>
									<MessagesTab
										messages={messages}
										onCopy={handleCopy}
										copiedId={copiedId}
									/>
								</TabsContent>
								<TabsContent value='states' className='h-full'>
									<StatesTab
										states={registeredStates}
										onCopy={handleCopy}
										copiedId={copiedId}
									/>
								</TabsContent>
							</div>
						</Tabs>

						{/* Resize handles for bottom corners */}
						<>
							{/* Bottom-left corner handle */}
							<div
								className='absolute bottom-0 left-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-400/30 group'
								onMouseDown={(e) => startResize('bottom-left', e)}></div>

							{/* Bottom-right corner handle */}
							<div
								className='absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-blue-400/30 group'
								onMouseDown={(e) => startResize('bottom-right', e)}></div>

							{/* Bottom edge handle for height only */}
							<div
								className='absolute bottom-0 left-4 right-4 h-1 cursor-row-resize hover:bg-blue-400/30'
								onMouseDown={(e) => startResize('height', e)}
							/>

							{/* Right edge handle for width only */}
							<div
								className='absolute top-12 bottom-4 right-0 w-1 cursor-col-resize hover:bg-blue-400/30'
								onMouseDown={(e) => startResize('width', e)}
							/>
						</>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
};

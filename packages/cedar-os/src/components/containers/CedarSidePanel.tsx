import { CollapsedButton } from '@/components/chatMessages/structural/CollapsedChatButton';
import { Button } from '@/components/ui/button';
import Container3D from '@/components/containers/Container3D';
import { cn } from '@/styles/stylingUtils';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { GradientMesh } from '@/components/ornaments/GradientMesh';

interface CedarSidePanelProps {
	children?: React.ReactNode;
	className?: string;
	title?: string;
	isActive?: boolean;
	setIsActive?: (active: boolean) => void;
	side?: 'left' | 'right';
	companyLogo?: React.ReactNode;
}

export const CedarSidePanel: React.FC<CedarSidePanelProps> = ({
	children,
	className,
	title = 'Side Panel',
	isActive = false,
	setIsActive = () => {},
	side = 'right',
	companyLogo,
}) => {
	const panelRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [panelWidth, setPanelWidth] = useState(600); // Default width in pixels
	const [dragStartX, setDragStartX] = useState(0);
	const [dragStartWidth, setDragStartWidth] = useState(0);
	// State to track panel position and size for the resize handle
	const [panelRect, setPanelRect] = useState<{ top: number; height: number }>({
		top: 0,
		height: 0,
	});

	// Detect if the viewport is mobile sized (<= 640px)
	const [isMobile, setIsMobile] = useState(false);

	useLayoutEffect(() => {
		const checkIsMobile = () => {
			setIsMobile(window.innerWidth <= 640);
		};
		checkIsMobile();
		window.addEventListener('resize', checkIsMobile);
		return () => window.removeEventListener('resize', checkIsMobile);
	}, []);

	// Drag handlers
	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsDragging(true);
			setDragStartX(e.clientX);
			setDragStartWidth(panelWidth);
		},
		[panelWidth]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return;

			const deltaX =
				side === 'right' ? dragStartX - e.clientX : e.clientX - dragStartX;
			const maxWidth = window.innerWidth * 0.6;
			const newWidth = Math.max(
				300,
				Math.min(maxWidth, dragStartWidth + deltaX)
			);
			setPanelWidth(newWidth);
		},
		[isDragging, dragStartX, dragStartWidth, side]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Measure panel position and size for resize handle when active
	useLayoutEffect(() => {
		if (isActive && panelRef.current) {
			const updateRect = () => {
				const rect = panelRef.current!.getBoundingClientRect();
				setPanelRect({ top: rect.top, height: rect.height });
			};
			updateRect();
			window.addEventListener('resize', updateRect);
			return () => window.removeEventListener('resize', updateRect);
		}
	}, [isActive, className, side]);

	// Global mouse event listeners for dragging
	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			document.body.style.cursor = 'col-resize';
			document.body.style.userSelect = 'none';
			// Prevent text selection during drag
			document.body.style.webkitUserSelect = 'none';

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
				document.body.style.webkitUserSelect = '';
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Effect to handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Check if user is currently typing in an input, textarea, or contenteditable element
			const target = e.target as HTMLElement;
			const targetIsInput =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.getAttribute('contenteditable') === 'true';

			// Don't handle keyboard events if typing in another input that's not our side panel
			if (targetIsInput && !target.closest('.cedar-sidepanel-container'))
				return;

			// Handle escape key to close the panel
			if (e.key === 'Escape') {
				e.preventDefault();
				setIsActive(false);
				return;
			}
		};

		// Add the event listener
		window.addEventListener('keydown', handleKeyDown);

		// Clean up
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [isActive, setIsActive]);

	// Handler for closing the panel
	const handleClose = () => {
		setIsActive(false);
	};

	return (
		<div className='cedar-sidepanel-container w-full'>
			{/* Content area - full width when panel closed */}
			<div
				className='min-h-screen'
				style={{
					paddingLeft:
						!isMobile && isActive && side === 'left'
							? `${Math.min(panelWidth, window.innerWidth * 0.6)}px`
							: '0',
					paddingRight:
						!isMobile && isActive && side === 'right'
							? `${Math.min(panelWidth, window.innerWidth * 0.6)}px`
							: '0',
				}}>
				{children}
			</div>

			{/* Animate panel and collapsed button */}
			<AnimatePresence initial={false}>
				{/* Side panel */}
				{isActive && (
					<motion.div
						key='sidepanel'
						ref={panelRef}
						className={cn('fixed top-0 h-full flex flex-col z-[60]', className)}
						style={{
							width: isMobile
								? '100vw'
								: Math.min(panelWidth, window.innerWidth * 0.6),
							maxWidth: isMobile ? '100vw' : '60vw',
							minWidth: isMobile ? '100vw' : '300px',
							left: isMobile ? '0' : side === 'left' ? '0' : 'auto',
							right: isMobile ? '0' : side === 'right' ? '0' : 'auto',
						}}
						initial={{ x: 0, opacity: 0 }}
						animate={{ x: 0, opacity: 1 }}
						exit={{ x: side === 'left' ? '-100%' : '100%', opacity: 1 }}
						transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
						<Container3D className='flex flex-col h-full overflow-hidden'>
							{/* Header */}
							<GradientMesh />
							<div className='flex-shrink-0 z-20 flex flex-row items-center justify-between p-4 min-w-0 pb-2'>
								<div className='flex items-center min-w-0 flex-1'>
									{companyLogo && (
										<div className='flex-shrink-0 w-6 h-6 mr-2'>
											{companyLogo}
										</div>
									)}
									<span className='font-bold text-lg truncate '>{title}</span>
								</div>
								<div className='flex items-center gap-2 flex-shrink-0 h-8'>
									<Button
										className='p-1'
										onClick={handleClose}
										aria-label='Close panel'>
										<X className='h-3.5 w-3.5' strokeWidth={2.5} />
									</Button>
								</div>
							</div>

							{/* Content */}
							<div className='flex-1 flex flex-col z-10 relative min-h-0 overflow-hidden'>
								<div className='flex-1 min-h-0 px-4'>{children}</div>
							</div>
						</Container3D>
					</motion.div>
				)}

				{/* Collapsed button */}
				{!isActive && (
					<motion.div
						key='collapsed'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, ease: 'easeInOut' }}
						className='fixed bottom-4 right-4 flex'>
						<CollapsedButton
							side={side as 'left' | 'right'}
							label={title}
							onClick={() => setIsActive(true)}
							layoutId='collapsed-sidepanel-button'
							position='absolute'
						/>
					</motion.div>
				)}
			</AnimatePresence>
			{/* Resize handle - only when open */}
			{isActive && !isMobile && (
				<div
					className='fixed w-1 bg-transparent hover:bg-blue-200 cursor-col-resize z-[9998]'
					style={{
						top: panelRect.top,
						height: panelRect.height,
						left:
							side === 'left'
								? `${Math.min(panelWidth, window.innerWidth * 0.6)}px`
								: 'auto',
						right:
							side === 'right'
								? `${Math.min(panelWidth, window.innerWidth * 0.6)}px`
								: 'auto',
						backgroundColor: isDragging ? '#FFBFE9' : 'transparent',
					}}
					onMouseDown={handleMouseDown}>
					<div
						className='absolute inset-0 w-4 cursor-col-resize'
						style={{
							left: side === 'left' ? '-1.5rem' : '0',
							right: side === 'right' ? '-1.5rem' : '0',
						}}></div>
					<div className='absolute inset-0 group-hover:bg-gray-300 transition-colors duration-200'></div>
				</div>
			)}
		</div>
	);
};

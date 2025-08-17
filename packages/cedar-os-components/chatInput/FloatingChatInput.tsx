'use client';

import React, { useEffect, useRef } from 'react';
import { ChatInput } from './ChatInput';
import { cn } from 'cedar-os';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface FloatingChatInputProps {
	/** Position to display the input */
	position: { x: number; y: number };
	/** Callback when input should close */
	onClose: () => void;
	/** Whether to use streaming for responses */
	stream?: boolean;
	/** Optional width for the input */
	width?: number;
	/** Optional class name */
	className?: string;
	/** Auto-focus the input on mount */
	autoFocus?: boolean;
}

export const FloatingChatInput: React.FC<FloatingChatInputProps> = ({
	position,
	onClose,
	stream = true,
	width = 400,
	className,
	autoFocus = true,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isFocused, setIsFocused] = React.useState(autoFocus);

	// Handle click outside to close
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(event.target as Node)
			) {
				// Don't close immediately if clicking on the tooltip menu
				const target = event.target as HTMLElement;
				if (!target.closest('[role="menu"]')) {
					onClose();
				}
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		// Add listeners after a small delay to prevent immediate closing
		const timer = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleEscape);
		}, 100);

		return () => {
			clearTimeout(timer);
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [onClose]);

	// Calculate position to keep input on screen
	const adjustedPosition = React.useMemo(() => {
		const padding = 10;
		let x = position.x - width / 2; // Center horizontally
		let y = position.y + 10; // 10px below the position

		// Keep within viewport bounds
		x = Math.max(padding, Math.min(x, window.innerWidth - width - padding));
		y = Math.max(padding, Math.min(y, window.innerHeight - 200 - padding)); // Assume ~200px height

		return { x, y };
	}, [position, width]);

	return (
		<AnimatePresence>
			<motion.div
				ref={containerRef}
				initial={{ opacity: 0, scale: 0.95, y: -10 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.95, y: -10 }}
				transition={{ duration: 0.15, ease: 'easeOut' }}
				style={{
					position: 'fixed',
					left: adjustedPosition.x,
					top: adjustedPosition.y,
					width,
					zIndex: 10001, // Higher than tooltip menu
				}}
				className={cn(
					'bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700',
					'backdrop-blur-sm',
					className
				)}>
				{/* Header with close button */}
				<div className='flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700'>
					<span className='text-xs text-gray-500 dark:text-gray-400 font-medium'>
						Quick Chat
					</span>
					<button
						onClick={onClose}
						className='p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors'
						aria-label='Close'>
						<X size={14} className='text-gray-500 dark:text-gray-400' />
					</button>
				</div>

				{/* Chat input */}
				<div className='p-2'>
					<ChatInput
						handleFocus={() => setIsFocused(true)}
						handleBlur={() => setIsFocused(false)}
						isInputFocused={isFocused}
						stream={stream}
						className='bg-gray-50 dark:bg-gray-800/50'
					/>
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

export default FloatingChatInput;

import { ShimmerText } from '@/text/ShimmerText';
import { cn, useCedarStore } from 'cedar-os';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import ChatRenderer from './ChatRenderer';

interface ChatBubblesProps {
	maxHeight?: string; // e.g., "300px", "60vh", or undefined for flex-1
	className?: string; // Additional classes for the container
}

export const ChatBubbles: React.FC<ChatBubblesProps> = ({
	maxHeight,
	className = '',
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const isProcessing = useCedarStore((state) => state.isProcessing);
	const messages = useCedarStore((state) => state.messages);

	// Immediate scroll to bottom on initial render (before paint)
	useLayoutEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, []);

	// Scroll to bottom when messages change
	useEffect(() => {
		if (containerRef.current) {
			containerRef.current.scrollTo({
				top: containerRef.current.scrollHeight,
				behavior: 'smooth',
			});
		}
	}, [messages]);

	// Function to check if a message is consecutive (same sender as previous)
	const isConsecutiveMessage = (index: number): boolean => {
		if (index === 0) return false;
		return messages[index].role === messages[index - 1].role;
	};

	// Determine container classes based on maxHeight with proper className merging
	const containerClasses = maxHeight
		? cn('overflow-x-hidden overflow-y-auto px-3', className)
		: cn('flex-1 overflow-x-hidden overflow-y-auto min-h-0 px-3', className);

	const containerStyle = maxHeight
		? { height: maxHeight, contain: 'paint layout' }
		: { contain: 'paint layout' };

	return (
		<div
			ref={containerRef}
			className={cn(
				'w-full h-full mb-0 flex flex-col space-y-1 pb-3 relative',
				containerClasses
			)}
			style={{
				...containerStyle,
				// Custom scrollbar styles for Firefox
				scrollbarColor: 'rgba(156, 163, 175, 0.8) transparent',
			}}>
			{/* Messages container */}
			<div className='relative z-20 px-1 py-1'>
				<AnimatePresence initial={false}>
					{messages.map((message, index) => (
						<motion.div
							key={message.id}
							initial={{
								opacity: 0,
								y: 20,
								filter: 'blur(4px)',
							}}
							animate={{
								opacity: 1,
								y: 0,
								filter: 'blur(0px)',
							}}
							transition={{
								duration: 0.15,
								ease: 'easeOut',
							}}
							className={`flex ${
								message.role === 'user' ? 'justify-end' : 'justify-start'
							} ${isConsecutiveMessage(index) ? 'mt-1' : 'mt-2'}`}>
							<ChatRenderer message={message} />
						</motion.div>
					))}
					{isProcessing && (
						<div className='py-2'>
							<ShimmerText text='Thinking...' state='thinking' />
						</div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default ChatBubbles;

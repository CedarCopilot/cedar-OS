import { useCedarStore, desaturateColor, cn } from 'cedar-os';
import ChatRenderer from './ChatRenderer';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useLayoutEffect, useRef } from 'react';

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
	const styling = useCedarStore((state) => state.styling);
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
		? cn('overflow-x-hidden overflow-y-auto px-4', className)
		: cn('flex-1 overflow-x-hidden overflow-y-auto min-h-0 px-4', className);

	const containerStyle = maxHeight
		? { height: maxHeight, contain: 'paint layout' }
		: { contain: 'paint layout' };

	return (
		<div
			ref={containerRef}
			className={cn(
				'w-full h-full mb-0 flex flex-col space-y-1 pb-3 relative scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent',
				containerClasses
			)}
			style={containerStyle}>
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
						<motion.div
							key='typing-indicator'
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							layout
							className='px-2 flex justify-start my-4'>
							<div
								className='py-1 px-1 rounded-lg text-sm rounded-tl-sm'
								style={{
									backgroundColor: desaturateColor(styling.color || '#f1f5f9'),
									color: styling.accentColor || '#000000',
								}}>
								<div className='flex space-x-1'>
									<div className='w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse'></div>
									<div className='w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse delay-100'></div>
									<div className='w-1.5 h-1.5 rounded-full bg-gray-500 animate-pulse delay-200'></div>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default ChatBubbles;

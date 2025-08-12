'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useStyling } from '@/store/CedarStore';
import { createPortal } from 'react-dom';

export interface DialogueBoxProps {
	text: string;
	style?: React.CSSProperties;
	advanceMode: 'auto' | 'external' | 'default' | number | (() => boolean);
	onComplete: () => void;
	blocking?: boolean; // When true, creates an overlay to block clicks outside the dialogue
}

const DialogueBox: React.FC<DialogueBoxProps> = ({
	text,
	style,
	advanceMode,
	onComplete,
	blocking = false,
}) => {
	const { styling } = useStyling();
	const [displayedText, setDisplayedText] = useState('');
	const [isTypingComplete, setIsTypingComplete] = useState(false);
	const typingSpeed = 30; // ms per character
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Determine behavior based on advanceMode
	const isAuto = advanceMode === 'auto';
	const isNumericDelay = typeof advanceMode === 'number';
	const isFunctionMode = typeof advanceMode === 'function';
	const delayDuration = isNumericDelay ? advanceMode : 3000; // Default 3s delay for 'auto'

	// Call advanceMode function on initialization if it's a function
	useEffect(() => {
		// Only set up interval if we have a function mode
		if (!isFunctionMode) return;

		// First, check immediately
		const shouldAdvance = (advanceMode as () => boolean)();
		if (shouldAdvance) {
			// If function returns true, complete the dialogue immediately
			onComplete();
			return; // Exit early, no need to set up interval
		}

		// Set up interval to periodically check the condition (every 500ms)
		const checkInterval = setInterval(() => {
			// Call the function and check if we should advance
			const shouldAdvance = (advanceMode as () => boolean)();
			if (shouldAdvance) {
				// If function returns true, complete the dialogue
				onComplete();
				// Clear the interval once we've advanced
				clearInterval(checkInterval);
			}
		}, 500); // Check every 500ms

		// Clean up when component unmounts
		return () => {
			clearInterval(checkInterval);
		};
	}, [isFunctionMode, advanceMode, onComplete]);

	// Handle typing animation effect
	useEffect(() => {
		let currentIndex = 0;
		const typingInterval = setInterval(() => {
			if (currentIndex < text.length) {
				setDisplayedText(text.substring(0, currentIndex + 1));
				currentIndex++;
			} else {
				clearInterval(typingInterval);
				setIsTypingComplete(true);

				// When typing completes, handle auto advance
				if (isAuto || isNumericDelay) {
					// Clear any existing timeout
					if (timeoutRef.current) {
						clearTimeout(timeoutRef.current);
					}

					// Set timeout to advance after the specified delay
					timeoutRef.current = setTimeout(() => {
						onComplete();
					}, delayDuration);
				}
			}
		}, typingSpeed);

		return () => {
			clearInterval(typingInterval);
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [text, advanceMode, onComplete, isAuto, isNumericDelay, delayDuration]);

	// Handler for advancing the dialogue
	const handleAdvanceDialogue = () => {
		if (isTypingComplete && advanceMode === 'default') {
			onComplete();
		}
	};

	// Global click handler for screen
	useEffect(() => {
		// Only add the event listener when typing is complete and advanceMode is 'default'
		if (isTypingComplete && advanceMode === 'default') {
			window.addEventListener('click', handleAdvanceDialogue);
		}

		return () => {
			window.removeEventListener('click', handleAdvanceDialogue);
		};
	}, [isTypingComplete, advanceMode, onComplete]);

	// Define the box shadow style similar to ClickableArea
	const boxShadowStyle = `0 0 0 2px white, 0 0 0 4px ${styling.color || '#FFBFE9'}, 0 0 30px rgba(255, 255, 255, 0.8)`;

	// Function to safely render the icon component
	const renderIconComponent = () => {
		// If iconComponent doesn't exist, return null
		if (!styling.iconComponent) {
			return null;
		}

		// Create a wrapper component for the icon
		return (
			<motion.div
				className='absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-lg overflow-hidden'
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ delay: 0.3, type: 'spring' }}
				style={{
					border: `2px solid ${styling.color || '#FFBFE9'}`,
					boxShadow: `0 0 10px ${styling.color ? styling.color + '80' : 'rgba(255, 191, 233, 0.5)'}`,
				}}>
				{React.isValidElement(styling.iconComponent)
					? styling.iconComponent
					: null}
			</motion.div>
		);
	};

	// Create the combined content that will be placed in the portal
	const dialogueContent = (
		<>
			{/* Blocking overlay to prevent interactions outside the dialogue */}
			{blocking && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 0.2 }}
					transition={{ duration: 0.2 }}
					className='fixed inset-0 bg-black z-[9000] pointer-events-auto'
					onClick={(e: React.MouseEvent) => {
						// Allow clicks on the overlay to advance the dialogue
						if (isTypingComplete && advanceMode === 'default') {
							e.preventDefault();
							e.stopPropagation();
							handleAdvanceDialogue();
						}
					}}
					aria-hidden='true'
				/>
			)}

			<motion.div
				className='fixed inset-0 flex items-end justify-center z-[9001] bottom-10 pointer-events-none'
				initial={{ opacity: 0, y: 30, scale: 0.95 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				exit={{ opacity: 0, y: 30, scale: 0.95 }}
				transition={{
					type: 'spring',
					stiffness: 300,
					damping: 25,
				}}
				style={{
					...style,
					fontFamily: 'system-ui, sans-serif',
					color:
						(styling.tooltipStyle === 'lined'
							? styling.textColor
							: styling.color) || '#000',
				}}>
				<div
					className='bg-white max-w-[650px] w-[90%] rounded-xl p-7 relative pointer-events-auto'
					style={{
						boxShadow: boxShadowStyle,
					}}
					onClick={(e) => {
						// Prevent click from propagating to window
						e.stopPropagation();
						// If typing is complete and mode is default, complete dialogue
						if (isTypingComplete && advanceMode === 'default') {
							handleAdvanceDialogue();
						}
					}}>
					{/* Static size container that establishes dimensions based on full text */}
					<div className='relative'>
						{/* Hidden full text to establish exact dimensions */}
						<div
							className='text-lg leading-relaxed invisible w-full'
							aria-hidden='true'>
							{text}
						</div>

						{/* Visible animated text positioned absolutely within the sized container */}
						<div className='text-lg leading-relaxed absolute top-0 left-0 w-full'>
							{displayedText}
						</div>
					</div>

					{/* Continue indicator */}
					{isTypingComplete && advanceMode === 'default' && (
						<motion.div
							className='mt-6 text-right text-sm opacity-80'
							animate={{ opacity: [0.4, 1, 0.4] }}
							transition={{ repeat: Infinity, duration: 1.5 }}>
							Click anywhere to continue...
						</motion.div>
					)}

					{/* Custom icon component or default decorative accent */}
					{styling.iconComponent &&
					React.isValidElement(styling.iconComponent) ? (
						renderIconComponent()
					) : (
						<motion.div
							className='absolute -top-3 -left-3 w-10 h-10 rounded-full'
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ delay: 0.3, type: 'spring' }}
							style={{
								backgroundColor: styling.color || '#FFBFE9',
								boxShadow: '0 0 0 2px white',
							}}
						/>
					)}
				</div>
			</motion.div>
		</>
	);

	// Use createPortal to insert both elements directly into the document body
	return typeof window !== 'undefined'
		? createPortal(dialogueContent, document.body)
		: null;
};

export default DialogueBox;

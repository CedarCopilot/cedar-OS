'use client';

import gsap from 'gsap';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { useStyling } from '@/store/CedarStore';

interface CedarCursorProps {
	isRedirected: boolean;
	messages?: string[]; // Add support for custom messages
	onAnimationComplete?: () => void;
	cursorColor?: string; // Add support for custom cursor color
	blocking?: boolean; // Add blocking overlay support
}

export function CedarCursor({
	isRedirected,
	messages = ['Oh...', 'Is this an investor I see?', 'Enter Secret Demo'], // Default messages
	onAnimationComplete,
	cursorColor = '#FFBFE9', // Default color - pink
	blocking = false, // Default to non-blocking
}: CedarCursorProps) {
	const cursorRef = useRef<HTMLDivElement>(null);
	const textRef = useRef<HTMLDivElement>(null);
	const particlesRef = useRef<HTMLDivElement>(null);
	const cursorCtx = useRef<gsap.Context | null>(null);
	const [isAnimationComplete, setIsAnimationComplete] = useState(false);
	const [fadeOut, setFadeOut] = useState(false);
	// const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });

	// ---------------------------------------------------------------------
	// Tooltip-like styling (reuse values from global styling context)
	// ---------------------------------------------------------------------
	const { styling } = useStyling();

	// Derive styling values mimicking TooltipText.tsx
	const bgColor = styling?.color || cursorColor;
	const textColor = styling?.textColor || '#FFFFFF';
	const tooltipStyle = styling?.tooltipStyle || 'solid';
	const tooltipFontSize = styling?.tooltipSize || 'sm';

	const fontSizeClassMap: Record<string, string> = {
		xs: 'text-xs',
		sm: 'text-sm',
		base: 'text-base',
		lg: 'text-lg',
		xl: 'text-xl',
		'2xl': 'text-2xl',
	};
	const fontSizeClass = fontSizeClassMap[tooltipFontSize] ?? 'text-sm';

	const boxShadowValue =
		tooltipStyle === 'lined'
			? `0 0 8px 2px ${bgColor}80, 0 4px 6px -1px rgba(0,0,0,0.1)`
			: `0 0 2px 1px ${bgColor}30, 0 2px 4px -1px rgba(0,0,0,0.1)`;

	const tooltipBg = tooltipStyle === 'lined' ? 'white' : bgColor;
	const tooltipBorderColor = tooltipStyle === 'lined' ? bgColor : 'white';

	// Base style applied to the floating text element
	const baseTextStyle: React.CSSProperties = {
		opacity: 0,
		transform: 'translate(-50%, -100%)',
		willChange: 'transform',
		position: 'fixed',
		zIndex: 2147483647,
		backgroundColor: tooltipBg,
		color: textColor,
		borderColor: tooltipBorderColor,
		boxShadow: boxShadowValue,
		padding: '6px 10px',
		borderRadius: '9999px',
	};

	// Calculate duration based on message length
	const calculateDuration = (message: string): number => {
		// Based on reading speed: ~30 characters per second
		// Minimum duration from 0.5s
		const baseTime = 0.5;
		const charTime = message.length / 30;
		return Math.max(baseTime, charTime);
	};

	// Generate random size for the cursor
	const getRandomSize = (): number => {
		// Random number between 1.8 and 2.8 for more constrained size variation
		return 1.8 + Math.random() * 1.0;
	};

	// Get a subtle size change (smaller variance)
	const getSubtleChange = (currentSize: number): number => {
		// Add or subtract a smaller amount (0.2 to 0.4) from current size for more subtle changes
		const change = 0.2 + Math.random() * 0.2;
		// 50% chance to grow or shrink
		return Math.random() > 0.5
			? Math.min(currentSize + change, 2.8)
			: Math.max(currentSize - change, 1.8);
	};

	// // Create a "talking" animation sequence that simulates speech with size variations
	// const createTalkingAnimation = (
	// 	timeline: gsap.core.Timeline,
	// 	cursor: HTMLElement,
	// 	message: string,
	// 	baseSize: number // Base size parameter to maintain expanded size
	// ) => {
	// 	// Calculate syllables for a more natural speech pattern
	// 	const wordCount = message.split(' ').length;
	// 	const characterCount = message.replace(/\s/g, '').length;
	// 	// Estimate syllables - roughly one per 2-3 characters plus extra for longer words
	// 	const syllableEstimate = Math.max(characterCount / 2.5, wordCount * 2);
	// 	const movements = Math.ceil(syllableEstimate); // At least one movement per estimated syllable

	// 	// Create a sequence of size changes to simulate natural speech
	// 	for (let i = 0; i < movements; i++) {
	// 		// Determine if this is a primary (larger) or secondary (smaller) syllable
	// 		const isPrimarySyllable = i % 3 === 0 || Math.random() > 0.6; // Every 3rd syllable or 40% random chance

	// 		// Create varied size increases - larger for primary syllables, smaller for secondary
	// 		const sizeIncrease = isPrimarySyllable
	// 			? baseSize * (1.15 + Math.random() * 0.15) // Primary: 15-30% larger (1.15-1.30)
	// 			: baseSize * (1.05 + Math.random() * 0.08); // Secondary: 5-13% larger (1.05-1.13)

	// 		// Add a "talking" animation that preserves the circular shape
	// 		timeline
	// 			// Expand to simulate "speaking"
	// 			.to(cursor, {
	// 				scale: sizeIncrease, // Uniform scaling to preserve circle shape
	// 				duration: 0.15 + Math.random() * 0.1, // Varied expansion speed (0.15-0.25s)
	// 				ease: 'power2.out', // Slightly accelerating out
	// 			})
	// 			// Contract back to near the base size
	// 			.to(cursor, {
	// 				scale: baseSize * (0.95 + Math.random() * 0.05), // Slightly under baseSize (0.95-1.0)
	// 				duration: 0.1 + Math.random() * 0.1, // Varied contraction speed (0.1-0.2s)
	// 				ease: 'power1.in', // Slightly accelerating in
	// 			});

	// 		// Add varied pauses between size changes
	// 		if (i < movements - 1) {
	// 			// Determine if we need a brief pause (syllable) or longer pause (word break)
	// 			const isWordBreak = Math.random() > 0.7; // About 30% chance of a word break

	// 			timeline.to(
	// 				{},
	// 				{
	// 					duration: isWordBreak
	// 						? 0.2 + Math.random() * 0.2 // Word break: 0.2-0.4s pause
	// 						: 0.05 + Math.random() * 0.1, // Syllable: 0.05-0.15s pause
	// 				}
	// 			);
	// 		}
	// 	}

	// 	// Final restoration to exactly baseSize
	// 	timeline.to(cursor, {
	// 		scale: baseSize,
	// 		duration: 0.15,
	// 		ease: 'power1.out',
	// 	});

	// 	return timeline;
	// };

	// Handle cursor movement
	useEffect(() => {
		const cursor = cursorRef.current;
		const text = textRef.current;
		if (!cursor || !text) return;

		const onMouseMove = (e: MouseEvent) => {
			// Store cursor position for particles
			// setCursorPosition({ x: e.clientX, y: e.clientY });

			// Apply position directly to match exact cursor position
			cursor.style.left = `${e.clientX}px`;
			cursor.style.top = `${e.clientY}px`;

			// Position the text tooltip directly above the cursor with direct CSS positioning
			// Center it horizontally and position it above the cursor
			text.style.left = `${e.clientX}px`;
			text.style.top = `${e.clientY - 40}px`; // Increased from 40px to 50px for better spacing
		};

		document.body.style.cursor = 'none';

		window.addEventListener('mousemove', onMouseMove);
		return () => {
			window.removeEventListener('mousemove', onMouseMove);
			document.body.style.cursor = 'auto';
		};
	}, []);

	// Handle redirect animation sequence
	useEffect(() => {
		const cursor = cursorRef.current;
		const text = textRef.current;
		if (!cursor || !text) return;

		cursorCtx.current?.revert();
		cursorCtx.current = gsap.context(() => {
			const tl = gsap.timeline({
				onComplete: () => {
					setIsAnimationComplete(true);
					setFadeOut(true);
					// Fix for single message issue: If there's just one message,
					// ensure we call onAnimationComplete to avoid getting stuck
					if (messages.length === 1 && onAnimationComplete) {
						onAnimationComplete();
					}
				},
			});

			// Initial pause - now 2 seconds
			tl.to({}, { duration: 1.5 });

			// Track cursor size to allow for relative changes
			let currentCursorSize = 1;

			// Create animation sequence for each message
			messages.forEach((message, index) => {
				// Calculate message display duration based on length
				const messageDuration = calculateDuration(message);
				// Random size for initial cursor growth
				const initialSize = getRandomSize();
				currentCursorSize = initialSize;

				// For first message
				if (index === 0) {
					tl.to(cursor, {
						scale: initialSize,
						duration: 0.5,
						ease: 'elastic.out(1, 0.5)',
					})
						.set(text, {
							innerHTML: message,
							backgroundColor: tooltipBg,
							borderColor: tooltipBorderColor,
							color: textColor,
						})
						.to(text, {
							opacity: 1,
							scale: 1,
							duration: 0.5,
							padding: '4px 8px',
							borderRadius: '9999px',
							ease: 'power2.out',
							onComplete: () => {
								text.style.setProperty('opacity', '1', 'important');
							},
						});

					// Create a nested timeline for talking animation
					const talkingTl = gsap.timeline();
					// Pass the initialSize to maintain the expanded cursor
					// createTalkingAnimation(talkingTl, cursor, message, initialSize);

					// Add the talking animation to the main timeline
					tl.add(talkingTl, '+=0.1');

					// Add 1-2 subtle size changes during text display (reduced from 2-3)
					const numChanges = 1 + Math.floor(Math.random() * 2);
					const changeInterval = messageDuration / (numChanges + 1);

					for (let i = 0; i < numChanges; i++) {
						const newSize = getSubtleChange(currentCursorSize);
						currentCursorSize = newSize;

						tl.to(
							cursor,
							{
								scale: newSize,
								duration: 0.3,
								ease: 'power1.inOut',
							},
							`+=${changeInterval}`
						);
					}

					// Add remaining pause time
					tl.to({}, { duration: changeInterval });
				}
				// For middle messages - interleave cursor and text animations
				else if (index < messages.length - 1) {
					// Fade out previous text
					tl.to(text, {
						opacity: 0,
						scale: 0.8,
						duration: 0.3,
						ease: 'power2.in',
					})
						// Animate cursor between messages (with varied size change)
						.to(cursor, {
							scale: 1.8 + Math.random() * 0.4, // More constrained transition size
							duration: 0.3,
							ease: 'power2.in',
						})
						// Set new message text while it's invisible
						.set(text, {
							innerHTML: message,
							backgroundColor: tooltipBg,
							borderColor: tooltipBorderColor,
							color: textColor,
						})
						// Scale up cursor with elastic effect (to random size)
						.to(cursor, {
							scale: initialSize,
							duration: 0.5,
							ease: 'elastic.out(1, 0.5)',
						})
						// Bring in the new text
						.to(text, {
							opacity: 1,
							scale: 1.2,
							duration: 0.5,
							padding: '4px 8px',
							borderRadius: '9999px',
							backgroundColor: tooltipBg,
							borderColor: tooltipBorderColor,
							color: textColor,
							ease: 'power2.out',
						});

					// Create a nested timeline for talking animation
					const talkingTl = gsap.timeline();
					// Pass the initialSize to maintain the expanded cursor
					// createTalkingAnimation(talkingTl, cursor, message, initialSize);

					// Add the talking animation to the main timeline
					tl.add(talkingTl, '+=0.1');

					// Add 1-2 subtle size changes during text display (reduced from 2-4)
					const numChanges = 1 + Math.floor(Math.random() * 2);
					const changeInterval = messageDuration / (numChanges + 1);

					for (let i = 0; i < numChanges; i++) {
						const newSize = getSubtleChange(currentCursorSize);
						currentCursorSize = newSize;

						tl.to(
							cursor,
							{
								scale: newSize,
								duration: 0.3,
								ease: 'power1.inOut',
							},
							`+=${changeInterval}`
						);
					}

					// Add remaining pause time
					tl.to({}, { duration: changeInterval });
				}
				// For the last message (transform to button)
				else {
					// Fade out previous text
					tl.to(text, {
						opacity: 0,
						scale: 0.8,
						duration: 0.3,
						ease: 'power2.in',
					})
						// Animate cursor between messages (with varied size)
						.to(cursor, {
							scale: 1.8 + Math.random() * 0.4, // More constrained transition size
							duration: 0.3,
							ease: 'power2.in',
						})
						// Set new message text while it's invisible
						.set(text, {
							innerHTML: message,
							backgroundColor: tooltipBg,
							borderColor: tooltipBorderColor,
							color: textColor,
						})
						// Scale up cursor for final message (to random size)
						.to(cursor, {
							scale: 2.0 + Math.random() * 0.6, // More constrained between 2.0 and 2.6
							duration: 0.5,
							ease: 'elastic.out(1, 0.5)',
						})
						// Show the final message with styling
						.to(text, {
							opacity: 1,
							color: textColor,
							padding: '6px 10px',
							borderRadius: '9999px',
							boxShadow: boxShadowValue,
							backgroundColor: tooltipBg,
							borderColor: tooltipBorderColor,
							scale: 1.2,
							duration: 0.5,
							ease: 'power2.out',
						});

					// Create a nested timeline for talking animation for the final message
					const talkingTl = gsap.timeline();
					// Use the larger final size for the last message
					// const finalSize = 2.0 + Math.random() * 0.6;
					// createTalkingAnimation(talkingTl, cursor, message, finalSize);

					// Add the talking animation to the main timeline
					tl.add(talkingTl, '+=0.1');

					// Add 2-3 subtle size changes during final message (reduced from 3-5)
					const numChanges = 2 + Math.floor(Math.random() * 2);
					const changeInterval = messageDuration / (numChanges + 1);

					for (let i = 0; i < numChanges; i++) {
						const newSize = getSubtleChange(currentCursorSize);
						currentCursorSize = newSize;

						tl.to(
							cursor,
							{
								scale: newSize,
								duration: 0.3,
								ease: 'power1.inOut',
							},
							`+=${changeInterval}`
						);
					}

					// Add remaining time, then fade out
					tl.to({}, { duration: changeInterval })
						// Add fade-out animation
						.to(text, {
							opacity: 0,
							y: -20,
							duration: 0.8,
							ease: 'power2.in',
						})
						.to(cursor, {
							scale: 1.2, // Slightly expand before popping
							duration: 0.15,
							ease: 'power1.out',
						})
						.to(cursor, {
							scale: 0,
							opacity: 0,
							duration: 0.15,
							ease: 'power4.in', // Sharper easing for more "pop" feeling
						})
						.to({}, { duration: 0.5 }) // Add half-second delay
						.call(() => onAnimationComplete?.());
				}
			});
		});

		return () => cursorCtx.current?.revert();
	}, [
		messages,
		onAnimationComplete,
		cursorColor,
		tooltipBg,
		tooltipBorderColor,
		textColor,
		boxShadowValue,
	]);

	// Handle global click to redirect - only when isAnimationComplete and isRedirected are true
	useEffect(() => {
		if (!isAnimationComplete || !isRedirected) return;

		const handleClick = () => {
			// Open in a new tab instead of using router
			window.open('/forecast', '_blank', 'noopener,noreferrer');
		};

		window.addEventListener('click', handleClick);
		return () => {
			window.removeEventListener('click', handleClick);
		};
	}, [isAnimationComplete, isRedirected]);

	return (
		<>
			<style>{`
				* {
					cursor: none !important;
				}
				::selection {
					background: ${cursorColor}33 !important; /* 20% opacity */
					color: inherit !important;
				}
				
				/* Force cursor to top layer */
				.cedar-cursor-overlay {
					position: fixed !important;
					top: 0 !important;
					left: 0 !important;
					width: 100vw !important;
					height: 100vh !important;
					pointer-events: none !important;
					z-index: 2147483647 !important;
				}
				
				/* Particle animation */
				@keyframes particleFade {
					0% { opacity: 1; transform: scale(1) translate(-50%, -50%); }
					100% { opacity: 0; transform: scale(0) translate(-50%, -50%); }
				}
			`}</style>

			{/* Blocking overlay */}
			{blocking &&
				typeof window !== 'undefined' &&
				createPortal(
					<motion.div
						initial={{ opacity: 0.2 }}
						animate={{ opacity: fadeOut ? 0 : 0.2 }}
						transition={{ duration: 0.2 }}
						className='fixed'
						style={{
							position: 'fixed',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							width: '100vw',
							height: '100vh',
							zIndex: 9990,
							pointerEvents: 'auto',
							backgroundColor: 'black',
						}}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
						}}
						aria-hidden='true'
					/>,
					document.body
				)}

			{/* Added wrapper div with max z-index to create new stacking context */}
			<div className='cedar-cursor-overlay'>
				<div
					id='cedar-cursor'
					ref={cursorRef}
					className={`fixed rounded-full pointer-events-none`}
					style={{
						transform: 'translate(-50%, -50%) !important',
						willChange: 'transform !important',
						boxShadow: `0 0 10px ${cursorColor}80, 0 0 20px ${cursorColor}4D !important`,
						background: `${cursorColor} !important`,
						position: 'fixed',
						zIndex: '2147483647 !important' /* Maximum z-index */,
						height: '12px',
						width: '12px',
						backgroundColor: cursorColor,
						borderRadius: '9999px',
					}}
				/>
				<div
					ref={textRef}
					className={`fixed font-semibold pointer-events-none whitespace-normal border-2 rounded-lg shadow-lg ${fontSizeClass}`}
					style={baseTextStyle}>
					{/* Initial message content - GSAP will update this during animation sequence */}
					{messages[0]}
				</div>
				{/* Container for particle effects */}
				<div
					ref={particlesRef}
					className='fixed pointer-events-none'
					style={{
						position: 'fixed',
						zIndex: '2147483647 !important',
					}}
				/>
			</div>
		</>
	);
}

'use client';

import React, { useEffect, useState } from 'react';
import { animate, motion } from 'motion/react';
import { useStyling } from 'cedar-os';
import MarkdownRenderer from '../chatMessages/MarkdownRenderer';

interface TypewriterTextProps {
	text: string;
	className?: string;
	/**
	 * Base character delay in seconds. If set to default (0.025), adaptive speed will be used.
	 * @default 0.025
	 */
	charDelay?: number;
	/**
	 * Minimum character delay for very long texts (fastest typing speed)
	 * @default 0.002
	 */
	minCharDelay?: number;
	/**
	 * Maximum character delay for short texts (slowest typing speed)
	 * @default 0.04
	 */
	maxCharDelay?: number;
	showCursor?: boolean;
	onTypingStart?: () => void;
	onTypingComplete?: () => void;
	blinking?: boolean;
	renderAsMarkdown?: boolean;
	prefix?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
	text,
	className = '',
	charDelay = 0.025,
	minCharDelay = 0.002,
	maxCharDelay = 0.04,
	showCursor = true,
	onTypingStart,
	onTypingComplete,
	blinking = false,
	renderAsMarkdown = true,
	prefix = '',
}) => {
	const fullText = prefix ? `${prefix}${text}` : text;

	// Calculate adaptive character delay based on text length
	// Longer texts type faster, but respect min/max limits
	const calculateAdaptiveDelay = () => {
		const textLength = fullText.length;

		// Use provided charDelay if it's explicitly set different from default
		if (charDelay !== 0.03) {
			return charDelay;
		}

		// Use an exponential decay function for smooth speed transition
		// This creates a natural feeling acceleration for longer texts
		const minLength = 30; // Texts shorter than this use max delay
		const maxLength = 400; // Texts longer than this use min delay

		if (textLength <= minLength) {
			return maxCharDelay;
		}

		if (textLength >= maxLength) {
			return minCharDelay;
		}

		// Exponential decay between min and max length
		// This gives us a smooth curve that starts slow and speeds up naturally
		const normalizedPosition =
			(textLength - minLength) / (maxLength - minLength);

		// Use exponential function for more natural feeling
		// Using a lower exponent (1.2) for more aggressive speed increase
		const speedFactor = Math.pow(normalizedPosition, 1.2);

		// Interpolate between max and min delay
		const adaptiveDelay =
			maxCharDelay - (maxCharDelay - minCharDelay) * speedFactor;

		return adaptiveDelay;
	};

	const effectiveCharDelay = calculateAdaptiveDelay();
	const totalDuration = effectiveCharDelay * fullText.length;
	const [displayedText, setDisplayedText] = useState('');
	const [isTypingComplete, setIsTypingComplete] = useState(false);

	const { styling } = useStyling();

	useEffect(() => {
		setIsTypingComplete(false);
		setDisplayedText('');
		onTypingStart?.();
		const animation = animate(0, fullText.length, {
			duration: totalDuration,
			ease: 'linear',
			onUpdate: (latest) => {
				setDisplayedText(fullText.slice(0, Math.ceil(latest)));
			},
			onComplete: () => {
				setIsTypingComplete(true);
				onTypingComplete?.();
			},
		});

		return () => animation.stop();
	}, [fullText, effectiveCharDelay]);

	// Process the displayed text to handle prefix
	let processedText = displayedText;

	// If we have a prefix and it's being displayed, wrap it in a special marker for the markdown processor
	if (prefix && displayedText.length > 0) {
		const prefixLength = prefix.length;
		if (displayedText.length <= prefixLength) {
			// Still typing the prefix
			processedText = `@@PREFIX@@${displayedText}@@ENDPREFIX@@`;
		} else {
			// Prefix is complete, show rest of content
			processedText = `@@PREFIX@@${prefix}@@ENDPREFIX@@${displayedText.slice(
				prefixLength
			)}`;
		}
	}

	const content = renderAsMarkdown ? (
		<MarkdownRenderer
			content={processedText}
			processPrefix={!!prefix}
			inline={true}
		/>
	) : (
		processedText
	);

	return (
		<span className={`max-w-full ${className}`}>
			<motion.span className='whitespace-normal inline'>
				{content}
				{showCursor && !isTypingComplete && (
					<motion.span
						className='inline-block w-[2px] h-[1em] align-middle'
						style={{ backgroundColor: styling.color, willChange: 'opacity' }}
						// This makes the cursor blink.
						animate={blinking ? { opacity: [1, 1, 0, 0] } : undefined}
						transition={
							blinking
								? {
										duration: 1,
										repeat: Infinity,
										times: [0, 0.5, 0.5, 1],
								  }
								: undefined
						}
					/>
				)}
			</motion.span>
		</span>
	);
};

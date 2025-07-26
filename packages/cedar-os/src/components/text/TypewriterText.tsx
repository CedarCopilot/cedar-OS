'use client';

import React, { useEffect, useState } from 'react';
import { animate, motion } from 'motion/react';
import { useStyling } from '@/store/CedarStore';

interface TypewriterTextProps {
	text: string;
	className?: string;
	charDelay?: number;
	showCursor?: boolean;
	onTypingStart?: () => void;
	onTypingComplete?: () => void;
	blinking?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
	text,
	className = '',
	charDelay = 0.03,
	showCursor = true,
	onTypingStart,
	onTypingComplete,
	blinking = false,
}) => {
	const totalDuration = charDelay * text.length;
	const [displayedText, setDisplayedText] = useState('');
	const [isTypingComplete, setIsTypingComplete] = useState(false);

	const { styling } = useStyling();

	useEffect(() => {
		setIsTypingComplete(false);
		setDisplayedText('');
		onTypingStart?.();
		const animation = animate(0, text.length, {
			duration: totalDuration,
			ease: 'linear',
			onUpdate: (latest) => {
				setDisplayedText(text.slice(0, Math.ceil(latest)));
			},
			onComplete: () => {
				setIsTypingComplete(true);
				onTypingComplete?.();
			},
		});

		return () => animation.stop();
	}, [text, charDelay]);

	return (
		<span className={`inline max-w-full ${className}`}>
			<motion.span className='whitespace-normal'>
				{displayedText}
				{showCursor && !isTypingComplete && (
					<motion.span
						className='inline-block w-[2px] h-[1em] ml-1'
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

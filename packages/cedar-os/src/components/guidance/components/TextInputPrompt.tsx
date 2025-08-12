'use client';

import React, { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { getCursorPosition } from '@/components/guidance/utils/positionUtils';
import { SPRING_CONFIGS } from '@/components/guidance/utils/constants';
import BorderInsetContainer from '@/components/ui/BorderInsetContainer';

interface TextInputPromptProps {
	placeholder?: string;
	onComplete: (value: string | null) => void;
}

/**
 * TextInputPrompt renders a small input that follows the user's cursor.
 *
 * • The element is positioned directly above the cursor and updates its
 *   position every animation-frame.
 * • Press ⏎ will submit the current value with a green + fade animation.
 * • Press ⌫ on an empty field collapses the input with a shrink animation
 *   and aborts the action.
 */
const TextInputPrompt: React.FC<TextInputPromptProps> = ({
	placeholder,
	onComplete,
}) => {
	// ---------------------------------------------------------------------
	// Internal state -------------------------------------------------------
	const [value, setValue] = useState('');
	const [status, setStatus] = useState<'active' | 'submitted' | 'deleted'>(
		'active'
	);
	const [position, setPosition] = useState(getCursorPosition());
	const [inputWidth, setInputWidth] = useState<number>(10);

	const rafRef = useRef<number | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	// ---------------------------------------------------------------------
	// Cursor-follow logic --------------------------------------------------
	useEffect(() => {
		// Autofocus on mount
		inputRef.current?.focus();

		const updatePosition = () => {
			setPosition(getCursorPosition());
			rafRef.current = requestAnimationFrame(updatePosition);
		};

		// Start loop
		rafRef.current = requestAnimationFrame(updatePosition);
		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
		};
	}, []);

	// ---------------------------------------------------------------------
	// Dynamic sizing -------------------------------------------------------
	useEffect(() => {
		// Use scrollWidth for a cheap width approximation
		if (inputRef.current) {
			const min = 100;
			const padding = 0; // room for padding + caret
			const newWidth = Math.max(
				min,
				Math.ceil(inputRef.current.scrollWidth + padding)
			);
			setInputWidth(newWidth);
		}
	}, [value]);

	// ---------------------------------------------------------------------
	// Key handlers ---------------------------------------------------------
	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (status !== 'active') return;

		if (e.key === 'Enter') {
			setStatus('submitted');
			return;
		}

		if (e.key === 'Backspace' && value.length === 0) {
			setStatus('deleted');
		}
	};

	// Keep focus even after accidental clicks elsewhere
	const handleBlur = () => {
		// Small delay so that Enter submission still works
		setTimeout(() => inputRef.current?.focus(), 0);
	};

	// ---------------------------------------------------------------------
	// Animation complete handler ------------------------------------------
	const handleAnimationComplete = () => {
		if (status === 'submitted') {
			onComplete(value);
		} else if (status === 'deleted') {
			onComplete(null);
		}
	};

	// ---------------------------------------------------------------------
	// Render ---------------------------------------------------------------
	return (
		<motion.div
			style={{
				position: 'fixed',
				top: position.y,
				left: position.x,
				// transform: 'translate(-50%, -100%)', // bottom center alignment
				zIndex: 10000,
				pointerEvents: 'none',
			}}
			animate={
				status === 'active'
					? { scale: 1, opacity: 1 }
					: status === 'submitted'
					? { opacity: 0, scale: 1.05 }
					: { opacity: 0, scale: 0.8 }
			}
			transition={{
				...SPRING_CONFIGS.STANDARD,
				duration: 0.4,
				ease: 'easeInOut',
			}}
			onAnimationComplete={handleAnimationComplete}>
			<BorderInsetContainer
				interactive={false}
				className='pointer-events-auto' // allow typing
				style={{ width: inputWidth }}>
				<input
					ref={inputRef}
					autoFocus
					type='text'
					value={value}
					placeholder={placeholder}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={handleKeyDown}
					onBlur={handleBlur}
					className={`w-full bg-transparent px-3 py-1 text-sm outline-none
					text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
				/>
			</BorderInsetContainer>
		</motion.div>
	);
};

export default TextInputPrompt;

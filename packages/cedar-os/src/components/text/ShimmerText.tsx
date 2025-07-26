import { motion } from 'motion/react';
import React from 'react';
import { useStyling } from '@/store/CedarStore';
import { Hammer, Check, X, Brain } from 'lucide-react';

interface ShimmerTextProps {
	text: string;
	/** Progress state of the task */
	state: 'in_progress' | 'complete' | 'error' | 'thinking';
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({ text, state }) => {
	const isComplete = state === 'complete';
	const isError = state === 'error';
	const isThinking = state === 'thinking';
	const { styling } = useStyling();
	const isDark = styling.darkMode ?? false;

	const grey = isDark ? '#475569' : '#6B7280';
	const highlight = isDark ? '#FFFFFF' : '#000000';
	const errorColor = isDark ? '#DC2626' : '#EF4444';
	const stagger = 0.03;
	const duration = text.length * 0.13;

	// Choose icon based on status
	const IconComponent = isError
		? X
		: isComplete
		? Check
		: isThinking
		? Brain
		: Hammer;

	return (
		<div
			className='flex mx-0.5 items-center'
			aria-label={text}
			tabIndex={0}
			role='text'>
			<motion.span
				key='icon'
				className='mr-1'
				initial={{ color: isError ? errorColor : grey }}
				/* Only animate when in progress or thinking */
				animate={
					isComplete
						? { color: grey }
						: isError
						? { color: errorColor }
						: { color: [grey, grey, highlight, grey, grey] }
				}
				transition={
					isComplete || isError
						? undefined
						: {
								duration,
								repeat: Infinity,
								delay: 0,
								ease: 'easeInOut',
						  }
				}
				style={{ willChange: isComplete || isError ? undefined : 'color' }}>
				<IconComponent
					size={12}
					aria-label={
						isComplete
							? 'completed icon'
							: isError
							? 'error icon'
							: isThinking
							? 'thinking icon'
							: 'tool icon'
					}
				/>
			</motion.span>
			{text.split('').map((char, index) => (
				<motion.span
					key={index}
					className='whitespace-pre'
					initial={{ color: isError ? errorColor : grey }}
					animate={
						isComplete
							? { color: grey }
							: isError
							? { color: errorColor }
							: { color: [grey, grey, highlight, grey, grey] }
					}
					transition={
						isComplete || isError
							? undefined
							: {
									duration,
									repeat: Infinity,
									delay: (index + 1) * stagger,
									ease: 'easeInOut',
							  }
					}
					style={{
						willChange: isComplete || isError ? undefined : 'color',
					}}>
					{char}
				</motion.span>
			))}
		</div>
	);
};

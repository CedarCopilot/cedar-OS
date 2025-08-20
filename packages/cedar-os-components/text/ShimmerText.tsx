import { motion } from 'motion/react';
import React from 'react';
import { useStyling } from 'cedar-os';
import {
	Hammer,
	Check,
	X,
	Brain,
	ChevronDown,
	ChevronRight,
} from 'lucide-react';

interface ShimmerTextProps {
	text: string;
	/** Progress state of the task */
	state: 'in_progress' | 'complete' | 'error' | 'thinking' | 'eventWithPayload';
	/** Optional payload to display when in eventwithpayload mode */
	payload?: Record<string, unknown>;
}

export const ShimmerText: React.FC<ShimmerTextProps> = ({
	text,
	state,
	payload,
}) => {
	const [isExpanded, setIsExpanded] = React.useState(false);
	const [isHovered, setIsHovered] = React.useState(false);
	const isComplete = state === 'complete';
	const isError = state === 'error';
	const isThinking = state === 'thinking';
	const isEventWithPayload = state === 'eventWithPayload';
	const { styling } = useStyling();
	const isDark = styling.darkMode ?? false;

	const grey = isDark ? '#475569' : '#6B7280';
	const highlight = isDark ? '#FFFFFF' : '#000000';
	const errorColor = isDark ? '#DC2626' : '#EF4444';
	const stagger = 0.03;
	const duration = text.length * 0.13;

	// Choose icon based on status
	const getIcon = () => {
		if (isEventWithPayload && isHovered) {
			return isExpanded ? ChevronDown : ChevronRight;
		}
		if (isError) return X;
		if (isComplete) return Check;
		if (isThinking || isEventWithPayload) return Brain;
		return Hammer;
	};

	const IconComponent = getIcon();

	const handleIconClick = () => {
		if (isEventWithPayload && payload) {
			setIsExpanded(!isExpanded);
		}
	};

	return (
		<div className='w-full'>
			<div
				className='flex mx-0.5 items-center cursor-pointer'
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
				onClick={handleIconClick}
				aria-label={text}
				tabIndex={0}
				role='text'>
				<motion.span
					key={`icon-${state}`}
					className={`mr-1 ${
						isEventWithPayload && payload ? 'cursor-pointer' : ''
					}`}
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
						size={14}
						aria-label={
							isComplete
								? 'completed icon'
								: isError
								? 'error icon'
								: isThinking
								? 'thinking icon'
								: isEventWithPayload
								? isExpanded
									? 'collapse payload'
									: 'expand payload'
								: 'tool icon'
						}
					/>
				</motion.span>
				{text.split('').map((char, index) => (
					<motion.span
						key={`${state}-${index}`}
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
			{isEventWithPayload && payload && isExpanded && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					className='ml-5'>
					<pre className='text-xs rounded py-2 overflow-x-auto opacity-70'>
						{formatJson(payload)}
					</pre>
				</motion.div>
			)}
		</div>
	);
};

function formatJson(data: Record<string, unknown>): string {
	if (typeof data !== 'object' || data === null || Array.isArray(data)) {
		throw new Error('Input must be a non-null object');
	}

	const lines: string[] = [];

	for (const [key, value] of Object.entries(data)) {
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			for (const [subKey, subValue] of Object.entries(value)) {
				lines.push(`${key}.${subKey}: ${subValue}`);
			}
		} else {
			lines.push(`${key}: ${value}`);
		}
	}

	return lines.join('\n');
}

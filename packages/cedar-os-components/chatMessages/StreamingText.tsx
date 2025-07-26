import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';

interface StreamingTextProps {
	text: string;
	/** Optional class names for the wrapper */
	className?: string;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
	text,
	className = '',
}) => {
	// Store previously rendered text to detect new words
	const prevTextRef = useRef<string>('');
	// Array of rendered chunks
	const [elements, setElements] = useState<React.ReactNode[]>([]);
	// Running key counter to keep keys unique and stable
	const keyCounterRef = useRef<number>(0);

	useEffect(() => {
		const currentText = text;
		const prevText = prevTextRef.current;

		// Bail if nothing new
		if (currentText === prevText) return;

		// Determine newly streamed chunk
		const newChunk = currentText.slice(prevText.length);
		if (!newChunk) return;

		// Animate the entire new chunk at once
		const chunkEl = (
			<motion.span
				key={`chunk-${keyCounterRef.current++}`}
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ type: 'tween', duration: 0.8, ease: 'easeOut' }}
				style={{ willChange: 'transform, opacity' }}>
				{newChunk}
			</motion.span>
		);

		setElements((prev) => [...prev, chunkEl]);
		prevTextRef.current = currentText;
	}, [text]);

	return <span className={className}>{elements}</span>;
};

export default StreamingText;

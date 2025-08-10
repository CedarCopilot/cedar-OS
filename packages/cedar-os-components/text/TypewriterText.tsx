'use client';

import React, { useEffect, useState } from 'react';
import { animate, motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStyling } from 'cedar-os';

interface TypewriterTextProps {
	text: string;
	className?: string;
	charDelay?: number;
	showCursor?: boolean;
	onTypingStart?: () => void;
	onTypingComplete?: () => void;
	blinking?: boolean;
	renderAsMarkdown?: boolean;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
	text,
	className = '',
	charDelay = 0.03,
	showCursor = true,
	onTypingStart,
	onTypingComplete,
	blinking = false,
	renderAsMarkdown = true,
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

	const content = renderAsMarkdown ? (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			components={{
				// Force all block elements to be inline
				p: ({ children }) => <>{children}</>,
				div: ({ children }) => <>{children}</>,
				h1: ({ children }) => (
					<span className='text-2xl font-bold'>{children}</span>
				),
				h2: ({ children }) => (
					<span className='text-xl font-bold'>{children}</span>
				),
				h3: ({ children }) => (
					<span className='text-lg font-bold'>{children}</span>
				),
				h4: ({ children }) => (
					<span className='text-base font-bold'>{children}</span>
				),
				h5: ({ children }) => (
					<span className='text-sm font-bold'>{children}</span>
				),
				h6: ({ children }) => (
					<span className='text-xs font-bold'>{children}</span>
				),
				a: ({ children, href }) => (
					<a
						href={href}
						target='_blank'
						rel='noopener noreferrer'
						className='text-blue-500 hover:underline inline break-words cursor-pointer'>
						{children}
					</a>
				),
				img: ({ src, alt }) => (
					<img
						src={src}
						alt={alt || 'Image'}
						className='inline-block max-w-full h-auto rounded my-1'
						style={{ maxHeight: '200px' }}
						onError={(e) => {
							e.currentTarget.style.display = 'none';
						}}
					/>
				),
				code: ({ children, className }) => {
					const isInline = !className;
					return isInline ? (
						<code className='px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm inline break-words'>
							{children}
						</code>
					) : (
						<pre className='inline overflow-x-auto'>
							<code className={`${className} break-words`}>{children}</code>
						</pre>
					);
				},
				pre: ({ children }) => (
					<span className='inline block overflow-x-auto'>{children}</span>
				),
				strong: ({ children }) => (
					<strong className='font-bold inline'>{children}</strong>
				),
				em: ({ children }) => <em className='italic inline'>{children}</em>,
				ul: ({ children }) => <span className='inline'>{children}</span>,
				ol: ({ children }) => <span className='inline'>{children}</span>,
				li: ({ children }) => <span className='inline'>• {children} </span>,
				br: () => <span> </span>,
			}}>
			{displayedText}
		</ReactMarkdown>
	) : (
		displayedText
	);

	return (
		<span className={`inline max-w-full break-words ${className}`}>
			<motion.span className='inline whitespace-normal break-words'>
				<span className='inline break-words'>{content}</span>
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

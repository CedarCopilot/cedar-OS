'use client';

import React, { useEffect, useState, useRef } from 'react';
import Container3D from '@/components/ui/Container3D';
import GlowingMesh from '@/components/ui/GlowingMesh';

export interface DialogueBannerProps {
	/** Optional children content to display instead of typewriter text */
	children?: React.ReactNode;
	/** Optional text for typewriter or fallback if no children */
	text?: string;
	style?: React.CSSProperties;
	advanceMode?:
		| 'auto'
		| 'external'
		| 'default'
		| number
		| (() => boolean)
		| ((nextAction: () => void) => void);
	onComplete: () => void;
}

const DialogueBanner: React.FC<DialogueBannerProps> = ({
	text,
	children,
	style,
	advanceMode = 'default',
	onComplete,
}) => {
	const [displayedText, setDisplayedText] = useState('');
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const typingSpeed = 30;

	const isAuto = advanceMode === 'auto';
	const isNumericDelay = typeof advanceMode === 'number';
	const isFunctionPredicate =
		typeof advanceMode === 'function' &&
		(advanceMode as () => boolean).length === 0;
	const delayDuration = isNumericDelay ? (advanceMode as number) : 3000;

	useEffect(() => {
		if (!isFunctionPredicate) return;
		const predicate = advanceMode as () => boolean;
		if (predicate()) {
			onComplete();
			return;
		}
		const interval = setInterval(() => {
			if (predicate()) {
				onComplete();
				clearInterval(interval);
			}
		}, 500);
		return () => clearInterval(interval);
	}, [advanceMode, isFunctionPredicate, onComplete]);

	useEffect(() => {
		// Skip typing effect if children provided
		if (children) {
			return;
		}
		const sourceText = text ?? '';
		let index = 0;
		const interval = setInterval(() => {
			if (index < sourceText.length) {
				setDisplayedText(sourceText.substring(0, index + 1));
				index++;
			} else {
				clearInterval(interval);
				if (isAuto) {
					if (timeoutRef.current) clearTimeout(timeoutRef.current);
					timeoutRef.current = setTimeout(() => onComplete(), 5000);
				} else if (isNumericDelay) {
					if (timeoutRef.current) clearTimeout(timeoutRef.current);
					timeoutRef.current = setTimeout(() => onComplete(), delayDuration);
				}
			}
		}, typingSpeed);
		return () => {
			clearInterval(interval);
			if (timeoutRef.current) clearTimeout(timeoutRef.current);
		};
	}, [
		text,
		advanceMode,
		isAuto,
		isNumericDelay,
		delayDuration,
		onComplete,
		children,
	]);

	// Fully opaque center mask for stronger fade effect
	const maskImage =
		'linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 10%, rgba(0,0,0,1) 90%, transparent 100%)';

	const wrapperStyle: React.CSSProperties = {
		position: 'fixed',
		top: '15%',
		left: '50%',
		transform: 'translateX(-50%)',
		width: '100%',
		maxWidth: '42rem',
		pointerEvents: 'none',
		WebkitMaskImage: maskImage,
		maskImage: maskImage,
	};

	return (
		<div style={wrapperStyle}>
			<Container3D
				style={style}
				className='mx-auto mb-10 pointer-events-auto w-full max-w-3xl text-center text-semibold text-lg leading-relaxed py-4 px-6'>
				{/* Render children if provided, else fallback to displayed text */}
				{children ?? displayedText}
				<GlowingMesh />
			</Container3D>
		</div>
	);
};

export default DialogueBanner;

'use client';

import React, { useEffect, useState } from 'react';

interface RightClickIndicatorProps {
	/** automatically hide after milliseconds (optional) */
	duration?: number;
	onComplete?: () => void;
}

const OFFSET = { x: 12, y: -12 };

const RightClickIndicator: React.FC<RightClickIndicatorProps> = ({
	duration,
	onComplete,
}) => {
	const [pos, setPos] = useState<{ x: number; y: number }>({
		x: -9999,
		y: -9999,
	});

	// Track mouse position
	useEffect(() => {
		const handleMove = (e: MouseEvent) => {
			setPos({ x: e.clientX + OFFSET.x, y: e.clientY + OFFSET.y });
		};
		window.addEventListener('mousemove', handleMove);
		return () => window.removeEventListener('mousemove', handleMove);
	}, []);

	// Auto-complete after duration
	useEffect(() => {
		if (!duration) return;
		const t = setTimeout(() => onComplete?.(), duration);
		return () => clearTimeout(t);
	}, [duration, onComplete]);

	return (
		<div
			className='fixed pointer-events-none z-[10000] animate-pulse'
			style={{
				left: pos.x,
				top: pos.y,
				transform: 'translate(-50%, -50%)',
			}}>
			<div className='flex items-center gap-1 select-none'>
				{/* Mouse icon */}
				<svg width='20' height='28' viewBox='0 0 20 28' fill='none'>
					{/* outer shape */}
					<rect
						x='1'
						y='1'
						width='18'
						height='26'
						rx='9'
						stroke='#D1D5DB'
						strokeWidth='2'
					/>
					{/* middle divider */}
					<line
						x1='10'
						y1='2'
						x2='10'
						y2='14'
						stroke='#D1D5DB'
						strokeWidth='1.5'
					/>
					{/* right button highlight */}
					<path d='M10 2 H18 V14 H10 Z' fill='#F3F4F6' />
				</svg>
				<span className='text-gray-300 text-sm'>Back</span>
			</div>
		</div>
	);
};

export default RightClickIndicator;

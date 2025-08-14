import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import { cn } from '@/styles/stylingUtils';
import { useStyling } from '@/store/CedarStore';
import { createPortal } from 'react-dom';

interface ClickableAreaProps {
	rect: DOMRect;
	onClick?: () => void;
	className?: string;
	blocking?: boolean; // When true, creates an overlay to block clicks outside the target area
	fadeOut?: boolean; // Controls whether the area and overlay should fade out
	buffer?: number; // Optional buffer around the clickable area in pixels
	disabled?: boolean; // When true, disables click interaction and blocks click propagation
}

const ClickableArea: React.FC<ClickableAreaProps> = ({
	rect,
	onClick,
	className,
	blocking = false,
	fadeOut = false,
	buffer = 0,
	disabled = false,
}: ClickableAreaProps) => {
	const areaRef = useRef<HTMLDivElement>(null);
	const { styling } = useStyling();

	// Extract if this area has a ring style (which indicates it's used with blocking overlay)
	const hasRingClass = className?.includes('ring-') || blocking;

	// Add event listeners for click and dragend events
	useEffect(() => {
		if (!rect || !onClick || disabled) return;

		// Add a flag to prevent duplicate calls within a short timeframe
		let isHandlingClick = false;

		const isWithinBounds = (x: number, y: number) => {
			return (
				x >= rect.left - buffer &&
				x <= rect.left + rect.width + buffer &&
				y >= rect.top - buffer &&
				y <= rect.top + rect.height + buffer
			);
		};

		// Shared handler for all events to prevent duplicates
		const handleEvent = (e: MouseEvent | DragEvent) => {
			if (isWithinBounds(e.clientX, e.clientY) && !isHandlingClick) {
				isHandlingClick = true;
				onClick();

				// Reset the flag after a short delay
				const timeout = setTimeout(() => {
					isHandlingClick = false;
				}, 100); // 100ms debounce
				return () => clearTimeout(timeout);
			}
		};

		// Add event listeners - using capture (true) for drag/drop events
		window.addEventListener('click', handleEvent, true);
		window.addEventListener('drop', handleEvent, true); // Using capture phase

		// Clean up on unmount
		return () => {
			window.removeEventListener('click', handleEvent, true);
			window.removeEventListener('drop', handleEvent, true); // Match capture phase in cleanup
		};
	}, [onClick, rect, buffer, disabled]);

	if (!rect) return null;

	// Use a stronger box shadow when this is being used with blocking overlay
	const boxShadowStyle =
		blocking || hasRingClass
			? `0 0 0 3px white, 0 0 0 6px ${
					styling.color || '#FFBFE9'
			  }, 0 0 30px 10px rgba(255, 255, 255, 0.9)`
			: `0 0 0 2px white, 0 0 0 4px ${styling.color || '#FFBFE9'}`;

	return (
		<>
			{/* Blocking overlay with a cut-out for the clickable area */}
			{blocking &&
				rect &&
				typeof window !== 'undefined' &&
				createPortal(
					<>
						{/* Top overlay */}
						{rect.top > 0 && (
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
									height: rect.top,
									zIndex: 9000,
									pointerEvents: 'auto',
									backgroundColor: 'black',
								}}
								onClick={(e: React.MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								aria-hidden='true'
							/>
						)}

						{/* Left overlay */}
						{rect.left > 0 && (
							<motion.div
								initial={{ opacity: 0.2 }}
								animate={{ opacity: fadeOut ? 0 : 0.2 }}
								transition={{ duration: 0.2 }}
								className='fixed'
								style={{
									position: 'fixed',
									top: rect.top,
									left: 0,
									width: rect.left,
									height: rect.height,
									zIndex: 9000,
									pointerEvents: 'auto',
									backgroundColor: 'black',
								}}
								onClick={(e: React.MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								aria-hidden='true'
							/>
						)}

						{/* Right overlay */}
						{rect.left + rect.width < window.innerWidth && (
							<motion.div
								initial={{ opacity: 0.2 }}
								animate={{ opacity: fadeOut ? 0 : 0.2 }}
								transition={{ duration: 0.2 }}
								className='fixed'
								style={{
									position: 'fixed',
									top: rect.top,
									left: rect.left + rect.width,
									right: 0,
									height: rect.height,
									zIndex: 9000,
									pointerEvents: 'auto',
									backgroundColor: 'black',
								}}
								onClick={(e: React.MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								aria-hidden='true'
							/>
						)}

						{/* Bottom overlay */}
						{rect.top + rect.height < window.innerHeight && (
							<motion.div
								initial={{ opacity: 0.2 }}
								animate={{ opacity: fadeOut ? 0 : 0.2 }}
								transition={{ duration: 0.2 }}
								className='fixed'
								style={{
									position: 'fixed',
									top: rect.top + rect.height,
									left: 0,
									right: 0,
									bottom: 0,
									zIndex: 9000,
									pointerEvents: 'auto',
									backgroundColor: 'black',
								}}
								onClick={(e: React.MouseEvent) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								aria-hidden='true'
							/>
						)}
					</>,
					document.body
				)}

			{/* The actual clickable area */}
			<motion.div
				ref={areaRef}
				initial={{
					opacity: 1,
					scale: 1,
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
				}}
				animate={{
					opacity: fadeOut ? 0 : 1,
					scale: blocking || hasRingClass ? [1, 1.03, 1] : 1,
					top: rect.top,
					left: rect.left,
					width: rect.width,
					height: rect.height,
				}}
				transition={{
					scale: {
						duration: 2,
						repeat: Infinity,
						repeatType: 'reverse',
					},
					opacity: { duration: 0.2 },
				}}
				style={{
					position: 'fixed',
					zIndex: 9001,
					pointerEvents: disabled ? 'auto' : 'none',
					boxShadow: boxShadowStyle,
					borderRadius: '0.5rem',
					background: 'transparent',
				}}
				className={cn('absolute cursor-pointer', className)}
				onClick={(e: React.MouseEvent) => {
					if (disabled) {
						e.preventDefault();
						e.stopPropagation();
					}
				}}
				aria-hidden='true'
			/>
		</>
	);
};

export default ClickableArea;

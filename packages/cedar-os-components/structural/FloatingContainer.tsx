import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export interface FloatingDimensions {
	width?: number | string;
	height?: number | string;
	minWidth?: number | string;
	minHeight?: number | string;
	maxWidth?: number | string;
	maxHeight?: number | string;
}

export type FloatingPosition = 'bottom-left' | 'bottom-right' | 'bottom-center';

interface FloatingContainerProps {
	children?: React.ReactNode;
	isActive: boolean;
	position?: FloatingPosition;
	className?: string;
	dimensions?: FloatingDimensions;
	resizable?: boolean;
	onResize?: (width: number, height: number) => void;
}

export const FloatingContainer: React.FC<FloatingContainerProps> = ({
	children,
	isActive,
	position,
	className = '',
	dimensions = {},
	resizable = true,
	onResize,
}) => {
	// Determine effective position - position prop takes precedence over side
	const effectivePosition: FloatingPosition = position || 'bottom-right';

	// Extract dimensions with defaults
	const {
		width: initialWidth,
		height: initialHeight,
		minWidth = '300px',
		minHeight = '250px',
		maxWidth = 'max-w-3xl',
		maxHeight = '80vh',
	} = dimensions;

	// For resizable panels, we need to track numeric values
	const containerRef = useRef<HTMLDivElement>(null);
	const [panelWidth, setPanelWidth] = useState<number | null>(null);
	const [panelHeight, setPanelHeight] = useState<number | null>(null);

	// Initialize numeric dimensions when container mounts (only for resizable)
	useEffect(() => {
		if (resizable && containerRef.current && panelWidth === null) {
			const rect = containerRef.current.getBoundingClientRect();
			setPanelWidth(rect.width);
			setPanelHeight(rect.height);
		}
	}, [resizable, panelWidth]);

	// Resize state
	const [isResizing, setIsResizing] = useState<
		null | 'width' | 'height' | 'both'
	>(null);
	const dragStartX = useRef(0);
	const dragStartY = useRef(0);
	const dragStartWidth = useRef(0);
	const dragStartHeight = useRef(0);

	// Convert CSS values to pixels for resize constraints
	const getNumericValue = (value: string | number): number => {
		if (typeof value === 'number') return value;
		if (value.endsWith('px')) return parseInt(value);
		if (value.endsWith('vh'))
			return (parseInt(value) / 100) * window.innerHeight;
		if (value.endsWith('vw'))
			return (parseInt(value) / 100) * window.innerWidth;
		return 0;
	};

	// Handle resize
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (
				!isResizing ||
				!resizable ||
				panelWidth === null ||
				panelHeight === null
			)
				return;

			let newWidth = panelWidth;
			let newHeight = panelHeight;

			const minWidthPx = getNumericValue(minWidth);
			const minHeightPx = getNumericValue(minHeight);
			const maxWidthPx =
				maxWidth === 'max-w-3xl' ? 768 : getNumericValue(maxWidth);
			const maxHeightPx = getNumericValue(maxHeight);

			if (isResizing === 'width' || isResizing === 'both') {
				const deltaX =
					effectivePosition === 'bottom-right'
						? dragStartX.current - e.clientX
						: effectivePosition === 'bottom-left'
						? e.clientX - dragStartX.current
						: 0; // For bottom-center, handle differently or disable width resize

				if (effectivePosition !== 'bottom-center') {
					newWidth = Math.max(
						minWidthPx,
						Math.min(maxWidthPx, dragStartWidth.current + deltaX)
					);
					setPanelWidth(newWidth);
				}
			}

			if (isResizing === 'height' || isResizing === 'both') {
				const deltaY = dragStartY.current - e.clientY;
				newHeight = Math.max(
					minHeightPx,
					Math.min(maxHeightPx, dragStartHeight.current + deltaY)
				);
				setPanelHeight(newHeight);
			}

			onResize?.(newWidth, newHeight);
		},
		[
			isResizing,
			effectivePosition,
			minWidth,
			minHeight,
			maxWidth,
			maxHeight,
			panelWidth,
			panelHeight,
			resizable,
			onResize,
		]
	);

	const handleMouseUp = useCallback(() => {
		setIsResizing(null);
		if (typeof document !== 'undefined') {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			document.body.style.webkitUserSelect = '';
		}
	}, []);

	useEffect(() => {
		if (isResizing && resizable) {
			if (typeof document !== 'undefined') {
				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
				document.body.style.userSelect = 'none';
				document.body.style.webkitUserSelect = 'none';

				if (isResizing === 'width') document.body.style.cursor = 'col-resize';
				if (isResizing === 'height') document.body.style.cursor = 'row-resize';
				if (isResizing === 'both') document.body.style.cursor = 'nwse-resize';
			}
		}
		return () => {
			if (typeof document !== 'undefined') {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}, [isResizing, handleMouseMove, handleMouseUp, resizable]);

	const startResize = (
		direction: 'width' | 'height' | 'both',
		e: React.MouseEvent
	) => {
		if (!resizable || panelWidth === null || panelHeight === null) return;
		e.preventDefault();
		setIsResizing(direction);
		dragStartX.current = e.clientX;
		dragStartY.current = e.clientY;
		dragStartWidth.current = panelWidth;
		dragStartHeight.current = panelHeight;
	};

	// Position classes based on position
	const getPositionClasses = () => {
		switch (effectivePosition) {
			case 'bottom-left':
				return 'fixed bottom-4 left-4';
			case 'bottom-right':
				return 'fixed bottom-4 right-4';
			case 'bottom-center':
				return 'fixed bottom-8 left-1/2 transform -translate-x-1/2';
			default:
				return 'fixed bottom-4 right-4';
		}
	};

	const positionClasses = getPositionClasses();

	// Animation direction based on position
	const getAnimationDirection = () => {
		switch (effectivePosition) {
			case 'bottom-left':
				return {
					initial: { x: '-120%' },
					animate: { x: 0 },
					exit: { x: '-120%' },
				};
			case 'bottom-right':
				return {
					initial: { x: '120%' },
					animate: { x: 0 },
					exit: { x: '120%' },
				};
			case 'bottom-center':
				return {
					initial: { y: '120%' },
					animate: { y: 0 },
					exit: { y: '120%' },
				};
			default:
				return {
					initial: { x: '120%' },
					animate: { x: 0 },
					exit: { x: '120%' },
				};
		}
	};

	const animationProps = getAnimationDirection();

	if (!isActive) return null;

	// Build container style based on whether we're resizing or using CSS defaults
	const containerStyle: React.CSSProperties = {};

	// For bottom-center, always use CSS-based sizing
	if (effectivePosition === 'bottom-center') {
		containerStyle.width = initialWidth || '100%';
		containerStyle.maxWidth =
			typeof maxWidth === 'string' && maxWidth.startsWith('max-w-')
				? undefined
				: maxWidth;
		containerStyle.minWidth = minWidth;
		containerStyle.height = initialHeight || 'auto';
	} else {
		// For corner positions, use numeric values when resizing, CSS otherwise
		if (resizable && panelWidth !== null && panelHeight !== null) {
			containerStyle.width = panelWidth;
			containerStyle.height = panelHeight;
			containerStyle.minWidth = minWidth;
			containerStyle.minHeight = minHeight;
		} else {
			containerStyle.width = initialWidth || '100%';
			containerStyle.height = initialHeight || 'auto';
			containerStyle.minWidth = minWidth;
			containerStyle.minHeight = minHeight;
			containerStyle.maxWidth =
				typeof maxWidth === 'string' && maxWidth.startsWith('max-w-')
					? undefined
					: maxWidth;
			containerStyle.maxHeight = maxHeight;
		}
	}

	// Build className string with Tailwind classes
	const containerClasses = [
		positionClasses,
		'z-[9999] !m-0',
		effectivePosition === 'bottom-center' && 'w-full',
		typeof maxWidth === 'string' && maxWidth.startsWith('max-w-') && maxWidth,
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div ref={containerRef} className={containerClasses} style={containerStyle}>
			<motion.div
				initial={animationProps.initial}
				animate={animationProps.animate}
				exit={animationProps.exit}
				transition={{ type: 'spring', damping: 20, stiffness: 100 }}
				className='w-full h-full'
				style={{ willChange: 'transform' }}>
				{children}
			</motion.div>

			{/* Resize handles - only show for corner positions, not bottom-center */}
			{resizable &&
				effectivePosition !== 'bottom-center' &&
				panelWidth !== null && (
					<>
						{/* Width handle */}
						<div
							className='absolute top-0 h-full w-1 cursor-col-resize hover:bg-blue-400/50'
							style={{
								left: effectivePosition === 'bottom-right' ? 0 : 'auto',
								right: effectivePosition === 'bottom-left' ? 0 : 'auto',
							}}
							onMouseDown={(e) => startResize('width', e)}
						/>

						{/* Height handle */}
						<div
							className='absolute w-full h-1 cursor-row-resize hover:bg-blue-400/50'
							style={{ top: 0 }}
							onMouseDown={(e) => startResize('height', e)}
						/>

						{/* Corner handle */}
						<div
							className='absolute w-3 h-3 cursor-nwse-resize hover:bg-blue-400/50'
							style={{
								top: 0,
								left: effectivePosition === 'bottom-right' ? 0 : 'auto',
								right: effectivePosition === 'bottom-left' ? 0 : 'auto',
							}}
							onMouseDown={(e) => startResize('both', e)}
						/>
					</>
				)}
		</div>
	);
};

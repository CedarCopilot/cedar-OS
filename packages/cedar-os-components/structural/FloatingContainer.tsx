import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

export interface FloatingDimensions {
	width?: number;
	height?: number;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
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
		minWidth = 300,
		minHeight = 250,
		maxWidth,
		maxHeight,
	} = dimensions;

	// Calculate default dimensions based on viewport and position
	const getDefaultDimensions = () => {
		// For bottom-center, use ChatInputContainer defaults
		if (effectivePosition === 'bottom-center') {
			return {
				width: initialWidth || 600, // Use static fallback for SSR
				height: initialHeight || 'auto',
			};
		}

		return {
			width: initialWidth || 400, // Use static fallback for SSR
			height: initialHeight || 500, // Use static fallback for SSR
		};
	};

	const defaults = getDefaultDimensions();
	const [panelWidth, setPanelWidth] = useState(
		typeof defaults.width === 'number' ? defaults.width : 400
	);
	const [panelHeight, setPanelHeight] = useState(
		typeof defaults.height === 'number' ? defaults.height : 500
	);

	// Update panel dimensions after hydration and when dimensions prop changes
	useEffect(() => {
		if (typeof window === 'undefined') return;

		// Calculate client-side dimensions after hydration
		const getClientDimensions = () => {
			if (effectivePosition === 'bottom-center') {
				return {
					width: initialWidth || Math.min(window.innerWidth - 32, 768),
					height: initialHeight || 'auto',
				};
			}

			return {
				width: initialWidth || window.innerWidth * 0.3,
				height: initialHeight || window.innerHeight * 0.6,
			};
		};

		const clientDefaults = getClientDimensions();
		if (typeof clientDefaults.width === 'number') {
			setPanelWidth(clientDefaults.width);
		}
		if (typeof clientDefaults.height === 'number') {
			setPanelHeight(clientDefaults.height);
		}
	}, [initialWidth, initialHeight, effectivePosition]);

	// Calculate max dimensions based on position - use static fallbacks for SSR
	const getMaxDimensions = () => {
		if (effectivePosition === 'bottom-center') {
			return {
				maxWidth: maxWidth || 768, // Static fallback for SSR
				maxHeight: maxHeight || 600, // Static fallback for SSR
			};
		}

		return {
			maxWidth: maxWidth || 800, // Static fallback for SSR
			maxHeight: maxHeight || 600, // Static fallback for SSR
		};
	};

	const [calculatedMaxWidth, setCalculatedMaxWidth] = useState(
		() => getMaxDimensions().maxWidth
	);
	const [calculatedMaxHeight, setCalculatedMaxHeight] = useState(
		() => getMaxDimensions().maxHeight
	);

	// Update max dimensions after hydration
	useEffect(() => {
		if (typeof window === 'undefined') return;

		const getClientMaxDimensions = () => {
			if (effectivePosition === 'bottom-center') {
				return {
					maxWidth: maxWidth || Math.min(window.innerWidth - 32, 768),
					maxHeight: maxHeight || window.innerHeight * 0.8,
				};
			}

			return {
				maxWidth: maxWidth || window.innerWidth * 0.6,
				maxHeight: maxHeight || window.innerHeight * 0.8,
			};
		};

		const clientMaxDimensions = getClientMaxDimensions();
		setCalculatedMaxWidth(clientMaxDimensions.maxWidth);
		setCalculatedMaxHeight(clientMaxDimensions.maxHeight);
	}, [effectivePosition, maxWidth, maxHeight]);

	// Resize state
	const [isResizing, setIsResizing] = useState<
		null | 'width' | 'height' | 'both'
	>(null);
	const dragStartX = useRef(0);
	const dragStartY = useRef(0);
	const dragStartWidth = useRef(0);
	const dragStartHeight = useRef(0);

	// Handle resize
	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isResizing || !resizable) return;

			let newWidth = panelWidth;
			let newHeight = panelHeight;

			if (isResizing === 'width' || isResizing === 'both') {
				const deltaX =
					effectivePosition === 'bottom-right'
						? dragStartX.current - e.clientX
						: effectivePosition === 'bottom-left'
						? e.clientX - dragStartX.current
						: 0; // For bottom-center, handle differently or disable width resize

				if (effectivePosition !== 'bottom-center') {
					newWidth = Math.max(
						minWidth,
						Math.min(calculatedMaxWidth, dragStartWidth.current + deltaX)
					);
					setPanelWidth(newWidth);
				}
			}

			if (isResizing === 'height' || isResizing === 'both') {
				const deltaY = dragStartY.current - e.clientY;
				newHeight = Math.max(
					minHeight,
					Math.min(calculatedMaxHeight, dragStartHeight.current + deltaY)
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
			calculatedMaxWidth,
			calculatedMaxHeight,
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
		if (!resizable) return;
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

	const containerStyle =
		effectivePosition === 'bottom-center'
			? {
					width: panelWidth,
					maxWidth: calculatedMaxWidth,
					minWidth,
					height: defaults.height === 'auto' ? 'auto' : panelHeight,
			  }
			: {
					width: panelWidth,
					height: panelHeight,
					minWidth,
					minHeight,
			  };

	return (
		<div
			className={`${positionClasses} z-[9999] ${
				effectivePosition === 'bottom-center' ? 'w-2xl max-w-3xl' : ''
			} ${className}`}
			style={containerStyle}>
			<motion.div
				initial={animationProps.initial}
				animate={animationProps.animate}
				exit={animationProps.exit}
				transition={{ type: 'spring', damping: 20, stiffness: 100 }}
				className='w-full h-full'>
				{children}
			</motion.div>

			{/* Resize handles - only show for corner positions, not bottom-center */}
			{resizable && effectivePosition !== 'bottom-center' && (
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

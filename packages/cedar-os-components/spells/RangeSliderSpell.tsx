'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
	useCedarStore,
	useStyling,
	useSpell,
	type ActivationConditions,
	type CedarStore,
} from 'cedar-os';
import { AnimatePresence, motion } from 'motion/react';
import Container3D from '../containers/Container3D';
import type { LucideIcon } from 'lucide-react';

export interface RangeOption {
	/** The actual value this option represents */
	value: number;
	/** Text to display for this option. Use ${value} as placeholder for the value */
	text: string;
	/** Icon to display for this option (emoji string or Lucide icon) */
	icon?: string | LucideIcon;
	/** Optional color for this option */
	color?: string;
}

export interface RangeSliderConfig {
	/** Array of options to snap to */
	options: RangeOption[];
	/** Unit to display after the value (e.g., '%', 'px') */
	unit?: string;
	/** Whether to space options proportionally based on their values (default: false for even spacing) */
	proportionalSpacing?: boolean;
}

export interface RangeSliderSpellProps {
	/** Unique identifier for this spell instance */
	spellId: string;
	/** Configuration for the range slider */
	rangeSliderConfig: RangeSliderConfig;
	/** Callback when slider value is confirmed */
	onComplete: (value: number, optionIndex: number, store: CedarStore) => void;
	/** Activation conditions for the spell */
	activationConditions: ActivationConditions;
}

const RangeSliderSpell: React.FC<RangeSliderSpellProps> = ({
	spellId,
	rangeSliderConfig,
	onComplete,
	activationConditions,
}) => {
	const { styling } = useStyling();
	const { options, unit = '', proportionalSpacing = false } = rangeSliderConfig;

	const [sliderPosition, setSliderPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);

	// Current option index
	const [currentIndex, setCurrentIndex] = useState<number>(
		Math.floor(options.length / 2) // Start at middle option
	);

	const [initialMouseX, setInitialMouseX] = useState<number | null>(null);
	const [initialIndex, setInitialIndex] = useState<number>(
		Math.floor(options.length / 2)
	);

	// Calculate positions for each option - only once!
	const optionPositions = useMemo(() => {
		const padding = 3; // 5% padding on each side
		const usableRange = 100 - padding * 2; // 90% usable range

		if (proportionalSpacing && options.length > 1) {
			// Use actual values for positioning
			const minValue = Math.min(...options.map((o) => o.value));
			const maxValue = Math.max(...options.map((o) => o.value));
			const range = maxValue - minValue;

			return options.map((option) => {
				if (range === 0) return 50; // All same value, center them
				const normalizedPosition = (option.value - minValue) / range;
				return padding + normalizedPosition * usableRange;
			});
		} else {
			// Even spacing
			if (options.length === 1) return [50];
			return options.map((_, index) => {
				const normalizedPosition = index / (options.length - 1);
				return padding + normalizedPosition * usableRange;
			});
		}
	}, [options, proportionalSpacing]);

	// Get current option details
	const currentOption = options[currentIndex];
	const currentPercent = optionPositions[currentIndex];

	// Process text with value placeholder
	const displayText = useMemo(() => {
		const text = currentOption.text || `${currentOption.value}${unit}`;
		return text.replace('${value}', `${currentOption.value}${unit}`);
	}, [currentOption, unit]);

	// Render icon helper
	const renderIcon = (option: RangeOption, size: number = 18) => {
		const icon = option.icon;
		if (!icon) return null;

		if (typeof icon === 'string') {
			// Emoji
			return <span className='text-lg'>{icon}</span>;
		} else {
			// Lucide icon
			return React.createElement(icon, {
				size,
				className: `w-${size / 4} h-${size / 4}`,
			});
		}
	};

	// Use refs to track the final values when deactivating
	const indexRef = useRef<number>(currentIndex);

	useEffect(() => {
		indexRef.current = currentIndex;
	}, [currentIndex]);

	// Use the spell hook
	useSpell({
		id: spellId,
		activationConditions,
		onActivate: (state) => {
			// Position the slider at mouse position or center of viewport
			if (state.triggerData?.mousePosition) {
				setSliderPosition(state.triggerData.mousePosition);
				setInitialMouseX(state.triggerData.mousePosition.x);
			} else {
				const centerX = window.innerWidth / 2;
				const centerY = window.innerHeight / 2;
				setSliderPosition({
					x: centerX,
					y: centerY,
				});
				setInitialMouseX(centerX);
			}
			// Reset to middle option on activation
			const midIndex = Math.floor(options.length / 2);
			setCurrentIndex(midIndex);
			setInitialIndex(midIndex);
		},
		onDeactivate: () => {
			// Execute the callback with the final value and index on deactivate
			const finalOption = options[indexRef.current];
			onComplete(finalOption.value, indexRef.current, useCedarStore.getState());
			// Clean up
			setSliderPosition(null);
			setInitialMouseX(null);
		},
	});

	// Handle mouse movement for slider control
	useEffect(() => {
		if (!sliderPosition || initialMouseX === null) return;

		const handleMouseMove = (e: MouseEvent) => {
			// Calculate horizontal movement from initial position
			const deltaX = e.clientX - initialMouseX;

			// Map mouse movement to percentage
			const sensitivity = 300; // pixels for full range
			const percentDelta = (deltaX / sensitivity) * 100;

			// Calculate target percentage position
			const initialPercent = optionPositions[initialIndex];
			let targetPercent = initialPercent + percentDelta;
			targetPercent = Math.max(0, Math.min(100, targetPercent));

			// Find closest option to the target percentage
			let closestIndex = 0;
			let closestDistance = Math.abs(optionPositions[0] - targetPercent);

			for (let i = 1; i < optionPositions.length; i++) {
				const distance = Math.abs(optionPositions[i] - targetPercent);
				if (distance < closestDistance) {
					closestDistance = distance;
					closestIndex = i;
				}
			}

			setCurrentIndex(closestIndex);
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				// Reset to initial index and close
				setCurrentIndex(initialIndex);
				setSliderPosition(null);
				setInitialMouseX(null);
			}
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('keydown', handleEscape);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('keydown', handleEscape);
		};
	}, [sliderPosition, initialMouseX, initialIndex, optionPositions]);

	// Don't render if not active
	if (!sliderPosition) return null;

	return (
		<AnimatePresence>
			{sliderPosition && (
				<div
					className='fixed z-[10000] pointer-events-none'
					style={{
						left: sliderPosition.x,
						top: sliderPosition.y,
						transform: 'translate(-50%, -100%)', // Center horizontally, position above cursor
						marginTop: '-20px', // Gap for labels
					}}>
					<div
						className='pointer-events-auto bg-background/95 backdrop-blur-md rounded-xl shadow-2xl p-3 border border-border'
						style={{
							minWidth: '400px', // Wide enough for labels
							backgroundColor: styling.darkMode
								? 'rgba(0,0,0,0.9)'
								: 'rgba(255,255,255,0.95)',
						}}>
						{/* Range Slider implementation */}
						<div className='relative flex flex-col items-center w-full'>
							<div className='h-fit w-full relative flex items-center justify-center'>
								{/* Track */}
								<div
									className='absolute rounded-full h-4 border-[0.5px] border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.21)] w-full'
									style={{
										top: '50%',
										transform: 'translateY(-50%)',
										boxShadow:
											'inset 0px 4px 4px 0px rgba(0, 0, 0, 0.45), inset -0.5px 0.5px 0px rgba(255, 255, 255, 0.25)',
									}}>
									{/* Option point indicators */}
									{options.map((option, index) => {
										const isActive = index === currentIndex;
										const position = optionPositions[index];

										return (
											<React.Fragment key={index}>
												{/* Dot indicator */}
												<div
													className='absolute transition-all duration-200'
													style={{
														left: `${position}%`,
														top: '50%',
														transform: 'translate(-50%, -50%)',
													}}>
													<div
														className='rounded-full transition-all duration-200'
														style={{
															width: isActive ? '12px' : '8px',
															height: isActive ? '12px' : '8px',
															backgroundColor: isActive
																? option.color ||
																  styling.accentColor ||
																  '#3b82f6'
																: styling.darkMode
																? '#666'
																: '#ccc',
															boxShadow: isActive
																? '0 0 8px rgba(0,0,0,0.3)'
																: 'none',
														}}
													/>
												</div>
											</React.Fragment>
										);
									})}
								</div>

								{/* Nub and label */}
								<motion.div
									className='absolute'
									animate={{
										left: `${currentPercent}%`,
									}}
									transition={{
										type: 'spring',
										stiffness: 300,
										damping: 30,
									}}
									style={{
										top: '50%',
										transform: 'translate(-50%, -50%)',
									}}>
									<Container3D
										className='flex-shrink-0 mb-0.5 w-6 h-6 rounded-full'
										color={currentOption.color}>
										<></>
									</Container3D>
									<div className='absolute -top-10 left-1/2 transform -translate-x-1/2'>
										<motion.div
											className='px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center shadow-lg'
											style={{
												color: styling.darkMode ? '#fff' : '#000',
												backgroundColor: styling.darkMode
													? 'rgba(0,0,0,0.9)'
													: 'rgba(255,255,255,0.95)',
												borderColor: currentOption.color || styling.color,
												borderWidth: '1px',
												borderStyle: 'solid',
											}}
											initial={{ opacity: 0, y: 5 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ duration: 0.2 }}>
											{renderIcon(currentOption) && (
												<span className='mr-2'>
													{renderIcon(currentOption)}
												</span>
											)}
											{displayText}
										</motion.div>
									</div>
								</motion.div>
							</div>
						</div>
					</div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default RangeSliderSpell;

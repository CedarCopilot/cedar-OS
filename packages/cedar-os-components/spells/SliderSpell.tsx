'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
	useCedarStore,
	useStyling,
	useSpell,
	type ActivationConditions,
	type CedarStore,
} from 'cedar-os';
import { AnimatePresence } from 'motion/react';
import Container3D from '../containers/Container3D';

export interface SliderConfig {
	/** Minimum value for the slider */
	min?: number;
	/** Maximum value for the slider */
	max?: number;
	/** Step increment for the slider */
	step?: number;
	/** Label to display above the slider */
	label?: string;
	/** Unit to display after the value (e.g., '%', 'px') */
	unit?: string;
}

export interface SliderSpellProps {
	/** Unique identifier for this spell instance */
	spellId: string;
	/** Configuration for the slider */
	sliderConfig?: SliderConfig;
	/** Callback when slider value is confirmed */
	onComplete: (value: number, store: CedarStore) => void;
	/** Activation conditions for the spell */
	activationConditions: ActivationConditions;
}

// Internal Slider Component
const CustomSlider: React.FC<{
	min: number;
	max: number;
	step: number;
	value: number;
	unit: string;
	label?: string;
	styling: { darkMode: boolean; color: string; accentColor: string };
}> = ({ min, max, step, value, unit, label, styling }) => {
	const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;

	return (
		<div className='relative flex flex-col items-center w-full'>
			<div className='h-fit w-full relative flex items-center justify-center'>
				{/* Track */}
				<div
					className='absolute inset-0 rounded-full h-4 border-[0.5px] border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.21)]'
					style={{
						boxShadow:
							'inset 0px 4px 4px 0px rgba(0, 0, 0, 0.45), inset -0.5px 0.5px 0px rgba(255, 255, 255, 0.25)',
					}}
				/>
				{/* Nub and label */}
				<div
					className='absolute'
					style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}>
					<Container3D className='flex-shrink-0 mb-0.5 w-6 h-6 rounded-full'>
						<></>
					</Container3D>
					<div className='absolute -top-8 left-1/2 transform -translate-x-1/2'>
						<div
							className='px-2 py-1 rounded text-sm font-semibold whitespace-nowrap'
							style={{
								color: styling.darkMode ? '#fff' : '#000',
								backgroundColor: styling.darkMode
									? 'rgba(0,0,0,0.8)'
									: 'rgba(255,255,255,0.9)',
							}}>
							{value}
							{unit}
						</div>
					</div>
				</div>
				{/* Invisible input for accessibility */}
				<input
					type='range'
					min={min}
					max={max}
					step={step}
					value={value}
					className='relative w-full h-full opacity-0 cursor-pointer'
					readOnly
				/>
			</div>
			{/* Label below the slider */}
			{label && (
				<div
					className='mt-2 text-sm font-medium text-center'
					style={{
						color: styling.darkMode ? '#fff' : '#000',
					}}>
					{label}
				</div>
			)}
		</div>
	);
};

const SliderSpell: React.FC<SliderSpellProps> = ({
	spellId,
	sliderConfig = {},
	onComplete,
	activationConditions,
}) => {
	const { styling } = useStyling();
	const { min = 0, max = 100, step = 1, unit = '%', label } = sliderConfig;

	const [sliderPosition, setSliderPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [sliderValue, setSliderValue] = useState<number>(min + (max - min) / 2);
	const [initialMouseX, setInitialMouseX] = useState<number | null>(null);
	const [initialValue, setInitialValue] = useState<number>(
		min + (max - min) / 2
	);

	// Use a ref to track the final value when deactivating
	const valueRef = useRef<number>(sliderValue);
	useEffect(() => {
		valueRef.current = sliderValue;
	}, [sliderValue]);

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
			// Reset to middle value on activation
			const midValue = min + (max - min) / 2;
			setSliderValue(midValue);
			setInitialValue(midValue);
		},
		onDeactivate: () => {
			// Execute the callback with the final value on deactivate (HOLD mode)
			onComplete(valueRef.current, useCedarStore.getState());
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

			// Map mouse movement to slider range
			// Use a sensitivity factor (pixels per unit)
			const sensitivity = 300; // pixels for full range
			const valueRange = max - min;
			const deltaValue = (deltaX / sensitivity) * valueRange;

			// Calculate new value
			let newValue = initialValue + deltaValue;

			// Clamp to min/max and apply step
			newValue = Math.max(min, Math.min(max, newValue));
			newValue = Math.round(newValue / step) * step;

			setSliderValue(newValue);
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				// Reset to initial value and close
				setSliderValue(initialValue);
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
	}, [sliderPosition, initialMouseX, initialValue, min, max, step]);

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
						marginTop: '-8px', // Small gap above cursor
					}}>
					<div
						className='pointer-events-auto bg-background/95 backdrop-blur-md rounded-xl shadow-2xl p-1 border border-border'
						style={{
							minWidth: '320px',
							backgroundColor: styling.darkMode
								? 'rgba(0,0,0,0.9)'
								: 'rgba(255,255,255,0.95)',
						}}>
						{/* Custom Slider implementation */}
						<div className='w-full'>
							<CustomSlider
								min={min}
								max={max}
								step={step}
								value={sliderValue}
								unit={unit}
								label={label}
								styling={styling}
							/>
						</div>
					</div>
				</div>
			)}
		</AnimatePresence>
	);
};

export default SliderSpell;

'use client';
import React, { useState, useEffect } from 'react';
import Container3D from '@/components/containers/Container3D';
import { AnimateNumber } from 'motion-plus-react';
import { useMotionValue, useVelocity, useSpring } from 'motion/react';
import { useStyling } from '@/store/CedarStore';

import KeyboardShortcut from '@/components/ui/KeyboardShortcut';
import { CornerDownLeft } from 'lucide-react';
import Flat3dButton from '@/components/containers/Flat3dButton';

interface SliderProps {
	min?: number;
	max?: number;
	step?: number;
	onComplete: (value: number) => void;
}

export default function Slider({
	min = 0,
	max = 100,
	step = 1,
	onComplete,
}: SliderProps) {
	const { styling } = useStyling();
	const [value, setValue] = useState<number>(min + (max - min) / 2);

	const scaled = useMotionValue(value);
	const velocity = useVelocity(scaled);
	const rotate = useSpring(velocity);

	useEffect(() => {
		scaled.set(value);
	}, [value, scaled]);

	const percent = ((value - min) / (max - min)) * 100;

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
				{/* Nub and tooltip */}
				<div
					className='absolute'
					style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}>
					<Container3D className='flex-shrink-0 mb-0.5 w-6 h-6 rounded-full'>
						<></>
					</Container3D>
					<div className='absolute -top-8 left-1/2 transform -translate-x-1/2'>
						<AnimateNumber
							transition={{ duration: 0.2, ease: 'easeOut' }}
							locales='en-US'
							className='px-2 py-1 rounded text-xs origin-[0.5px_1.5px]'
							style={{
								rotate,
								color: styling.accentColor,
								backgroundColor: styling.color,
							}}>
							{value}
						</AnimateNumber>
					</div>
				</div>
				{/* Invisible input */}
				<input
					type='range'
					min={min}
					max={max}
					step={step}
					value={value}
					onChange={(e) => setValue(Number(e.target.value))}
					className='relative w-full h-full opacity-0 cursor-pointer'
				/>
			</div>
			<Flat3dButton
				className='mt-3 w-full flex items-center justify-center'
				style={{ backgroundColor: styling.color }}
				onClick={() => onComplete(value)}>
				<KeyboardShortcut className='mr-2'>
					Enter
					<CornerDownLeft className='w-4 h-4 ml-2' />
				</KeyboardShortcut>
				Next
			</Flat3dButton>
		</div>
	);
}

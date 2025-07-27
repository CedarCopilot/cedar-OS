import React, { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface Toggle3DProps {
	/** Optional additional classes */
	className?: string;
	/** Width in pixels. Height is derived as width / 2. */
	width?: number;
	/** Controlled checked state; if provided, component is controlled */
	checked?: boolean;
	/** Callback when toggle state changes */
	onChange?: (checked: boolean) => void;
	/** Initial uncontrolled state */
	defaultChecked?: boolean;
	/** Use colored knob (green/red) and track (light/dark); set false for B/W mode */
	coloured?: boolean;
}

/**
 * A tactile 3-D toggle switch inspired by neumorphic designs.
 * The component scales shadows/gradients proportionally to its size.
 */
const Toggle3D: React.FC<Toggle3DProps> = ({
	className = '',
	width = 80,
	checked: controlledChecked,
	onChange,
	defaultChecked = false,
	coloured = true,
}) => {
	const isControlled = controlledChecked !== undefined;
	const [internalChecked, setInternalChecked] = useState(defaultChecked);
	const actualChecked = isControlled ? controlledChecked! : internalChecked;

	const height = width / 2; // Maintain 2:1 aspect ratio
	const knobSize = height * 0.6;
	const trackRadius = height; // fully round

	const trackShadowLight =
		'inset 0 -5px 5px 0 rgba(0,0,0,0.13), inset 0 5px 5px 0 rgba(255,255,255,1), inset 23px -33px 28px 0 rgba(255,255,255,0.9), inset -25px 28px 23px 0 rgba(0,0,0,0.1), 0 -15px 18px 0 rgba(255,255,255,1), 0 25px 41px 0 rgba(0,0,0,0.16)';
	const trackShadowDark =
		'inset 0 -5px 5px 0 rgba(0,0,0,0.5), inset 0 5px 5px 0 rgba(255,255,255,0.13), inset 23px -33px 28px 0 rgba(255,255,255,0.03), inset -25px 28px 23px 0 rgba(0,0,0,0.4), 0 -15px 30px 0 rgba(255,255,255,0.08), 0 25px 41px 0 rgba(0,0,0,0.4)';

	const trackStyle: React.CSSProperties = {
		width,
		height,
		borderRadius: trackRadius,
		background: actualChecked ? '#1A1A1A' : '#F2F2F2',
		boxShadow: actualChecked ? trackShadowDark : trackShadowLight,
	};

	// Dynamic styles for the knob
	const onColor = coloured
		? 'radial-gradient(circle at 60% 30%, #ACFF85 0%, #66D233 100%)'
		: 'radial-gradient(circle at 60% 30%, #FFFFFF 0%, #E6E6E6 100%)';
	const offColor = coloured
		? 'radial-gradient(circle at 60% 30%, #FF7676 0%, #ED5C5C 100%)'
		: 'radial-gradient(circle at 60% 30%, #333333 0%, #000000 100%)';

	const knobShadowOn = coloured
		? 'inset 0 0 2px 0 rgb(255,255,255,1), 3px -4px 7px 0 rgba(102,210,51,0.56), inset 3px -4px 7px 0 rgba(0,0,0,0.25), -3px 3px 5.6px 0 rgba(0,0,0,0.25)'
		: 'inset 0 0 2px 0 rgb(255,255,255,1), 3px -4px 7px 0 rgba(255,255,255,0.3), inset 3px -4px 7px 0 rgba(0,0,0,0.25), -3px 3px 5.6px 0 rgba(0,0,0,0.25)';
	const knobShadowOff = coloured
		? 'inset 0 0 3.6px 0 rgba(255,255,255,1), 3px -4px 7px 0 rgba(255,175,175,0.56), inset 3px -4px 7px 0 rgba(0,0,0,0.25), -3px 3px 5.6px 0 rgba(0,0,0,0.25)'
		: 'inset 0 0 3.6px 0 rgba(255,255,255,1), 3px -4px 7px 0 rgba(0,0,0,0.3), inset 3px -4px 7px 0 rgba(0,0,0,0.25), -3px 3px 5.6px 0 rgba(0,0,0,0.25)';

	const knobStyle: React.CSSProperties = {
		width: knobSize,
		height: knobSize,
		borderRadius: knobSize,
		background: actualChecked ? onColor : offColor,
		boxShadow: actualChecked ? knobShadowOn : knobShadowOff,
	};

	const handleToggle = () => {
		const newState = !actualChecked;
		if (!isControlled) setInternalChecked(newState);
		onChange?.(newState);
	};

	const knobTravel = width - knobSize - height * 0.2; // slight padding both sides

	return (
		<div
			className={cn('relative cursor-pointer select-none', className)}
			style={trackStyle}
			onClick={handleToggle}>
			<motion.div
				className='absolute top-1/2 mx-1'
				style={knobStyle}
				initial={{ y: '-50%', x: 0, top: '50%', position: 'absolute' }}
				animate={{ x: actualChecked ? knobTravel : 0, y: '-50%' }}
				transition={{ type: 'spring', stiffness: 400, damping: 30 }}
			/>
		</div>
	);
};

export default Toggle3D;

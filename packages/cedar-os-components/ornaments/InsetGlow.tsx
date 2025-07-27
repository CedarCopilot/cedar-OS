import { motion, HTMLMotionProps } from 'motion/react';
import React from 'react';
import { cn } from 'cedar-os';
import { useStyling } from 'cedar-os';

interface InsetGlowProps {
	size?: number | string; // width/height, accepts tailwind size or px
	color?: string; // glow colour
	glowStrength?: number; // multiplier for blur radius (1 = default)
	className?: string;
	motionProps?: HTMLMotionProps<'div'>;
	pulse?: boolean; // enable stronger pulsing animation
}

const InsetGlow: React.FC<InsetGlowProps> = ({
	size,
	color,
	glowStrength = 1,
	className = '',
	motionProps = {},
	pulse = false,
}) => {
	const { styling } = useStyling();
	const resolvedColor = color || styling.color || '#54EAD8';

	const { style: motionStyle = {}, ...rest } = motionProps;

	// No separate blur vars needed; will compute on demand

	// Helper to generate combined box-shadow and drop-shadow styles
	const makeShadows = (multiplier: number) => {
		// Inset shadow for subtle depth (constant as per spec)
		const inset = 'inset 0px 1px 2px rgba(0,0,0,0.06)';

		// Outer glow shadows scaled by multiplier and glowStrength
		const glowBlur = 6 * glowStrength * multiplier;
		const glowFarBlur = glowBlur * 2;
		const glowColor = resolvedColor;
		const outerGlow = `0 0 ${glowBlur}px ${glowColor}`;
		const outerGlowSoft = `0 0 ${glowFarBlur}px ${glowColor}66`;

		// Combine shadows
		return `${inset}, ${outerGlow}, ${outerGlowSoft}`;
	};

	return (
		<motion.div
			className={cn('rounded-full w-3 h-3 ', className)}
			style={{
				backgroundColor: resolvedColor,
				boxShadow: makeShadows(1),
				filter:
					'drop-shadow(0px 2px 2px #FFF) drop-shadow(0px -1px 1px rgba(0,0,0,0.10))',
				willChange: 'box-shadow, filter, transform',
				...(size !== undefined
					? {
							width: typeof size === 'number' ? `${size}px` : size,
							height: typeof size === 'number' ? `${size}px` : size,
					  }
					: {}),
				...motionStyle,
			}}
			animate={
				pulse
					? { boxShadow: makeShadows(1.8), scale: [1, 1.3] }
					: { boxShadow: makeShadows(1.6) }
			}
			transition={
				pulse
					? {
							duration: 1,
							repeat: Infinity,
							repeatType: 'mirror',
							ease: 'easeInOut',
					  }
					: {
							duration: 2,
							repeat: Infinity,
							repeatType: 'mirror',
							ease: 'easeInOut',
					  }
			}
			{...rest}
		/>
	);
};

export default InsetGlow;

import { cn } from '@/styles/stylingUtils';
import { HTMLMotionProps, motion } from 'motion/react';
import React from 'react';
import { useStyling } from '@/store/CedarStore';
import { getShadedColor, getLightenedColor } from '@/styles/stylingUtils';

interface Flat3dContainerProps extends Omit<HTMLMotionProps<'div'>, 'onDrag'> {
	children: React.ReactNode;
	/**
	 * Whether to force dark theme styling. Otherwise derives from Cedar styling store when available.
	 */
	isDarkTheme?: boolean;
	/**
	 * Optional primary colour used to tint shadows/highlights.
	 */
	primaryColor?: string;
	className?: string;
	layoutId?: string;
}

const Flat3dContainer: React.FC<Flat3dContainerProps> = ({
	children,
	isDarkTheme = false,
	primaryColor,
	className = '',
	layoutId,
	style,
	...props
}) => {
	// Pull dark mode preference from Cedar styling slice
	const { styling } = useStyling();

	// Resolve whether dark theme should be applied
	const darkThemeEnabled = isDarkTheme || styling.darkMode;

	// ------------------------------------------------------------------
	// Background + edge shadow configuration
	// ------------------------------------------------------------------
	// If a primaryColor is provided, derive a custom gradient + shadow.
	// Otherwise fall back to the theme-based defaults.
	let backgroundStyle: React.CSSProperties;
	let edgeShadow: string;

	if (primaryColor) {
		// Derive a lighter and darker tint from the primary colour for the gradient.
		const light = getLightenedColor(primaryColor, 40);
		const dark = getShadedColor(primaryColor, 40);
		backgroundStyle = {
			background: `linear-gradient(to bottom, ${light}, ${dark})`,
		};
		// Create a subtle edge shadow using a darker shade of the primary colour.
		edgeShadow = `0px 1px 0px 0px ${getShadedColor(
			primaryColor,
			30
		)}, 0 4px 6px 0 rgba(0,0,0,0.20)`;
	} else {
		// Theme-based defaults
		backgroundStyle = darkThemeEnabled
			? {
					background: `linear-gradient(to bottom, rgb(38,38,38), rgb(20,20,20))`,
			  }
			: {
					background: `linear-gradient(to bottom, #FAFAFA, #F0F0F0)`,
			  };

		edgeShadow = darkThemeEnabled
			? `0px 1px 0px 0px ${getShadedColor(
					'#000000',
					20
			  )}, 0 4px 6px 0 rgba(0,0,0,0.20)`
			: `0px 1px 0px 0px ${getShadedColor(
					'#ffffff',
					30
			  )}, 0 4px 6px 0 rgba(0,0,0,0.35)`;
	}

	return (
		<motion.div
			layoutId={layoutId}
			className={cn('rounded-lg w-full', className)}
			style={{
				boxShadow: `${edgeShadow}`,
				willChange: 'box-shadow',
				...backgroundStyle,
				...style,
			}}
			{...props}>
			{children}
		</motion.div>
	);
};

export default Flat3dContainer;

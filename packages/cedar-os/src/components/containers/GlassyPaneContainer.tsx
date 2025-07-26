import { cn } from '@/styles/stylingUtils';
import { HTMLMotionProps, motion } from 'motion/react';
import React from 'react';
import { useStyling } from '@/store/CedarStore';

interface GlassyPaneContainerProps
	extends Omit<HTMLMotionProps<'div'>, 'onDrag'> {
	children: React.ReactNode;
	/**
	 * Whether to force dark theme styling. Otherwise derives from Cedar styling store when available.
	 */
	isDarkTheme?: boolean;
	className?: string;
	layoutId?: string;
}

const GlassyPaneContainer: React.FC<GlassyPaneContainerProps> = ({
	children,
	isDarkTheme = false,
	className = '',
	layoutId,
	style,
	...props
}) => {
	/* ------------------------------------------------------------------ */
	/* Theme resolution                                                   */
	/* ------------------------------------------------------------------ */

	// Pull dark mode preference from Cedar styling slice
	const { styling } = useStyling();

	// Resolve whether dark theme should be applied
	const darkThemeEnabled = isDarkTheme || styling.darkMode;

	/* ------------------------------------------------------------------ */
	/* Styling                                                            */
	/* ------------------------------------------------------------------ */

	// Base translucent background + blur for glass effect
	const backgroundStyle = darkThemeEnabled
		? {
				background: 'rgba(23, 23, 23, 0.55)',
				backdropFilter: 'blur(12px)',
				WebkitBackdropFilter: 'blur(12px)', // Safari
		  }
		: {
				background: 'rgba(255, 255, 255, 0.35)',
				backdropFilter: 'blur(8px)',
				WebkitBackdropFilter: 'blur(8px)',
		  };

	// Subtle 3D-style shadows/highlights to lift the pane
	const boxShadow = darkThemeEnabled
		? '0 1px 0 rgba(255, 255, 255, 0.05) inset, 0 4px 8px rgba(0, 0, 0, 0.55)'
		: '0 1px 0 rgba(255, 255, 255, 0.6) inset, 0 4px 8px rgba(0, 0, 0, 0.25)';

	return (
		<motion.div
			layoutId={layoutId}
			className={cn('rounded-lg w-full', className)}
			style={{
				boxShadow,
				willChange: 'box-shadow, filter, background',
				...backgroundStyle,
				...style,
			}}
			{...props}>
			{children}
		</motion.div>
	);
};

export default GlassyPaneContainer;

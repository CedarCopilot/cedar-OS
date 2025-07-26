import React from 'react';
import { HTMLMotionProps } from 'motion/react';
import Container3D from '@/containers/Container3D';
import GlowingMesh from '@/ornaments/GlowingMesh';
import { cn } from 'cedar-os';

interface Container3DButtonProps {
	/** Additional Tailwind/CSS classes */
	className?: string;
	/** Inline styles */
	style?: React.CSSProperties;
	/** Motion props forwarded to the outer `Container3D` */
	motionProps?: HTMLMotionProps<'div'>;
	/** Click handler */
	onClick?: () => void;
	/** Optional id forwarded to outer element */
	id?: string;
	children: React.ReactNode;
	/** Enable default motion animations. Defaults to false */
	withMotion?: boolean;
	/** Optional color override for border and background */
	color?: string;
	/** Additional Tailwind/CSS classes for children */
	childClassName?: string;
}

const Container3DButton: React.FC<Container3DButtonProps> = ({
	className = '',
	childClassName = '',
	motionProps = {},
	onClick,
	children,
	id,
	withMotion = false,
	style,
	color,
}) => {
	// Compose motion props only when enabled – still allow consumer overrides
	const defaultMotionProps: HTMLMotionProps<'div'> = {
		whileHover: { scale: 1.03 },
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.2, ease: 'easeInOut' },
	};

	return (
		<button type='button'>
			<Container3D
				id={id}
				color={color}
				className={cn(
					'w-fit rounded-lg cursor-pointer inline-flex items-center overflow-hidden button',
					className
				)}
				style={style}
				motionProps={{
					...defaultMotionProps,
					...motionProps,
					onClick,
				}}>
				<div
					className={cn(
						'p-2 flex text-sm items-center whitespace-nowrap',
						childClassName
					)}>
					{children}
				</div>
				<GlowingMesh withMotion={withMotion} />
			</Container3D>
		</button>
	);
};

export default Container3DButton;

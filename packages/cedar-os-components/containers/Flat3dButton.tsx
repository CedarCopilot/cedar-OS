import React from 'react';
import { HTMLMotionProps } from 'motion/react';
import Flat3dContainer from '@/containers/Flat3dContainer';
import { cn } from 'cedar-os';

export interface Flat3dButtonProps extends HTMLMotionProps<'div'> {
	/** Optional id forwarded to the outer element */
	id?: string;
	/** Additional Tailwind/CSS classes */
	className?: string;
	/** Child elements */
	children: React.ReactNode;
	/** Optional primary colour to theme the container */
	primaryColor?: string;
}

/**
 * Flat3dButton – an interactive button based on Flat3dContainer.
 * Mirrors Container3DButton API to keep a consistent DX.
 */
const Flat3dButton: React.FC<Flat3dButtonProps> = ({
	id,
	className = '',
	children,
	primaryColor,
	whileHover = { scale: 1.01 },
	transition = { duration: 0.2, ease: 'easeInOut' },
	onClick,
	...rest
}) => {
	return (
		<Flat3dContainer
			id={id}
			className={cn('cursor-pointer flex w-full items-center', className)}
			primaryColor={primaryColor}
			whileHover={whileHover}
			transition={transition}
			{...rest}>
			<button
				onClick={(e) =>
					onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
				}
				className='w-full h-full'>
				<div className='px-2 py-2 flex text-sm items-center whitespace-nowrap'>
					{children}
				</div>
			</button>
		</Flat3dContainer>
	);
};

export default Flat3dButton;

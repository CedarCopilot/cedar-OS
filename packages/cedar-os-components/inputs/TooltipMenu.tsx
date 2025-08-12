'use client';

import React, { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../cedar-os/src/styles/stylingUtils';
import { useStyling } from '../../cedar-os/src/store/CedarStore';
import type { CedarStore } from '../../cedar-os/src/store/types';

export interface TooltipMenuItem {
	title: string;
	/** Emoji string or a Lucide icon component */
	icon: string | LucideIcon;
	onInvoke: (store: CedarStore) => void;
}

interface TooltipMenuProps {
	/** Position to display the menu */
	position: { x: number; y: number };
	/** Menu items to display */
	items: TooltipMenuItem[];
	/** Callback when menu should close */
	onClose: () => void;
	/** Optional callback when an item is clicked */
	onItemClick?: (item: TooltipMenuItem) => void;
}

export const TooltipMenu: React.FC<TooltipMenuProps> = ({
	position,
	items,
	onClose,
	onItemClick,
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const { styling } = useStyling();
	const textColor = styling.darkMode ? '#FFFFFF' : '#000000';
	const backgroundColor = styling.darkMode ? '#1F2937' : '#FFFFFF';
	const hoverColor = styling.darkMode ? '#374151' : '#F3F4F6';
	const borderColor = styling.darkMode ? '#374151' : '#E5E7EB';

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				onClose();
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleEscape);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [onClose]);

	const handleItemClick = (item: TooltipMenuItem) => {
		onItemClick?.(item);
		onClose();
	};

	return (
		<div
			ref={ref}
			style={{
				position: 'fixed',
				left: position.x,
				top: position.y,
				zIndex: 10000,
				backgroundColor,
				color: textColor,
				borderColor,
			}}
			className={cn(
				'flex gap-1 shadow-lg rounded-lg p-1 border backdrop-blur-sm',
				'animate-in fade-in-0 zoom-in-95 duration-100'
			)}>
			{items.map((item, index) => (
				<button
					key={index}
					onClick={() => handleItemClick(item)}
					className={cn(
						'p-2 rounded-md transition-colors duration-100',
						'hover:scale-105 active:scale-95 transform'
					)}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = hoverColor;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = 'transparent';
					}}
					title={item.title}>
					{typeof item.icon === 'string' ? (
						<span className='text-lg leading-none'>{item.icon}</span>
					) : (
						// Render Lucide icon component
						React.createElement(item.icon, {
							size: 16,
							strokeWidth: 1.5,
							className: 'w-4 h-4',
						})
					)}
				</button>
			))}
		</div>
	);
};

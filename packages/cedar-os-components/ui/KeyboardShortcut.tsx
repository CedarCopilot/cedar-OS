import React from 'react';

interface KeyboardShortcutProps {
	shortcut?: string;
	className?: string;
	children?: React.ReactNode;
}

export const KeyboardShortcut: React.FC<KeyboardShortcutProps> = ({
	shortcut,
	children,
	className = '',
}) => {
	return (
		<span
			className={`flex items-center justify-center px-1.5 py-0.5 min-w-[16px] rounded text-muted-foreground text-sm bg-muted-foreground/30  whitespace-nowrap ${className}`}
			aria-hidden='true'>
			{shortcut}
			{children}
		</span>
	);
};

export default KeyboardShortcut;

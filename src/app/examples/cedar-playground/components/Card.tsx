import { ReactNode } from 'react';

interface CardProps {
	title: string;
	children: ReactNode;
	className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
	return (
		<div
			className={`bg-white rounded-lg border border-gray-200 shadow-sm p-6 ${className}`}>
			<h3 className='text-lg font-semibold text-gray-900 mb-4'>{title}</h3>
			<div className='space-y-3'>{children}</div>
		</div>
	);
}

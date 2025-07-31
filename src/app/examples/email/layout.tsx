'use client';

import { ReactNode } from 'react';

export default function EmailLayout({ children }: { children: ReactNode }) {
	return (
		<div className='h-screen flex flex-col bg-white dark:bg-gray-900'>
			{children}
		</div>
	);
}

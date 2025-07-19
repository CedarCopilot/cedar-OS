'use client';

import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { format, isToday, isYesterday, isTomorrow } from 'date-fns';

export function DateColumnView({ node }: { node: any }) {
	const date = new Date(node.attrs.date);

	const getDateLabel = (date: Date) => {
		if (isToday(date)) return 'Today';
		if (isYesterday(date)) return 'Yesterday';
		if (isTomorrow(date)) return 'Tomorrow';
		return format(date, 'EEEE, MMM d');
	};

	const isCurrentDay = isToday(date);

	return (
		<NodeViewWrapper
			className={`date-column-wrapper flex-shrink-0 w-[300px] bg-white rounded-lg shadow-sm border mr-4 ${
				isCurrentDay
					? 'border-blue-400 ring-2 ring-blue-100'
					: 'border-gray-200'
			}`}
			data-date={format(date, 'yyyy-MM-dd')}>
			<div
				className={`px-4 py-3 border-b ${
					isCurrentDay
						? 'bg-blue-50 border-blue-200'
						: 'bg-gray-50 border-gray-200'
				}`}>
				<h2
					className={`font-semibold ${
						isCurrentDay ? 'text-blue-900' : 'text-gray-900'
					}`}>
					{getDateLabel(date)}
				</h2>
				<p className='text-xs text-gray-500 mt-0.5'>
					{format(date, 'MMMM d, yyyy')}
				</p>
			</div>
			<div className='p-4 space-y-4 max-h-[calc(100vh-240px)] overflow-y-auto'>
				{/* Content will be rendered here */}
			</div>
		</NodeViewWrapper>
	);
}

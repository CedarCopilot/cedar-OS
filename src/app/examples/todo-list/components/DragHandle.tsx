'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';

interface DragHandleProps {
	onDragStart?: (e: React.DragEvent) => void;
	onDragEnd?: (e: React.DragEvent) => void;
}

export function DragHandle({ onDragStart, onDragEnd }: DragHandleProps) {
	return (
		<div
			draggable
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
			className='absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded'
			contentEditable={false}>
			<GripVertical size={16} className='text-gray-400' />
		</div>
	);
}

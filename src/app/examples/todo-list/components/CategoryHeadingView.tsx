'use client';

import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../types';
import type { TodoCategory } from '../types';

export function CategoryHeadingView({ node }: { node: any }) {
	const category = node.attrs.category as TodoCategory;

	return (
		<NodeViewWrapper className='category-heading-wrapper'>
			<div
				className={`px-3 py-2 rounded-md border mb-2 ${CATEGORY_COLORS[category]}`}>
				<h3 className='text-sm font-medium'>{CATEGORY_LABELS[category]}</h3>
			</div>
		</NodeViewWrapper>
	);
}

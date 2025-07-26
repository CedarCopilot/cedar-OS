import { NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { motion } from 'framer-motion';
import React from 'react';
import { useStyling } from '../../../store/CedarStore';
import { ChoiceNodeAttributes } from './ChoiceNode';

export const ChoiceNodeView: React.FC<NodeViewProps> = ({ node }) => {
	const attrs = node.attrs as ChoiceNodeAttributes;
	const { field, selectedOption } = attrs;
	const { styling } = useStyling();

	// Common style object for styling options
	const buttonStyle = {
		// boxShadow: `0 0 0 2px white, 0 0 0 4px ${styling.color || '#FFBFE9'}, 0 0 15px rgba(255, 255, 255, 0.6)`,
		backgroundColor: styling.color
			? `${styling.color}`
			: 'rgba(255, 255, 255, 0.3)',
		color: styling.textColor || '#000000',
		// border: '1px solid rgba(255, 255, 255, 0.15)',
	};

	// Base button class
	const buttonBaseClass = `
		inline-flex items-center justify-between px-1 py-0.5 ml-1.5 mr-1
		rounded-full
		focus:outline-none focus:ring-2 focus:ring-opacity-50
		text-xs font-medium
		whitespace-nowrap
		relative 
	`;

	return (
		<NodeViewWrapper className='inline-block relative'>
			<motion.div
				layoutId={`multiple_choice_suggestion-${selectedOption}`}
				className={buttonBaseClass}
				style={buttonStyle}>
				<div className='flex items-center relative z-20'>
					{selectedOption || field}
				</div>
			</motion.div>
		</NodeViewWrapper>
	);
};

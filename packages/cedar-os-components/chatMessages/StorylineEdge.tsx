import React from 'react';
import { motion } from 'framer-motion';

interface StorylineEdgeProps {
	fromY: number;
	toY: number;
	centerX: number;
}

const StorylineEdge: React.FC<StorylineEdgeProps> = ({
	fromY,
	toY,
	centerX,
}) => {
	// For grid layout, we want to ensure the edge is centered in the first column
	// Use a straighter path with just a hint of curve for a clean look
	const path = `M ${centerX} ${fromY} C ${centerX} ${fromY + Math.min(10, (toY - fromY) / 4)}, ${centerX} ${toY - Math.min(10, (toY - fromY) / 4)}, ${centerX} ${toY}`;

	// Animation variants for path drawing
	const pathVariants = {
		hidden: { pathLength: 0, opacity: 0 },
		visible: {
			pathLength: 1,
			opacity: 1,
			transition: {
				pathLength: { duration: 0.5, ease: 'easeInOut' },
				opacity: { duration: 0.2 },
			},
		},
	};

	// Animation variants for the arrow
	const arrowVariants = {
		hidden: { opacity: 0, scale: 0 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: {
				delay: 0.4,
				duration: 0.2,
				ease: 'backOut',
			},
		},
	};

	return (
		<>
			{/* Main visible path */}
			<motion.path
				d={path}
				fill='none'
				stroke='#cbd5e1'
				strokeWidth={1.5}
				strokeDasharray='4 2'
				className='storyline-edge-path'
				variants={pathVariants}
				initial='hidden'
				animate='visible'
			/>

			{/* Arrow at the end of the path */}
			<motion.polygon
				points={`${centerX - 4},${toY - 5} ${centerX},${toY} ${centerX + 4},${toY - 5}`}
				fill='#94a3b8'
				className='storyline-edge-arrow'
				variants={arrowVariants}
				initial='hidden'
				animate='visible'
			/>
		</>
	);
};

export default StorylineEdge;

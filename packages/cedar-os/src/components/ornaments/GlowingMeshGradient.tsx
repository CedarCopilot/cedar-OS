import React from 'react';
import { motion } from 'motion/react';

interface GlowingMeshGradientProps {
	className?: string;
}

/**
 * A lightweight prismatic glow background. Use sparingly under important UI.
 */
const GlowingMeshGradient: React.FC<GlowingMeshGradientProps> = ({
	className = '',
}) => {
	return (
		<div
			className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
			{/* Primary glow */}
			<motion.div
				className='absolute'
				style={{
					borderRadius: '783.719px',
					background: '#E90B76',
					mixBlendMode: 'plus-lighter' as React.CSSProperties['mixBlendMode'],
					filter: 'blur(42px)',
					width: '55%',
					height: '55%',
					top: '-10%',
					left: '-10%',
				}}
				animate={{ x: ['0%', '5%', '-3%', '0%'], y: ['0%', '-4%', '3%', '0%'] }}
				transition={{
					duration: 18,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Secondary glow */}
			<motion.div
				className='absolute'
				style={{
					borderRadius: '783.719px',
					background: '#FF5F55',
					mixBlendMode: 'plus-lighter' as React.CSSProperties['mixBlendMode'],
					filter: 'blur(48px)',
					width: '45%',
					height: '45%',
					bottom: '-15%',
					right: '-10%',
				}}
				animate={{ x: ['0%', '-6%', '4%', '0%'], y: ['0%', '6%', '-4%', '0%'] }}
				transition={{
					duration: 22,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Accent glow */}
			<motion.div
				className='absolute'
				style={{
					borderRadius: '783.719px',
					background: '#00C9FF',
					mixBlendMode: 'plus-lighter' as React.CSSProperties['mixBlendMode'],
					filter: 'blur(32px)',
					width: '25%',
					height: '25%',
					top: '35%',
					left: '55%',
				}}
				animate={{ scale: [1, 1.2, 1] }}
				transition={{
					duration: 16,
					repeat: Infinity,
					repeatType: 'reverse',
					ease: 'easeInOut',
				}}
			/>
		</div>
	);
};

export default GlowingMeshGradient;

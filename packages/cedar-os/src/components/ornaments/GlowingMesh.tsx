import React from 'react';
import { motion } from 'motion/react';

interface GlowingMeshProps {
	className?: string;
	/** Enable motion animation. Defaults to false */
	withMotion?: boolean;
}

// Shared transition configuration for all motion elements
const baseTransition = {
	repeat: Infinity,
	repeatType: 'mirror',
	ease: 'easeInOut',
} as const;

const GlowingMesh: React.FC<GlowingMeshProps> = ({
	className = '',
	withMotion = false,
}) => {
	return (
		<div className={`absolute inset-0 overflow-hidden -z-10 ${className}`}>
			<motion.div
				className='absolute rounded-full opacity-60 mix-blend-plus-lighter'
				style={{
					background: '#E90B76',
					width: '60%',
					height: '60%',
					filter: 'blur(50px)',
				}}
				initial={{ x: '-20%', y: '-20%' }}
				animate={
					withMotion
						? {
								x: ['-20%', '20%', '-20%'],
								y: ['-20%', '20%', '-20%'],
								rotate: [0, 15, 0],
						  }
						: undefined
				}
				transition={
					withMotion ? { ...baseTransition, duration: 14 } : undefined
				}
			/>

			<motion.div
				className='absolute rounded-full opacity-55 mix-blend-plus-lighter'
				style={{
					background: '#0BE9A2',
					width: '50%',
					height: '50%',
					right: '10%',
					top: '20%',
					filter: 'blur(45px)',
				}}
				initial={{ x: '10%', y: '10%' }}
				animate={
					withMotion
						? {
								x: ['10%', '-20%', '10%'],
								y: ['10%', '-20%', '10%'],
								rotate: [10, -15, 10],
						  }
						: undefined
				}
				transition={
					withMotion ? { ...baseTransition, duration: 13 } : undefined
				}
			/>

			<motion.div
				className='absolute rounded-full opacity-50 mix-blend-plus-lighter'
				style={{
					background: '#783BEA',
					width: '45%',
					height: '45%',
					bottom: '5%',
					left: '25%',
					filter: 'blur(40px)',
				}}
				initial={{ x: '0%', y: '0%' }}
				animate={
					withMotion
						? {
								x: ['0%', '15%', '0%'],
								y: ['0%', '-15%', '0%'],
								rotate: [-5, 20, -5],
								scale: [1, 1.1, 1],
						  }
						: undefined
				}
				transition={
					withMotion ? { ...baseTransition, duration: 16 } : undefined
				}
			/>

			<motion.div
				className='absolute rounded-full opacity-45 mix-blend-plus-lighter'
				style={{
					background: '#FCD34D',
					width: '40%',
					height: '40%',
					left: '60%',
					bottom: '15%',
					filter: 'blur(45px)',
				}}
				initial={{ x: '0%', y: '0%' }}
				animate={
					withMotion
						? {
								x: ['0%', '-10%', '0%'],
								y: ['0%', '10%', '0%'],
								rotate: [0, -10, 0],
						  }
						: undefined
				}
				transition={
					withMotion ? { ...baseTransition, duration: 16 } : undefined
				}
			/>

			<motion.div
				className='absolute rounded-full opacity-40 mix-blend-plus-lighter'
				style={{
					background: '#3B82F6',
					width: '35%',
					height: '35%',
					right: '20%',
					bottom: '40%',
					filter: 'blur(35px)',
				}}
				initial={{ x: '0%', y: '0%' }}
				animate={
					withMotion
						? {
								x: ['0%', '10%', '0%'],
								y: ['0%', '-10%', '0%'],
								rotate: [0, 10, 0],
						  }
						: undefined
				}
				transition={
					withMotion ? { ...baseTransition, duration: 15 } : undefined
				}
			/>
		</div>
	);
};

export default GlowingMesh;

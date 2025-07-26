import React from 'react';
import { motion } from 'motion/react';
import { useStyling } from 'cedar-os';

interface GradientMeshProps {
	className?: string;
}

export const GradientMesh: React.FC<GradientMeshProps> = ({
	className = '',
}) => {
	const { styling } = useStyling();

	// Ensure we always work with a strict boolean
	const isDark = !!styling.darkMode;

	// Get the main color from styling with fallback
	const mainColor = styling.color || '#FFBFE9';

	// Generate colors that respect the current theme (lighter for light-mode, deeper for dark-mode)
	const prismaticColors = generatePrismaticColors(mainColor, isDark);

	const baseOpacity = isDark ? 0.2 : 0.4;

	return (
		<div className={`absolute inset-0 overflow-hidden z-0 ${className}`}>
			{/* First animated prismatic gradient */}
			<motion.div
				className='absolute rounded-full mix-blend-screen'
				style={{
					background: `radial-gradient(circle at 30% 40%, ${prismaticColors[0]} 0%, ${prismaticColors[1]} 25%, ${prismaticColors[2]} 50%, transparent 80%)`,
					width: '65%',
					height: '65%',
					filter: 'blur(25px)',
					opacity: baseOpacity,
				}}
				initial={{ x: '-10%', y: '-10%' }}
				animate={{
					x: ['0%', '15%', '-8%', '0%'],
					y: ['0%', '-15%', '15%', '0%'],
					rotate: [0, 20, -10, 0],
				}}
				transition={{
					duration: 18,
					repeat: Infinity,
					repeatType: 'reverse',
					ease: 'easeInOut',
				}}
			/>

			{/* Second animated prismatic gradient with different colors */}
			<motion.div
				className='absolute rounded-full mix-blend-screen'
				style={{
					background: `radial-gradient(circle at 70% 30%, ${prismaticColors[3]} 0%, ${prismaticColors[4]} 30%, ${prismaticColors[5]} 60%, transparent 85%)`,
					width: '70%',
					height: '70%',
					right: '0%',
					filter: 'blur(28px)',
					opacity: baseOpacity * 0.9,
				}}
				initial={{ x: '10%', y: '10%' }}
				animate={{
					x: ['5%', '-20%', '15%', '5%'],
					y: ['5%', '20%', '-15%', '5%'],
					rotate: [10, -20, 8, 10],
					scale: [1, 1.05, 0.98, 1],
				}}
				transition={{
					duration: 15,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Third animated prismatic gradient with different shape */}
			<motion.div
				className='absolute rounded-full mix-blend-screen'
				style={{
					background: `conic-gradient(from 225deg, ${prismaticColors[6]}, ${prismaticColors[7]}, ${prismaticColors[0]}, ${prismaticColors[1]}, transparent)`,
					width: '60%',
					height: '60%',
					bottom: '5%',
					left: '20%',
					filter: 'blur(22px)',
					opacity: baseOpacity * 0.8,
				}}
				initial={{ x: '0%', y: '0%' }}
				animate={{
					x: ['-15%', '8%', '-10%', '-15%'],
					y: ['8%', '-15%', '20%', '8%'],
					rotate: [-5, 30, -15, -5],
					scale: [1, 1.1, 0.95, 1],
				}}
				transition={{
					duration: 20,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Fourth prismatic element - more dynamic pulsing highlight */}
			<motion.div
				className='absolute rounded-full mix-blend-plus-lighter'
				style={{
					background: `linear-gradient(135deg, ${prismaticColors[2]}, ${prismaticColors[4]})`,
					width: '45%',
					height: '45%',
					top: '30%',
					left: '40%',
					filter: 'blur(20px)',
					opacity: baseOpacity * 0.6,
				}}
				animate={{
					scale: [1, 1.3, 1.15, 1],
					opacity: [0.25, 0.4, 0.3, 0.25],
					x: [0, 10, -15, 0],
					y: [0, -15, 5, 0],
				}}
				transition={{
					duration: 12,
					repeat: Infinity,
					repeatType: 'reverse',
					ease: 'easeInOut',
				}}
			/>

			{/* Fifth element - small moving accent */}
			<motion.div
				className='absolute rounded-full mix-blend-screen'
				style={{
					background: `radial-gradient(circle, ${prismaticColors[1]} 0%, transparent 70%)`,
					width: '25%',
					height: '25%',
					filter: 'blur(15px)',
					opacity: baseOpacity * 0.75,
				}}
				animate={{
					x: ['60%', '20%', '70%', '60%'],
					y: ['70%', '30%', '20%', '70%'],
					scale: [1, 1.2, 0.9, 1],
				}}
				transition={{
					duration: 25,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Sixth element - new brighter streak */}
			<motion.div
				className='absolute rounded-full mix-blend-plus-lighter'
				style={{
					background: `linear-gradient(180deg, ${prismaticColors[5]} 0%, transparent 70%)`,
					width: '40%',
					height: '60%',
					left: '10%',
					filter: 'blur(35px)',
					opacity: baseOpacity * 0.6,
				}}
				animate={{
					x: ['0%', '5%', '-5%', '0%'],
					y: ['0%', '-10%', '10%', '0%'],
					rotate: [0, 30, -30, 0],
				}}
				transition={{
					duration: 22,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>

			{/* Seventh element - pulsing small dot */}
			<motion.div
				className='absolute rounded-full mix-blend-screen'
				style={{
					background: prismaticColors[6],
					width: '15%',
					height: '15%',
					right: '10%',
					bottom: '15%',
					filter: 'blur(18px)',
					opacity: baseOpacity * 0.6,
				}}
				animate={{
					scale: [1, 1.4, 1],
					opacity: [0.25, 0.4, 0.25],
				}}
				transition={{
					duration: 18,
					repeat: Infinity,
					repeatType: 'mirror',
					ease: 'easeInOut',
				}}
			/>
		</div>
	);
};

// Function to generate an array of prismatic colors based on a seed color
function generatePrismaticColors(
	seedColor: string,
	darkMode: boolean
): string[] {
	// Convert seed color to HSL to use as a starting point
	const hsl = hexToHSL(seedColor);

	/*
	 * For dark mode we want colours that stay vibrant but aren't overwhelmingly bright.
	 *  - Boost saturation slightly for pop
	 *  - Pull lightness down so the gradients feel at home on a dark surface
	 */
	const baseS = darkMode
		? Math.min(hsl.s + 15, 100)
		: Math.min(hsl.s + 10, 100);
	const baseL = darkMode ? Math.max(hsl.l - 35, 20) : hsl.l;

	// Helper to clamp values and produce hsl strings
	const makeColour = (hOffset = 0, sOffset = 0, lOffset = 0) => {
		const h = (hsl.h + hOffset + 360) % 360;
		const s = Math.min(Math.max(baseS + sOffset, 0), 100);
		const l = Math.min(Math.max(baseL + lOffset, 0), 100);
		return `hsl(${h}, ${s}%, ${l}%)`;
	};

	/*
	 * Generate 8 hues around the colour wheel.
	 * Offsets have been tweaked to ensure adequate separation while
	 * keeping overall palette cohesive. Lightness offsets differ per theme.
	 */
	return [
		makeColour(0, 0, 0), // Seed
		makeColour(30, 0, darkMode ? 5 : 10),
		makeColour(60, 5, darkMode ? 5 : 0),
		makeColour(140, 0, darkMode ? 10 : 15),
		makeColour(180, 10, darkMode ? 0 : 5),
		makeColour(210, 15, -5),
		makeColour(270, 5, 0),
		makeColour(320, 0, darkMode ? 3 : 8),
	];
}

// Helper to convert hex color to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
	// Default value in case parsing fails
	const defaultHSL = { h: 340, s: 70, l: 80 }; // Pink-ish default

	// Handle non-hex colors by returning default
	if (!hex.startsWith('#')) {
		try {
			// Try to extract values from rgb/rgba strings
			const rgbMatch = hex.match(
				/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/
			);
			if (rgbMatch) {
				const r = parseInt(rgbMatch[1]) / 255;
				const g = parseInt(rgbMatch[2]) / 255;
				const b = parseInt(rgbMatch[3]) / 255;
				return rgbToHSL(r, g, b);
			}
		} catch {
			// Silently handle parsing errors by returning default
			return defaultHSL;
		}
		return defaultHSL;
	}

	// Convert hex to RGB first
	let r = 0,
		g = 0,
		b = 0;

	// 3 digits
	if (hex.length === 4) {
		r = parseInt(hex[1] + hex[1], 16) / 255;
		g = parseInt(hex[2] + hex[2], 16) / 255;
		b = parseInt(hex[3] + hex[3], 16) / 255;
	}
	// 6 digits
	else if (hex.length === 7) {
		r = parseInt(hex.substring(1, 3), 16) / 255;
		g = parseInt(hex.substring(3, 5), 16) / 255;
		b = parseInt(hex.substring(5, 7), 16) / 255;
	} else {
		return defaultHSL;
	}

	return rgbToHSL(r, g, b);
}

// Helper to convert RGB to HSL
function rgbToHSL(
	r: number,
	g: number,
	b: number
): { h: number; s: number; l: number } {
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0,
		s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}

		h *= 60;
	}

	// Return rounded values for easier use
	return {
		h: Math.round(h),
		s: Math.round(s * 100),
		l: Math.round(l * 100),
	};
}

export default GradientMesh;

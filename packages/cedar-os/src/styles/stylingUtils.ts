import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
	cloneElement,
	isValidElement,
	type ReactNode,
	type ReactElement,
} from 'react';

export const luminanceThreshold = 0.412;

/**
 * Combines class names with Tailwind's merge utility
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Convert a hex string to its RGB components
export const hexToRgb = (hex: string) => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return { r, g, b };
};

// Generate a darker (shaded) version of a color
export const getShadedColor = (hex: string, shade: number) => {
	const { r, g, b } = hexToRgb(hex);
	return `rgb(${Math.max(0, r - shade)}, ${Math.max(0, g - shade)}, ${Math.max(
		0,
		b - shade
	)})`;
};

// Generate a lighter version of a color
export const getLightenedColor = (hex: string, lighten: number) => {
	const { r, g, b } = hexToRgb(hex);
	return `rgb(${Math.min(255, r + lighten)}, ${Math.min(
		255,
		g + lighten
	)}, ${Math.min(255, b + lighten)})`;
};

/**
 * Creates a border color based on the background color
 * @param color - The background color in hex format
 */
export function createBorderColor(color: string): string {
	// For now, just shade the color by 30%
	return getShadedColor(color, 70);
}

/**
 * Determines if a color is light or dark
 * @param color - The color in hex format
 */
export function isLightColor(color: string): boolean {
	// Remove the # if it exists
	const hex = color.replace('#', '');

	// Convert 3-digit hex to 6-digit
	const fullHex =
		hex.length === 3
			? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
			: hex;

	// Convert hex to RGB
	const r = parseInt(fullHex.substring(0, 2), 16);
	const g = parseInt(fullHex.substring(2, 4), 16);
	const b = parseInt(fullHex.substring(4, 6), 16);

	// Calculate luminance
	// Formula: (0.299*R + 0.587*G + 0.114*B)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// Return true if light, false if dark
	return luminance > 0.5;
}

/**
 * Calculates appropriate text color (black or white) based on background color contrast
 * @param backgroundColor - Hex color code (with or without #)
 * @param secondary - Optional parameter to get a muted version of the text color for descriptions
 * @returns '#ffffff' for white or '#000000' for black
 */
export const getTextColorForBackground = (
	backgroundColor: string,
	secondary?: boolean
): string => {
	// Remove # if it exists
	const hex = backgroundColor.replace('#', '');

	// Convert to RGB
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	// Calculate luminance - using perceived brightness formula
	// https://www.w3.org/TR/WCAG20-TECHS/G18.html
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// Return white for dark backgrounds, black for light backgrounds
	// Threshold of 0.55 tends to work well for readability
	const baseColor = luminance > luminanceThreshold ? '#000000' : '#ffffff';

	// If secondary is true, return a more muted version of the text color
	if (secondary) {
		return luminance > luminanceThreshold ? '#374151' : '#D1D5DB';
	}

	return baseColor;
};

/**
 * Adds className to a React element if it's a valid element
 * Otherwise returns the node as-is
 */
export function withClassName(node: ReactNode, className: string): ReactNode {
	if (isValidElement(node)) {
		const element = node as ReactElement<Record<string, unknown>>;
		const existingClass = (element.props as { className?: string }).className;
		return cloneElement(element, {
			className: cn(existingClass, className),
		});
	}
	return node;
}

export const desaturateColor = (color: string) => {
	// If color is already using rgba or has opacity, return it
	if (color.startsWith('rgba')) return color;
	// If it's a hex color, convert it to have opacity
	if (color.startsWith('#')) {
		return `${color}40`; // Adding 25% opacity (40 in hex)
	}
	// If it's an rgb color or other format, assume it's rgb and add opacity
	return color.replace('rgb', 'rgba').replace(')', ', 0.7)');
};

/**
 * Calculates appropriate text color (black or white) based on background color contrast
 * @param backgroundColor - Hex color code (with or without #)
 * @returns '#ffffff' for white or '#000000' for black
 */
export const getThemeFromBackground = (backgroundColor: string): string => {
	// Remove # if it exists
	const hex = backgroundColor.replace('#', '');

	// Convert to RGB
	const r = parseInt(hex.substring(0, 2), 16);
	const g = parseInt(hex.substring(2, 4), 16);
	const b = parseInt(hex.substring(4, 6), 16);

	// Calculate luminance - using perceived brightness formula
	// https://www.w3.org/TR/WCAG20-TECHS/G18.html
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	// Return white for dark backgrounds, black for light backgrounds
	// Threshold of 0.55 tends to work well for readability
	return luminance > luminanceThreshold ? 'light' : 'dark';
};

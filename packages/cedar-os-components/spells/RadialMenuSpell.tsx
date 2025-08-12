'use client';

import type { LucideIcon } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
	useCedarStore,
	useStyling,
	useSpell,
	type ActivationConditions,
	type CedarStore,
	cn,
} from 'cedar-os';
import Container3D from '@/containers/Container3D';
// Motion for React
import { motion } from 'motion/react';

export interface RadialMenuItem {
	title: string;
	/** Emoji string or a Lucide icon component */
	icon: string | LucideIcon;
	onInvoke: (store: CedarStore) => void;
}

interface RadialMenuSpellProps {
	/** Unique identifier for this spell instance */
	spellId: string;
	/** Menu items to display */
	items: RadialMenuItem[];
	/** Activation conditions for the spell */
	activationConditions: ActivationConditions;
}

const MENU_RADIUS = 100; // px
const INNER_RADIUS = 50; // cancel zone
const INNER_GAP = 4; // gap between cancel zone and menu
const OUTER_PADDING = 10; // matches previous svg padding
const BORDER_STROKE_WIDTH = 8; // outer ring thickness

const RadialMenuSpell: React.FC<RadialMenuSpellProps> = ({
	spellId,
	items,
	activationConditions,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const { styling } = useStyling();
	const highlightColor = styling.color || '#3b82f6';
	const textColor = styling.darkMode ? '#FFFFFF' : '#000000';
	const borderColor = !styling.darkMode ? '#FFFFFF' : '#000000';
	const dividerColor = styling.darkMode ? '#FFFFFF' : '#000000';

	const [hoverIndex, setHoverIndex] = useState<number | null>(null);
	const [menuPosition, setMenuPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const isCancelActive = hoverIndex === null;
	const centerLabel = isCancelActive ? 'Cancel' : items[hoverIndex!].title;

	// Use a ref to track the hover index when deactivating
	const hoverIndexRef = useRef<number | null>(null);
	useEffect(() => {
		hoverIndexRef.current = hoverIndex;
	}, [hoverIndex]);

	// Use the new simplified useSpell hook
	useSpell({
		id: spellId,
		activationConditions,
		onActivate: (state) => {
			// If it's a mouse event, capture the position
			if (state.triggerData?.mousePosition) {
				setMenuPosition(state.triggerData.mousePosition);
			} else {
				// For keyboard activation, use center of viewport
				setMenuPosition({
					x: window.innerWidth / 2,
					y: window.innerHeight / 2,
				});
			}
		},
		onDeactivate: () => {
			// Execute the action on deactivation if an item is hovered
			if (
				hoverIndexRef.current !== null &&
				hoverIndexRef.current >= 0 &&
				hoverIndexRef.current < items.length
			) {
				items[hoverIndexRef.current].onInvoke(useCedarStore.getState());
			}
			// Then close the menu
			setMenuPosition(null);
			setHoverIndex(null);
		},
	});

	// Helpers --------------------------------------------------------
	const degToRad = (deg: number) => (deg * Math.PI) / 180;
	const radToDeg = (rad: number) => (rad * 180) / Math.PI;

	const availableDeg = 360;
	const sliceDeg = availableDeg / items.length;
	// First slice begins at 12 o'clock (90°)
	const startDeg = 90;

	// --------- Animated outer ring calculations ---------
	// Outer ring radius for border (account for visual +4px tweak)
	const ringRadius = MENU_RADIUS + OUTER_PADDING + BORDER_STROKE_WIDTH / 2;
	const ringBorderRadius = ringRadius + 4; // matches visual circles below
	const circumference = 2 * Math.PI * ringBorderRadius;
	const segmentFraction = sliceDeg / 360;
	const dashLength = circumference * segmentFraction;
	const dashArray = `${dashLength} ${circumference}`;

	// --- Rotation with shortest-path adjustment ---
	const rotationRef = useRef<number>(-startDeg); // keep previous rotation
	const rawTargetRotation =
		hoverIndex !== null ? -(startDeg + sliceDeg * (hoverIndex + 1)) : -startDeg;

	const getShortestRotation = (prev: number, target: number) => {
		let diff = target - prev;
		// Normalize diff to the (-180, 180] range for shortest path
		diff = ((diff + 180) % 360) - 180;
		return prev + diff;
	};

	const targetRotation = getShortestRotation(
		rotationRef.current,
		rawTargetRotation
	);
	// Update ref for next render
	rotationRef.current = targetRotation;

	const getIndexFromAngle = (angleDegRaw: number): number | null => {
		// Normalize angle to 0-360°
		let angleDeg = angleDegRaw;
		if (angleDeg < 0) angleDeg += 360;
		// Shift so that startDeg maps to 0
		let shifted = angleDeg - startDeg;
		// normalise into 0–availableDeg
		while (shifted < 0) shifted += 360;
		while (shifted >= availableDeg) shifted -= 360;

		if (shifted > availableDeg) return items.length - 1;

		const idx = Math.floor(shifted / sliceDeg);
		return idx;
	};

	// Event handlers -------------------------------------------------
	useEffect(() => {
		if (!menuPosition) return;

		const handleMouseMove = (e: MouseEvent) => {
			const dx = e.clientX - menuPosition.x;
			const dy = e.clientY - menuPosition.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			if (distance < INNER_RADIUS) {
				setHoverIndex(null);
				return;
			}
			const angleRad = Math.atan2(-dy, dx); // inverted Y (screen coords)
			const angleDeg = radToDeg(angleRad);
			setHoverIndex(getIndexFromAngle(angleDeg));
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				// Clear selection and close without executing
				setHoverIndex(null);
				setMenuPosition(null);
			}
		};

		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('keydown', handleEscape);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('keydown', handleEscape);
		};
	}, [menuPosition]);

	// Don't render if menu is not active
	if (!menuPosition) return null;

	// Render ---------------------------------------------------------
	return (
		<div
			ref={containerRef}
			className='fixed top-0 left-0 z-[10000] pointer-events-none'
			style={{ width: 0, height: 0 }}>
			{/* outer container with translations */}
			<div
				className='absolute pointer-events-auto'
				style={{
					left: menuPosition.x,
					top: menuPosition.y,
					transform: 'translate(-50%, -50%)',
				}}>
				{/* 3D styled outer container */}
				{(() => {
					const diameter = (MENU_RADIUS + OUTER_PADDING) * 2;
					return (
						<Container3D
							id='radial-container'
							className='rounded-full absolute'
							motionProps={{
								style: {
									width: diameter,
									height: diameter,
									left: 0,
									top: 0,
									transform: 'translate(-50%, -50%)',
								},
							}}>
							<></>
						</Container3D>
					);
				})()}

				{/* Background sectors overlay */}
				<svg
					className='absolute'
					style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
					width={MENU_RADIUS * 2 + 40}
					height={MENU_RADIUS * 2 + 40}
					viewBox={`${-(MENU_RADIUS + 22)} ${-(MENU_RADIUS + 22)} ${
						(MENU_RADIUS + 22) * 2
					} ${(MENU_RADIUS + 22) * 2}`}>
					{/* sectors */}
					{items.map((_, idx) => {
						const startA = startDeg + sliceDeg * idx;
						const endA = startA + sliceDeg;
						const largeArc = sliceDeg > 180 ? 1 : 0;
						const rOuter = MENU_RADIUS + 10;
						const rInner = INNER_RADIUS + INNER_GAP;

						// Outer arc points
						const x1Outer = rOuter * Math.cos(degToRad(startA));
						const y1Outer = -rOuter * Math.sin(degToRad(startA));
						const x2Outer = rOuter * Math.cos(degToRad(endA));
						const y2Outer = -rOuter * Math.sin(degToRad(endA));

						// Inner arc points
						const x1Inner = rInner * Math.cos(degToRad(startA));
						const y1Inner = -rInner * Math.sin(degToRad(startA));
						const x2Inner = rInner * Math.cos(degToRad(endA));
						const y2Inner = -rInner * Math.sin(degToRad(endA));

						const isActive = hoverIndex === idx;
						return (
							<path
								key={idx}
								d={`M${x1Inner} ${y1Inner} L${x1Outer} ${y1Outer} A ${rOuter} ${rOuter} 0 ${largeArc} 0 ${x2Outer} ${y2Outer} L${x2Inner} ${y2Inner} A ${rInner} ${rInner} 0 ${largeArc} 1 ${x1Inner} ${y1Inner} Z`}
								fill={isActive ? highlightColor : 'transparent'}
							/>
						);
					})}

					{/* Radial divider lines (keep section borders, remove outer arc) */}
					{items.map((_, idx) => {
						const angle = startDeg + sliceDeg * idx;
						const rOuter = MENU_RADIUS + 10;
						const rInner = INNER_RADIUS + INNER_GAP;
						const xOuter = rOuter * Math.cos(degToRad(angle));
						const yOuter = -rOuter * Math.sin(degToRad(angle));
						const xInner = rInner * Math.cos(degToRad(angle));
						const yInner = -rInner * Math.sin(degToRad(angle));
						// Highlight the two boundaries around the hovered segment
						const isBoundaryActive =
							hoverIndex !== null &&
							(idx === hoverIndex || idx === (hoverIndex + 1) % items.length);

						return (
							<line
								key={`divider-${idx}`}
								x1={xInner}
								y1={yInner}
								x2={xOuter}
								y2={yOuter}
								stroke={
									isBoundaryActive ? `highlightColor` : `${dividerColor}20`
								}
								strokeWidth={0.5}
							/>
						);
					})}

					{/* Thick base ring */}
					<circle
						r={ringBorderRadius}
						fill='none'
						stroke={borderColor}
						strokeWidth={BORDER_STROKE_WIDTH}
						opacity={0.8}
					/>

					{/* Animated highlight segment */}
					<motion.g
						initial={false}
						animate={{
							rotate: targetRotation,
							opacity: hoverIndex !== null ? 1 : 0,
						}}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						style={{ willChange: 'transform', transformOrigin: 'center' }}>
						<circle
							r={ringBorderRadius}
							fill='none'
							stroke={highlightColor}
							strokeWidth={BORDER_STROKE_WIDTH}
							strokeDasharray={dashArray}
							strokeLinecap='butt'
						/>
					</motion.g>

					{/* Inner thin ring outline (previous design) */}
					{/* <circle
						r={MENU_RADIUS + 10}
						fill='none'
						stroke={`${textColor}33`}
						strokeWidth={2}
					/> */}

					{/* Mask bottom-right quadrant removed */}
				</svg>

				{/* Items */}
				{items.map((item, idx) => {
					// Position icons at the midpoint between the inner gap boundary and the outer menu radius
					const angleDeg = startDeg + sliceDeg * (idx + 0.5);
					const angleRad = degToRad(angleDeg);
					const iconRadius = (MENU_RADIUS + INNER_RADIUS + INNER_GAP) / 2;
					const posX = iconRadius * Math.cos(angleRad);
					const posY = -iconRadius * Math.sin(angleRad);
					const isActive = hoverIndex === idx;

					return (
						<div
							key={idx}
							className={cn(
								'absolute flex flex-col items-center justify-center w-12 h-12 select-none drop-shadow font-semibold'
							)}
							style={{
								left: posX,
								top: posY,
								transform: 'translate(-50%, -50%)',
								color: textColor,
								opacity: isActive ? 1 : 0.8,
							}}>
							{typeof item.icon === 'string' ? (
								<span className='text-lg leading-none'>{item.icon}</span>
							) : (
								// Render Lucide icon component
								React.createElement(item.icon, {
									size: 18,
									strokeWidth: 1.5,
									className: 'w-5 h-5',
								})
							)}
						</div>
					);
				})}

				{/* Cancel / center */}
				{(() => {
					const cancelDiameter = INNER_RADIUS * 2;
					const separatorDiameter = cancelDiameter + 8; // slightly larger circle for visual separation

					return (
						<>
							{/* Separator circle - creates visual disconnect */}
							<div
								className='absolute rounded-full border'
								style={{
									width: separatorDiameter,
									height: separatorDiameter,
									backgroundColor: styling.darkMode
										? 'rgba(0,0,0,0.5)'
										: 'rgba(255,255,255,0.5)',
									opacity: 1,
									left: 0,
									top: 0,
									transform: 'translate(-50%, -50%)',
								}}
							/>

							{/* Main cancel button */}
							<div
								className={
									'absolute rounded-full flex items-center justify-center select-none text-center text-sm text-[12px]'
								}
								style={{
									width: cancelDiameter,
									height: cancelDiameter,
									backgroundColor: isCancelActive
										? `${highlightColor}`
										: 'transparent',
									border: `1px solid ${
										styling.darkMode ? '#374151' : '#e5e7eb'
									}`,
									// color: isCancelActive ? 'white' : textColor,
									left: 0,
									top: 0,
									transform: 'translate(-50%, -50%)',
								}}>
								{centerLabel}
							</div>
						</>
					);
				})()}
			</div>
		</div>
	);
};

export default RadialMenuSpell;

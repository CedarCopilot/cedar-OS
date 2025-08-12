'use client';

import React, { useEffect, useState } from 'react';
import { Cursor, useCursorState } from 'motion-plus-react';
import { animate, motion, useMotionValue } from 'motion/react';
import {
	useStyling,
	useSpell,
	Hotkey,
	ActivationMode,
	type ActivationConditions,
} from 'cedar-os';
// TODO: TooltipText component needs to be created
// import TooltipText from '@/components/interactions/components/TooltipText';

interface QuestioningSpellProps {
	/** Unique identifier for this spell instance */
	spellId?: string;
	/** Optional activation conditions override (defaults to 'q' key toggle) */
	activationConditions?: ActivationConditions;
}

/**
 * QuestioningSpell
 *
 * Displays a custom cursor composed of a central dot and an outer reticule.
 * The cursor colour is driven by the `styling.color` value from CedarStore.
 *
 * If the currently-hovered element (or one of its ancestors) contains the
 * `data-question` attribute, its contents are surfaced in a tooltip that
 * follows the cursor.
 *
 * Activated by pressing 'q' key by default.
 */
const QuestioningSpell: React.FC<QuestioningSpellProps> = ({
	spellId = 'questioning-spell',
	activationConditions,
}) => {
	// Default activation conditions - toggle with 'q' key
	const defaultConditions: ActivationConditions = {
		events: [Hotkey.Q],
		mode: ActivationMode.TOGGLE,
	};

	// Use the spell hook to manage activation
	const { isActive } = useSpell({
		id: spellId,
		activationConditions: activationConditions || defaultConditions,
	});

	// Cursor animation/state -----------------------------------------------------
	const state = useCursorState();
	const rotate = useMotionValue(0);

	// Debounced target tracking --------------------------------------------------
	const [hasTarget, setHasTarget] = useState(false);

	useEffect(() => {
		if (state.targetBoundingBox) {
			// Immediate lock when a target appears
			setHasTarget(true);
		} else {
			// Small delay before releasing to avoid flicker that causes unwanted spin
			const timeout = setTimeout(() => setHasTarget(false), 200);
			return () => clearTimeout(timeout);
		}
	}, [state.targetBoundingBox]);

	// Brand colour – fallback to Tailwind primary blue if undefined.
	const { styling } = useStyling();
	const highlightColor = styling.color || '#3b82f6';

	useEffect(() => {
		if (!hasTarget) {
			// No current target ➜ infinitely rotate.
			animate(rotate, [rotate.get(), rotate.get() + 360], {
				duration: 3,
				ease: 'linear',
				repeat: Infinity,
			});
		} else {
			// Snap rotation to nearest 180° to minimise spin when targeting.
			animate(rotate, Math.round(rotate.get() / 180) * 180, {
				type: 'spring',
				bounce: 0.3,
			});
		}
	}, [hasTarget, rotate]);

	// Tooltip --------------------------------------------------------------------
	const [tooltip, setTooltip] = useState<string | null>(null);
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		// Only listen for tooltips when spell is active
		if (!isActive) {
			setTooltip(null);
			return;
		}

		const handleMove = (e: MouseEvent) => {
			setMousePosition({ x: e.clientX, y: e.clientY });
			const el = (e.target as HTMLElement | null)?.closest('[data-question]');
			setTooltip(el ? el.getAttribute('data-question') : null);
		};

		window.addEventListener('mousemove', handleMove);
		return () => window.removeEventListener('mousemove', handleMove);
	}, [isActive]);

	// Don't render if spell is not active
	if (!isActive) return null;

	// Render ---------------------------------------------------------------------
	return (
		<>
			{/* Central dot */}
			{/* <Cursor
				magnetic={{ morph: false, snap: 0 }}
				style={{ width: 6, height: 6, backgroundColor: highlightColor }}
				className='pointer-events-none rounded-full'
			/> */}

			{/* Reticule */}
			<Cursor
				magnetic={{ snap: 0.9 }}
				follow
				center={{ x: 0.5, y: 0.5 }}
				style={{
					rotate,
					width: 38,
					height: 38,
					backgroundColor: 'transparent',
					borderRadius: 0,
				}}
				variants={{
					pressed: { scale: state.targetBoundingBox ? 0.9 : 0.7 },
				}}>
				<>
					<Corner color={highlightColor} top={0} left={0} />
					<Corner color={highlightColor} top={0} right={0} />
					<Corner color={highlightColor} bottom={0} left={0} />
					<Corner color={highlightColor} bottom={0} right={0} />
				</>
			</Cursor>

			{/* Tooltip - TODO: Implement when TooltipText component is available */}
			{/* {tooltip && state.targetBoundingBox && (
				<TooltipText
					content={tooltip}
					backgroundColor={highlightColor}
					position='top'
					endRect={state.targetBoundingBox as unknown as DOMRect}
					tooltipAnchor='rect'
					className='pointer-events-none'
				/>
			)} */}

			{/* Simple tooltip fallback */}
			{tooltip && (
				<div
					className='fixed z-50 px-2 py-1 text-xs text-white bg-black rounded shadow-lg pointer-events-none'
					style={{
						left: mousePosition.x,
						top: mousePosition.y - 30,
						backgroundColor: highlightColor,
					}}>
					{tooltip}
				</div>
			)}
		</>
	);
};

// -----------------------------------------------------------------------------
// Corner helper component ------------------------------------------------------
// -----------------------------------------------------------------------------
interface CornerProps {
	thickness?: number;
	length?: number;
	color: string;
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}

const Corner: React.FC<CornerProps> = ({
	thickness = 2,
	length = 10,
	color,
	...position
}) => (
	<>
		<motion.div
			layout
			className='absolute'
			style={{
				width: thickness,
				height: length,
				background: color,
				...position,
			}}
		/>
		<motion.div
			layout
			className='absolute'
			style={{
				width: length,
				height: thickness,
				background: color,
				...position,
			}}
		/>
	</>
);

export default QuestioningSpell;

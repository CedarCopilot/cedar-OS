import React, { useEffect, useCallback } from 'react';
import { useGuidance } from '@/store/CedarStore';
import {
	IFGuidance,
	Guidance,
	VirtualClickGuidance,
} from '@/store/guidance/guidanceSlice';
import VirtualCursor from './VirtualCursor';
import VirtualTypingCursor from './VirtualTypingCursor';
import ExecuteTyping from './ExecuteTyping';
import { CedarCursor } from './CedarCursor';
import DialogueBox from './DialogueBox';

import TooltipText from './TooltipText';
import ToastCard from './ToastCard';
import { motion } from 'framer-motion';
import { PositionOrElement } from '../utils/positionUtils';

interface IFGuidanceRendererProps {
	guidance: IFGuidance;
	guidanceKey: string;
	prevCursorPosition: { x: number; y: number } | null;
	isAnimatingOut: boolean;
	handleGuidanceEnd: () => void;
	handleMultiClickComplete: () => void;
	currentClickIndex: number;
	executeClick: () => void;
	dragIterationCount: number;
	isDragAnimatingOut: boolean;
	setDragIterationCount: React.Dispatch<React.SetStateAction<number>>;
	setIsDragAnimatingOut: React.Dispatch<React.SetStateAction<boolean>>;
}

const IFGuidanceRenderer: React.FC<IFGuidanceRendererProps> = ({
	guidance,
	guidanceKey,
	prevCursorPosition,
	isAnimatingOut,
	handleGuidanceEnd,
	handleMultiClickComplete,
	currentClickIndex,
	executeClick,
	dragIterationCount,
	isDragAnimatingOut,
	setDragIterationCount,
	setIsDragAnimatingOut,
}) => {
	const { nextGuidance } = useGuidance();
	const [conditionResult, setConditionResult] = React.useState<boolean | null>(
		null
	);
	const [currentGuidanceToRender, setCurrentGuidanceToRender] =
		React.useState<Guidance | null>(null);

	// Ref to track if we've set up the interval for function-based advanceMode
	const functionAdvanceModeIntervalRef = React.useRef<NodeJS.Timeout | null>(
		null
	);

	// Effect to evaluate the condition and set the guidance to render
	useEffect(() => {
		let isMounted = true;

		const setupInitialState = async () => {
			try {
				// Get initial result
				const result =
					typeof guidance.condition === 'function'
						? guidance.condition()
						: guidance.condition;

				let finalResult: boolean;

				if (result instanceof Promise) {
					finalResult = await result;
				} else {
					finalResult = !!result;
				}

				if (!isMounted) return;

				// Set the condition result and the guidance to render
				setConditionResult(finalResult);
				setCurrentGuidanceToRender(
					finalResult ? guidance.trueGuidance : guidance.falseGuidance
				);

				// Now handle the advanceCondition if it's a function
				if (typeof guidance.advanceCondition === 'function') {
					const advanceFn = guidance.advanceCondition;

					// If the function expects at least one argument, we treat it as
					// the **callback** variant – invoke once and let it call
					// `nextGuidance` (via handleGuidanceEnd) when ready.
					if (advanceFn.length >= 1) {
						(advanceFn as (next: () => void) => void)(() => {
							// Ensure we don't create a new reference every call
							handleGuidanceEnd();
						});
						return;
					}

					// Otherwise treat it as the **predicate** variant that returns
					// a boolean and should be polled until true.

					// Check once immediately
					const checkCondition = async () => {
						try {
							const shouldAdvance = (advanceFn as () => boolean)();
							if (shouldAdvance) {
								handleGuidanceEnd();
								return;
							}

							// Set up interval to periodically check the predicate (every 500 ms)
							functionAdvanceModeIntervalRef.current = setInterval(() => {
								const shouldAdvanceInterval = (advanceFn as () => boolean)();
								if (shouldAdvanceInterval) {
									handleGuidanceEnd();

									if (functionAdvanceModeIntervalRef.current) {
										clearInterval(functionAdvanceModeIntervalRef.current);
										functionAdvanceModeIntervalRef.current = null;
									}
								}
							}, 500);
						} catch (error) {
							console.error('Error in advanceCondition function:', error);
							handleGuidanceEnd(); // Proceed to next guidance anyway
						}
					};

					checkCondition();
				} else if (
					guidance.advanceCondition === 'auto' ||
					typeof guidance.advanceCondition === 'number'
				) {
					// Handle auto advance or numeric delay
					const delay =
						typeof guidance.advanceCondition === 'number'
							? guidance.advanceCondition
							: 2000; // Default 2 seconds for auto

					setTimeout(() => {
						if (isMounted) {
							handleGuidanceEnd();
						}
					}, delay);
				}
			} catch (error) {
				console.error('Error evaluating IF condition:', error);
				if (isMounted) {
					// In case of error, use the false guidance as fallback
					setConditionResult(false);
					setCurrentGuidanceToRender(guidance.falseGuidance);
				}
			}
		};

		setupInitialState();

		// Clean up interval on unmount
		return () => {
			isMounted = false;
			if (functionAdvanceModeIntervalRef.current) {
				clearInterval(functionAdvanceModeIntervalRef.current);
				functionAdvanceModeIntervalRef.current = null;
			}
		};
	}, [guidance, handleGuidanceEnd]);

	// Handler for cursor animation completion
	const handleCursorAnimationComplete = useCallback(
		(clicked: boolean) => {
			// Use type guards for different guidance types
			if (currentGuidanceToRender?.type === 'VIRTUAL_CLICK') {
				const clickGuidance = currentGuidanceToRender as VirtualClickGuidance;
				if (
					clickGuidance.advanceMode !== 'external' &&
					typeof clickGuidance.advanceMode !== 'function'
				) {
					return handleGuidanceEnd();
				}
			}

			// For VIRTUAL_DRAG with external advance mode, loop the animation
			if (currentGuidanceToRender?.type === 'VIRTUAL_DRAG') {
				// CARE -> it should default to clickable
				if (clicked && currentGuidanceToRender.advanceMode !== 'external') {
					return handleGuidanceEnd();
				}

				// Start fade-out animation
				setIsDragAnimatingOut(true);

				// After fade-out completes, increment iteration and restart animation
				setTimeout(() => {
					setDragIterationCount((prev) => prev + 1);
					setIsDragAnimatingOut(false);
				}, 300); // Duration of fadeout animation
			}
		},
		[
			handleGuidanceEnd,
			currentGuidanceToRender,
			setDragIterationCount,
			setIsDragAnimatingOut,
		]
	);

	// If we haven't evaluated the condition yet, don't render anything
	if (conditionResult === null || !currentGuidanceToRender) {
		return null;
	}

	const renderGuidanceContent = () => {
		if (!currentGuidanceToRender) return null;

		switch (currentGuidanceToRender.type) {
			case 'CURSOR_TAKEOVER':
				return (
					<CedarCursor
						key={guidanceKey}
						isRedirected={currentGuidanceToRender.isRedirected}
						messages={currentGuidanceToRender.messages}
						onAnimationComplete={handleGuidanceEnd}
						cursorColor={currentGuidanceToRender.cursorColor}
						blocking={currentGuidanceToRender.blocking}
					/>
				);

			case 'VIRTUAL_CLICK': {
				// Determine the start position
				const resolvedStartPosition: PositionOrElement | undefined =
					currentGuidanceToRender.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				// Determine the advanceMode from the guidance
				const rawAdvanceMode = currentGuidanceToRender.advanceMode;
				type CursorAdvanceMode =
					| 'auto'
					| 'external'
					| 'default'
					| number
					| (() => boolean);

				const advanceMode: CursorAdvanceMode =
					typeof rawAdvanceMode === 'function' &&
					((rawAdvanceMode as (...args: unknown[]) => unknown).length ?? 0) >= 1
						? 'default'
						: (rawAdvanceMode as CursorAdvanceMode) || 'default';

				return (
					<motion.div
						key={guidanceKey}
						initial={{ opacity: 1 }}
						animate={{ opacity: isAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentGuidanceToRender.endPosition}
							startPosition={resolvedStartPosition}
							tooltipText={currentGuidanceToRender.tooltipText}
							onAnimationComplete={handleCursorAnimationComplete}
							tooltipPosition={currentGuidanceToRender.tooltipPosition}
							tooltipAnchor={currentGuidanceToRender.tooltipAnchor}
							advanceMode={advanceMode}
							blocking={currentGuidanceToRender.blocking}
							shouldScroll={currentGuidanceToRender.shouldScroll}
							disableClickableArea={
								currentGuidanceToRender.disableClickableArea
							}
						/>
					</motion.div>
				);
			}

			case 'VIRTUAL_DRAG': {
				// Determine the start position
				const resolvedStartPosition: PositionOrElement | undefined =
					currentGuidanceToRender.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<motion.div
						key={`${guidanceKey}-drag-${dragIterationCount}`}
						initial={{ opacity: 1 }}
						animate={{ opacity: isDragAnimatingOut || isAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentGuidanceToRender.endPosition}
							startPosition={resolvedStartPosition}
							tooltipText={currentGuidanceToRender.tooltipText}
							onAnimationComplete={handleCursorAnimationComplete}
							tooltipPosition={currentGuidanceToRender.tooltipPosition}
							tooltipAnchor={currentGuidanceToRender.tooltipAnchor}
							startTooltip={currentGuidanceToRender.startTooltip}
							advanceMode={'auto'}
							shouldScroll={currentGuidanceToRender.shouldScroll}
							dragCursor={currentGuidanceToRender.dragCursor !== false}
						/>
					</motion.div>
				);
			}

			case 'MULTI_VIRTUAL_CLICK': {
				// Determine the current click guidance
				const currentClickGuidance =
					currentGuidanceToRender.guidances[currentClickIndex];

				// Determine the start position based on the click index
				let startPosition: PositionOrElement | undefined;
				if (currentClickIndex === 0) {
					// For the first click, use the previous cursor position or the specified start position
					startPosition =
						currentClickGuidance.startPosition ||
						(prevCursorPosition ? prevCursorPosition : undefined);
				} else {
					// For subsequent clicks, always use their specified start position if available,
					// otherwise fallback to the end position of the previous click
					startPosition =
						currentClickGuidance.startPosition ||
						currentGuidanceToRender.guidances[currentClickIndex - 1]
							.endPosition;
				}

				// Use the same advanceMode calculation as for VIRTUAL_CLICK
				const rawAdvanceModeMulti = currentClickGuidance.advanceMode;
				type CursorAdvanceModeMulti =
					| 'auto'
					| 'external'
					| 'default'
					| number
					| (() => boolean);

				const advanceMode: CursorAdvanceModeMulti =
					typeof rawAdvanceModeMulti === 'function' &&
					((rawAdvanceModeMulti as (...args: unknown[]) => unknown).length ??
						0) >= 1
						? 'default'
						: (rawAdvanceModeMulti as CursorAdvanceModeMulti) || 'default';

				return (
					<VirtualCursor
						key={`${guidanceKey}-${currentClickIndex}`}
						endPosition={currentClickGuidance.endPosition}
						startPosition={startPosition}
						tooltipText={currentClickGuidance.tooltipText}
						tooltipPosition={currentClickGuidance.tooltipPosition}
						tooltipAnchor={currentClickGuidance.tooltipAnchor}
						onAnimationComplete={handleMultiClickComplete}
						advanceMode={advanceMode}
					/>
				);
			}

			case 'VIRTUAL_TYPING': {
				// Determine the start position
				const typingStartPosition: PositionOrElement | undefined =
					currentGuidanceToRender.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<VirtualTypingCursor
						key={guidanceKey}
						endPosition={currentGuidanceToRender.endPosition}
						startPosition={typingStartPosition}
						expectedValue={currentGuidanceToRender.expectedValue}
						checkExistingValue={currentGuidanceToRender.checkExistingValue}
						typingDelay={currentGuidanceToRender.typingDelay}
						tooltipText={currentGuidanceToRender.tooltipText}
						tooltipPosition={currentGuidanceToRender.tooltipPosition}
						tooltipAnchor={currentGuidanceToRender.tooltipAnchor}
						advanceMode={((): 'auto' | 'external' | 'default' | number => {
							if (typeof currentGuidanceToRender.advanceMode === 'function') {
								return 'default';
							}
							return (
								(currentGuidanceToRender.advanceMode as
									| 'auto'
									| 'external'
									| 'default'
									| number
									| undefined) || 'default'
							);
						})()}
						onAnimationComplete={handleGuidanceEnd}
						blocking={currentGuidanceToRender.blocking}
					/>
				);
			}

			case 'CHAT_TOOLTIP': {
				// Find the chat button to position the tooltip
				const chatButton =
					document.querySelector('.CedarChatButton') ||
					document.querySelector('[data-cedar-chat-button]');
				const chatButtonRect = chatButton?.getBoundingClientRect();

				if (!chatButtonRect) {
					// If chat button not found, complete this guidance and go to next
					setTimeout(handleGuidanceEnd, 100);
					return null;
				}

				// Calculate centered position above chat button
				const tooltipPosition = {
					left: chatButtonRect.left + chatButtonRect.width / 2,
					top: chatButtonRect.top - 15,
				};

				return (
					<motion.div
						key={guidanceKey}
						className='fixed z-50 pointer-events-none'
						initial={{
							opacity: 0,
							scale: 0.5,
							y: 20,
						}}
						animate={{
							opacity: 1,
							scale: 1,
							y: 0,
						}}
						transition={{
							duration: 0.4,
							ease: 'easeOut',
						}}
						style={{
							position: 'fixed',
							left: `${tooltipPosition.left}px`,
							top: `${tooltipPosition.top}px`,
							transform: 'translateX(-50%)',
							transformOrigin: 'bottom center',
						}}>
						<TooltipText
							content={currentGuidanceToRender.content}
							position='top'
							textColor={currentGuidanceToRender.textColor}
							onEnd={() => handleGuidanceEnd()}
						/>
					</motion.div>
				);
			}

			case 'DIALOGUE':
				return (
					<DialogueBox
						key={guidanceKey}
						text={currentGuidanceToRender.text}
						style={currentGuidanceToRender.style}
						advanceMode={(():
							| 'auto'
							| 'external'
							| 'default'
							| number
							| (() => boolean) => {
							if (
								typeof currentGuidanceToRender.advanceMode === 'function' &&
								((
									currentGuidanceToRender.advanceMode as (
										...args: unknown[]
									) => unknown
								).length ?? 0) >= 1
							) {
								return 'default';
							}
							return (
								(currentGuidanceToRender.advanceMode as
									| 'auto'
									| 'external'
									| 'default'
									| number
									| (() => boolean)) || 'default'
							);
						})()}
						blocking={currentGuidanceToRender.blocking}
						onComplete={handleGuidanceEnd}
					/>
				);

			case 'EXECUTE_CLICK': {
				// Only render cursor animation if showCursor is true (default) or undefined
				const showCursor = currentGuidanceToRender.showCursor !== false;

				if (showCursor) {
					// Determine the start position
					const resolvedStartPosition: PositionOrElement | undefined =
						currentGuidanceToRender.startPosition ||
						(prevCursorPosition ? prevCursorPosition : undefined);

					return (
						<motion.div
							key={guidanceKey}
							initial={{ opacity: 1 }}
							animate={{ opacity: isAnimatingOut ? 0 : 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.3, ease: 'easeInOut' }}
							style={{
								position: 'fixed',
								zIndex: 9999,
								pointerEvents: 'none',
							}}>
							<VirtualCursor
								endPosition={currentGuidanceToRender.target}
								startPosition={resolvedStartPosition}
								tooltipText={currentGuidanceToRender.tooltipText}
								onAnimationComplete={executeClick}
								tooltipPosition={currentGuidanceToRender.tooltipPosition}
								advanceMode={'auto'}
								blocking={currentGuidanceToRender.blocking}
							/>
						</motion.div>
					);
				}

				// No visual component needed as the executeClick will be triggered by the useEffect
				return null;
			}

			case 'TOAST': {
				return (
					<ToastCard
						key={guidanceKey}
						title={currentGuidanceToRender.title || 'Notification'}
						description={currentGuidanceToRender.description}
						variant={currentGuidanceToRender.variant}
						position={currentGuidanceToRender.position || 'bottom-right'}
						duration={currentGuidanceToRender.duration || 4000}
						toastMode={currentGuidanceToRender.toastMode}
						action={currentGuidanceToRender.action}
						onClose={() => nextGuidance(currentGuidanceToRender.id)}
					/>
				);
			}

			case 'EXECUTE_TYPING': {
				return (
					<ExecuteTyping
						key={guidanceKey}
						endPosition={currentGuidanceToRender.endPosition}
						expectedValue={currentGuidanceToRender.expectedValue}
						onComplete={handleGuidanceEnd}
					/>
				);
			}

			case 'IDLE':
				// IDLE guidances typically don't render anything visible
				return null;

			default:
				console.error(
					'Unknown guidance type in IF condition:',
					currentGuidanceToRender
				);
				return null;
		}
	};

	return renderGuidanceContent();
};

export default IFGuidanceRenderer;

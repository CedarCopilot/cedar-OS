import React, { useEffect, useCallback } from 'react';
import { useActions } from '@/store/CedarStore';
import { IFAction, Action, VirtualClickAction } from '@/store/actionsSlice';
import VirtualCursor from './VirtualCursor';
import VirtualTypingCursor from './VirtualTypingCursor';
import ExecuteTyping from './ExecuteTyping';
import { CedarCursor } from './CedarCursor';
import DialogueBox from './DialogueBox';
import SurveyDialog from './SurveyDialog';
import TooltipText from './TooltipText';
import ToastCard from '@/components/ToastCard';
import { motion } from 'framer-motion';
import { PositionOrElement } from '../utils/positionUtils';

interface IFActionRendererProps {
	action: IFAction;
	actionKey: string;
	prevCursorPosition: { x: number; y: number } | null;
	isAnimatingOut: boolean;
	handleActionEnd: () => void;
	handleMultiClickComplete: () => void;
	currentClickIndex: number;
	executeClick: () => void;
	dragIterationCount: number;
	isDragAnimatingOut: boolean;
	setDragIterationCount: React.Dispatch<React.SetStateAction<number>>;
	setIsDragAnimatingOut: React.Dispatch<React.SetStateAction<boolean>>;
}

const IFActionRenderer: React.FC<IFActionRendererProps> = ({
	action,
	actionKey,
	prevCursorPosition,
	isAnimatingOut,
	handleActionEnd,
	handleMultiClickComplete,
	currentClickIndex,
	executeClick,
	dragIterationCount,
	isDragAnimatingOut,
	setDragIterationCount,
	setIsDragAnimatingOut,
}) => {
	const { nextAction } = useActions();
	const [currentConditionResult, setCurrentConditionResult] =
		React.useState<boolean>(false);
	const [currentRenderedAction, setCurrentRenderedAction] =
		React.useState<Action | null>(null);

	// Function to evaluate condition
	const evaluateCondition = useCallback(async () => {
		try {
			// Get initial result
			const result =
				typeof action.condition === 'function'
					? action.condition()
					: action.condition;

			// Check if result is a Promise
			if (
				typeof result === 'object' &&
				result !== null &&
				'then' in result &&
				typeof result.then === 'function'
			) {
				// Await the Promise to get the resolved value
				return await result;
			} else {
				// Use the synchronous result
				return !!result;
			}
		} catch (error) {
			console.error('Error evaluating IF condition:', error);
			return false;
		}
	}, [action.condition]);

	// Function to check advance condition
	const checkAdvanceCondition = useCallback(() => {
		if (!action.advanceCondition) return false;

		if (typeof action.advanceCondition === 'function') {
			if (action.advanceCondition.length >= 1) {
				return false;
			}
			return (action.advanceCondition as () => boolean)();
		} else if (action.advanceCondition === 'auto') {
			return true;
		} else if (action.advanceCondition === 'default') {
			return false;
		} else if (typeof action.advanceCondition === 'number') {
			return false;
		}

		return false;
	}, [action.advanceCondition]);

	// Set up initial rendered action and interval for checking conditions
	useEffect(() => {
		// Set initial condition and rendered action
		const setupInitialState = async () => {
			try {
				const initialCondition = await evaluateCondition();
				setCurrentConditionResult(initialCondition);

				// Set the initial action to render based on condition
				const childAction = initialCondition
					? (action.trueAction as Action)
					: (action.falseAction as Action);

				setCurrentRenderedAction(childAction);
			} catch (error) {
				console.error('Error setting up initial state:', error);
				// Default to false action on error
				setCurrentConditionResult(false);
				setCurrentRenderedAction(action.falseAction as Action);
			}
		};

		setupInitialState();

		// Invoke callback-style advanceCondition once if provided (length >= 1)
		if (
			typeof action.advanceCondition === 'function' &&
			action.advanceCondition.length >= 1
		) {
			(action.advanceCondition as (next: () => void) => void)(() => {
				nextAction(action.id);
			});
		}

		// Set up interval to check conditions (200ms as specified)
		const intervalId = setInterval(() => {
			// First check if we should advance to next action
			if (checkAdvanceCondition()) {
				nextAction(action.id);
				return;
			}

			// Check if we need to change the rendered action
			const checkCondition = async () => {
				try {
					const newCondition = await evaluateCondition();

					if (newCondition !== currentConditionResult) {
						setCurrentConditionResult(newCondition);

						// Update the rendered action based on new condition
						const newChildAction = newCondition
							? (action.trueAction as Action)
							: (action.falseAction as Action);

						setCurrentRenderedAction(newChildAction);
					}
				} catch (error) {
					console.error('Error checking condition:', error);
				}
			};

			checkCondition();
		}, 200);

		// Handle numeric advanceCondition
		let advanceTimeoutId: NodeJS.Timeout | null = null;
		if (typeof action.advanceCondition === 'number') {
			advanceTimeoutId = setTimeout(() => {
				nextAction(action.id);
			}, action.advanceCondition);
		}

		// Cleanup interval on unmount
		return () => {
			clearInterval(intervalId);
			if (advanceTimeoutId) clearTimeout(advanceTimeoutId);
		};
	}, [
		action,
		evaluateCondition,
		nextAction,
		checkAdvanceCondition,
		currentConditionResult,
	]);

	const handleCursorAnimationComplete = useCallback(
		(clicked: boolean) => {
			// Use type guards for different action types
			if (currentRenderedAction?.type === 'VIRTUAL_CLICK') {
				const clickAction = currentRenderedAction as VirtualClickAction;
				if (
					clickAction.advanceMode !== 'external' &&
					typeof clickAction.advanceMode !== 'function'
				) {
					// Start fade-out animation
					setIsDragAnimatingOut(true);

					// After fade-out completes, increment iteration and restart animation
					setTimeout(() => {
						setIsDragAnimatingOut(false);
						return handleActionEnd();
					}, 300); // Duration of fadeout animation
				}
			}

			// For VIRTUAL_DRAG with external advance mode, loop the animation
			if (currentRenderedAction?.type === 'VIRTUAL_DRAG') {
				// CARE -> it should default to clickable
				if (clicked && currentRenderedAction.advanceMode !== 'external') {
					return handleActionEnd();
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
		[handleActionEnd, currentRenderedAction]
	);

	// If we don't have a selected action yet, don't render anything
	if (!currentRenderedAction) {
		return null;
	}

	// Render the appropriate component based on the selected action type
	const renderActionContent = () => {
		switch (currentRenderedAction.type) {
			case 'CURSOR_TAKEOVER':
				return (
					<CedarCursor
						key={`${actionKey}-${currentConditionResult}`}
						isRedirected={currentRenderedAction.isRedirected}
						messages={currentRenderedAction.messages}
						onAnimationComplete={handleActionEnd}
						cursorColor={currentRenderedAction.cursorColor}
						blocking={currentRenderedAction.blocking}
					/>
				);

			case 'VIRTUAL_CLICK': {
				// Determine the start position - use action.startPosition if provided,
				// otherwise use the previous cursor position, or undefined if neither exists
				const resolvedStartPosition: PositionOrElement | undefined =
					currentRenderedAction.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				// Determine the advanceMode from the action
				const rawAdvanceMode = currentRenderedAction.advanceMode;
				type CursorAdvanceMode =
					| 'auto'
					| 'external'
					| 'default'
					| number
					| (() => boolean);
				const advanceMode: CursorAdvanceMode =
					typeof rawAdvanceMode === 'function' && rawAdvanceMode.length >= 1
						? 'default'
						: (rawAdvanceMode as CursorAdvanceMode) || 'default';

				return (
					<motion.div
						key={`${actionKey}-${currentConditionResult}`}
						initial={{ opacity: 1 }}
						// Virtual_CLICK has isAnimating out so that IF can handle it
						animate={{ opacity: isDragAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentRenderedAction.endPosition}
							startPosition={resolvedStartPosition}
							tooltipText={currentRenderedAction.tooltipText}
							onAnimationComplete={handleCursorAnimationComplete}
							tooltipPosition={currentRenderedAction.tooltipPosition}
							tooltipAnchor={currentRenderedAction.tooltipAnchor}
							advanceMode={advanceMode}
							blocking={currentRenderedAction.blocking}
							shouldScroll={currentRenderedAction.shouldScroll}
						/>
					</motion.div>
				);
			}

			case 'VIRTUAL_DRAG': {
				// Determine the start position - use action.startPosition if provided,
				// otherwise use the previous cursor position, or undefined if neither exists
				const resolvedStartPosition: PositionOrElement | undefined =
					currentRenderedAction.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<motion.div
						key={`${actionKey}-drag-${dragIterationCount}-${currentConditionResult}`}
						initial={{ opacity: 1 }}
						animate={{ opacity: isDragAnimatingOut || isAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentRenderedAction.endPosition}
							startPosition={resolvedStartPosition}
							tooltipText={currentRenderedAction.tooltipText}
							onAnimationComplete={(clicked) => {
								// CARE -> it should default to clickable
								if (
									clicked &&
									currentRenderedAction.advanceMode !== 'external'
								) {
									handleActionEnd();
								} else {
									// For VIRTUAL_DRAG with external advance mode, loop the animation
									// Start fade-out animation
									setIsDragAnimatingOut(true);

									// After fade-out completes, increment iteration and restart animation
									setTimeout(() => {
										setDragIterationCount((prev) => prev + 1);
										setIsDragAnimatingOut(false);
									}, 300); // Duration of fadeout animation
								}
							}}
							tooltipPosition={currentRenderedAction.tooltipPosition}
							tooltipAnchor={currentRenderedAction.tooltipAnchor}
							startTooltip={currentRenderedAction.startTooltip}
							advanceMode={'auto'}
							shouldScroll={currentRenderedAction.shouldScroll}
							dragCursor={currentRenderedAction.dragCursor !== false}
						/>
					</motion.div>
				);
			}

			case 'MULTI_VIRTUAL_CLICK': {
				// Determine the current click action
				const currentClickAction =
					currentRenderedAction.actions[currentClickIndex];

				// Determine the start position based on the click index
				let startPosition: PositionOrElement | undefined;
				if (currentClickIndex === 0) {
					// For the first click, use the previous cursor position or the specified start position
					startPosition =
						currentClickAction.startPosition ||
						(prevCursorPosition ? prevCursorPosition : undefined);
				} else {
					// For subsequent clicks, always use their specified start position if available,
					// otherwise fallback to the end position of the previous click
					startPosition =
						currentClickAction.startPosition ||
						currentRenderedAction.actions[currentClickIndex - 1].endPosition;
				}

				// Use the same advanceMode calculation as for VIRTUAL_CLICK
				const rawAdvanceModeMulti = currentClickAction.advanceMode;
				type CursorAdvanceModeMulti =
					| 'auto'
					| 'external'
					| 'default'
					| number
					| (() => boolean);
				const advanceMode: CursorAdvanceModeMulti =
					typeof rawAdvanceModeMulti === 'function' &&
					rawAdvanceModeMulti.length >= 1
						? 'default'
						: (rawAdvanceModeMulti as CursorAdvanceModeMulti) || 'default';

				return (
					<VirtualCursor
						key={`${actionKey}-${currentClickIndex}-${currentConditionResult}`}
						endPosition={currentClickAction.endPosition}
						startPosition={startPosition}
						tooltipText={currentClickAction.tooltipText}
						tooltipPosition={currentClickAction.tooltipPosition}
						tooltipAnchor={currentClickAction.tooltipAnchor}
						onAnimationComplete={handleMultiClickComplete}
						advanceMode={advanceMode}
					/>
				);
			}

			case 'VIRTUAL_TYPING': {
				// Determine the start position - use action.startPosition if provided,
				const typingStartPosition: PositionOrElement | undefined =
					currentRenderedAction.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<VirtualTypingCursor
						key={`${actionKey}-${currentConditionResult}`}
						endPosition={currentRenderedAction.endPosition}
						startPosition={typingStartPosition}
						expectedValue={currentRenderedAction.expectedValue}
						checkExistingValue={currentRenderedAction.checkExistingValue}
						typingDelay={currentRenderedAction.typingDelay}
						tooltipText={currentRenderedAction.tooltipText}
						tooltipPosition={currentRenderedAction.tooltipPosition}
						tooltipAnchor={currentRenderedAction.tooltipAnchor}
						advanceMode={
							typeof currentRenderedAction.advanceMode === 'function'
								? 'default'
								: currentRenderedAction.advanceMode || 'default'
						}
						onAnimationComplete={handleActionEnd}
						blocking={currentRenderedAction.blocking}
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
					// If chat button not found, complete this action and go to next
					setTimeout(handleActionEnd, 100);
					return null;
				}

				// Calculate centered position above chat button
				// We know TooltipText with position="top" will apply translateY(-100%)
				// So we place this at the center top of the button
				const tooltipPosition = {
					left: chatButtonRect.left + chatButtonRect.width / 2,
					top: chatButtonRect.top - 15, // Add a small vertical offset
				};

				return (
					<motion.div
						key={`${actionKey}-${currentConditionResult}`}
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
							// Only translate horizontally to center, let TooltipText handle vertical position
							transform: 'translateX(-50%)',
							transformOrigin: 'bottom center',
						}}>
						<TooltipText
							content={currentRenderedAction.content}
							position='top'
							textColor={currentRenderedAction.textColor}
						/>
					</motion.div>
				);
			}

			case 'IDLE':
				return null;

			case 'DIALOGUE':
				return (
					<DialogueBox
						key={`${actionKey}-${currentConditionResult}`}
						text={currentRenderedAction.text}
						style={currentRenderedAction.style}
						advanceMode={(():
							| 'auto'
							| 'external'
							| 'default'
							| number
							| (() => boolean) => {
							const am = currentRenderedAction.advanceMode;
							if (typeof am === 'function' && am.length >= 1) {
								return 'default';
							}
							return (
								(am as
									| 'auto'
									| 'external'
									| 'default'
									| number
									| (() => boolean)) || 'default'
							);
						})()}
						blocking={currentRenderedAction.blocking}
						onComplete={handleActionEnd}
					/>
				);

			case 'SURVEY':
				return (
					<SurveyDialog
						key={`${actionKey}-${currentConditionResult}`}
						title={currentRenderedAction.title}
						description={currentRenderedAction.description}
						questions={currentRenderedAction.questions}
						open={true}
						onOpenChange={(open) => {
							if (!open && !currentRenderedAction.blocking) {
								handleActionEnd();
							}
						}}
						submitButtonText={currentRenderedAction.submitButtonText}
						cancelButtonText={currentRenderedAction.cancelButtonText}
						onSubmit={(responses) => {
							currentRenderedAction.onSubmit?.(responses);
							handleActionEnd();
						}}
						blocking={currentRenderedAction.blocking}
						trigger_id={currentRenderedAction.trigger_id}
					/>
				);

			case 'EXECUTE_CLICK': {
				const showCursor = currentRenderedAction.showCursor !== false;

				if (showCursor) {
					const resolvedStartPosition: PositionOrElement | undefined =
						currentRenderedAction.startPosition ||
						(prevCursorPosition ? prevCursorPosition : undefined);

					return (
						<motion.div
							key={`${actionKey}-${currentConditionResult}`}
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
								endPosition={currentRenderedAction.target}
								startPosition={resolvedStartPosition}
								tooltipText={currentRenderedAction.tooltipText}
								onAnimationComplete={executeClick}
								tooltipPosition={currentRenderedAction.tooltipPosition}
								advanceMode={'auto'}
								blocking={currentRenderedAction.blocking}
							/>
						</motion.div>
					);
				}

				return null;
			}

			case 'TOAST': {
				return (
					<ToastCard
						key={`${actionKey}-${currentConditionResult}`}
						title={currentRenderedAction.title || 'Notification'}
						description={currentRenderedAction.description}
						variant={currentRenderedAction.variant}
						position={currentRenderedAction.position || 'bottom-right'}
						duration={currentRenderedAction.duration || 4000}
						toastMode={currentRenderedAction.toastMode}
						action={currentRenderedAction.action}
						onClose={() => nextAction(currentRenderedAction.id)}
					/>
				);
			}

			case 'EXECUTE_TYPING': {
				return (
					<ExecuteTyping
						key={`${actionKey}-${currentConditionResult}`}
						endPosition={currentRenderedAction.endPosition}
						expectedValue={currentRenderedAction.expectedValue}
						onComplete={handleActionEnd}
					/>
				);
			}

			default:
				console.error(
					'Unknown action type in IF condition:',
					currentRenderedAction
				);
				return null;
		}
	};

	return renderActionContent();
};

export default IFActionRenderer;

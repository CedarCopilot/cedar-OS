'use client';

import { getPositionFromElement } from '@/components/guidance';
import { CedarCursor } from '@/components/guidance/components/CedarCursor';
import DialogueBanner from '@/components/guidance/components/DialogueBanner';
import DialogueBox from '@/components/guidance/components/DialogueBox';
import ExecuteTyping from '@/components/guidance/components/ExecuteTyping';
import HighlightOverlay from '@/components/guidance/components/HighlightOverlay';
import RightClickIndicator from '@/components/guidance/components/RightClickIndicator';
import SurveyDialog from '@/components/guidance/components/SurveyDialog';
import TooltipText from '@/components/guidance/components/TooltipText';
import VirtualCursor from '@/components/guidance/components/VirtualCursor';
import VirtualTypingCursor from '@/components/guidance/components/VirtualTypingCursor';
import { PositionOrElement } from '@/components/guidance/utils/positionUtils';
import ToastCard from '@/components/ToastCard';
import {
	ChatAction,
	DialogueBannerAction,
	GateIfAction,
	VirtualClickAction,
	VirtualDragAction,
	VirtualTypingAction,
} from '@/store/actionsSlice';
import { useActions, useMessages } from '@/store/CedarStore';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import IFActionRenderer from './guidance/components/IFActionRenderer';

// Simplified ActionRenderer that delegates IF rendering to IFActionRenderer
const ActionRenderer: React.FC = () => {
	const {
		currentAction,
		nextAction,
		isActive,
		prevCursorPosition,
		isAnimatingOut,
		addActionsToStart,
	} = useActions();

	// Message helpers
	const { addMessage } = useMessages();

	const [actionKey, setActionKey] = useState('');
	const [currentClickIndex, setCurrentClickIndex] = useState(0);
	const [dragIterationCount, setDragIterationCount] = useState(0);
	const [isDragAnimatingOut, setIsDragAnimatingOut] = useState(false);
	const throttleRef = useRef(false);
	const executeClickTargetRef = useRef<PositionOrElement | null>(null);
	const functionAdvanceModeIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Call next action when animation completes
	const handleActionEnd = useCallback(() => {
		nextAction(currentAction?.id);
	}, [currentAction, nextAction]);

	// Initialize to user's cursor position and set up tracking
	useEffect(() => {
		// Function to update cursor position
		const updateCursorPosition = (e: MouseEvent) => {
			// Skip update if we're throttling
			if (throttleRef.current) return;

			// Set throttle flag
			throttleRef.current = true;

			// Create position object
			const position = {
				x: e.clientX,
				y: e.clientY,
			};

			// Store position in DOM for direct access by components
			document.body.setAttribute(
				'data-cursor-position',
				JSON.stringify(position)
			);

			// Clear throttle after delay
			const throttleTimeout = setTimeout(() => {
				throttleRef.current = false;
			}, 16); // ~60fps (1000ms/60)

			return () => clearTimeout(throttleTimeout);
		};

		// Add event listener for mouse movement
		document.addEventListener('mousemove', updateCursorPosition);
		// Clean up event listener on component unmount
		return () => {
			document.removeEventListener('mousemove', updateCursorPosition);
		};
	}, []);

	// When the action changes, update the key to force a complete re-render
	useEffect(() => {
		// Handle CHAT actions: dispatch MessageInput(s) via addMessage
		if (currentAction?.type === 'CHAT') {
			const chatAction = currentAction as ChatAction;
			{
				const runChat = async () => {
					// Primary message
					const delay = chatAction.messageDelay ?? 0;
					if (delay > 0) {
						await new Promise((res) => setTimeout(res, delay));
					}
					addMessage(chatAction.content);
					if (chatAction.autoAdvance !== false) {
						handleActionEnd();
					}

					// Custom messages
					if (chatAction.customMessages) {
						for (const msg of chatAction.customMessages) {
							const msgDelay = msg.messageDelay ?? 0;
							if (msgDelay > 0) {
								await new Promise((res) => setTimeout(res, msgDelay));
							}
							addMessage(msg.content);
							if (msg.autoAdvance !== false) {
								handleActionEnd();
							}
						}
					}
				};
				runChat();
			}
		}

		if (currentAction?.id) {
			setActionKey(currentAction.id);
			setCurrentClickIndex(0);
			setDragIterationCount(0);
			setIsDragAnimatingOut(false);

			// Handle GATE_IF actions by evaluating the condition once and adding appropriate actions
			if (currentAction.type === 'GATE_IF') {
				const gateIfAction = currentAction as GateIfAction;

				// Get the condition result
				const evaluateCondition = async () => {
					try {
						// Get initial result
						const result =
							typeof gateIfAction.condition === 'function'
								? gateIfAction.condition()
								: gateIfAction.condition;

						let finalResult: boolean;

						if (result instanceof Promise) {
							finalResult = await result;
						} else {
							finalResult = !!result;
						}

						// Add the appropriate actions to the queue based on the result
						if (finalResult) {
							addActionsToStart(gateIfAction.trueActions);
						} else {
							addActionsToStart(gateIfAction.falseActions);
						}
					} catch (error) {
						console.error('Error evaluating GATE_IF condition:', error);
						// In case of error, add the falseActions as fallback
						addActionsToStart(gateIfAction.falseActions);
					}
				};

				// Start the evaluation process
				evaluateCondition();

				return;
			}

			// Store target for EXECUTE_CLICK actions
			if (currentAction.type === 'EXECUTE_CLICK') {
				executeClickTargetRef.current = currentAction.target;
			} else {
				executeClickTargetRef.current = null;
			}

			// Clean up any existing interval
			if (functionAdvanceModeIntervalRef.current) {
				clearInterval(functionAdvanceModeIntervalRef.current);
				functionAdvanceModeIntervalRef.current = null;
			}

			// Set up interval for function-based advanceMode
			// Use proper type guards to ensure we're dealing with the right action types
			if (
				currentAction.type === 'VIRTUAL_CLICK' ||
				currentAction.type === 'VIRTUAL_DRAG' ||
				currentAction.type === 'VIRTUAL_TYPING'
			) {
				// Now we know it's a VirtualClickAction, VirtualDragAction, or VirtualTypingAction and has advanceMode
				const clickOrDragAction = currentAction as
					| VirtualClickAction
					| VirtualDragAction
					| VirtualTypingAction;

				if (typeof clickOrDragAction.advanceMode === 'function') {
					const advanceFn = clickOrDragAction.advanceMode;

					// If the function expects at least one argument, we treat it as
					// the **callback** variant – invoke once and let it call
					// `nextAction` (via handleActionEnd) when ready.
					if (advanceFn.length >= 1) {
						(advanceFn as (next: () => void) => void)(() => {
							// Ensure we don't create a new reference every call
							handleActionEnd();
						});
						// No polling interval in this mode
						return;
					}

					// Otherwise treat it as the **predicate** variant that returns
					// a boolean and should be polled until true.

					if ((advanceFn as () => boolean)()) {
						// If the predicate returns true immediately, advance on next tick
						setTimeout(() => handleActionEnd(), 0);
						return;
					}

					// Set up interval to periodically check the predicate (every 500 ms)
					functionAdvanceModeIntervalRef.current = setInterval(() => {
						const shouldAdvance = (advanceFn as () => boolean)();
						if (shouldAdvance) {
							handleActionEnd();

							if (functionAdvanceModeIntervalRef.current) {
								clearInterval(functionAdvanceModeIntervalRef.current);
								functionAdvanceModeIntervalRef.current = null;
							}
						}
					}, 500);
				}
			}
		}

		// Clean up interval on unmount or when currentAction changes
		return () => {
			if (functionAdvanceModeIntervalRef.current) {
				clearInterval(functionAdvanceModeIntervalRef.current);
				functionAdvanceModeIntervalRef.current = null;
			}
		};
	}, [
		currentAction?.id,
		currentAction?.type,
		handleActionEnd,
		addActionsToStart,
		addMessage,
		nextAction,
	]);

	// Function to execute the actual click - now outside of conditional blocks
	const executeClick = useCallback(() => {
		// Exit if no current action or not an execute click action
		if (!currentAction || currentAction.type !== 'EXECUTE_CLICK') {
			return;
		}

		try {
			// Get the target element - properly handling lazy elements
			let targetElement: PositionOrElement = currentAction.target;

			// Check if this is a lazy element and resolve it if needed
			if (
				targetElement &&
				typeof targetElement === 'object' &&
				'_lazy' in targetElement &&
				targetElement._lazy
			) {
				targetElement = targetElement.resolve() as PositionOrElement;
			}

			// Check if we have a ref
			if (
				targetElement &&
				typeof targetElement === 'object' &&
				'current' in targetElement
			) {
				targetElement = targetElement.current as PositionOrElement;
			}

			// Handle string selectors
			if (typeof targetElement === 'string') {
				const element = document.querySelector(targetElement);
				if (element instanceof HTMLElement) {
					targetElement = element;
				}
			}

			// Check if we have a DOM element
			if (targetElement instanceof Element) {
				// First, ensure the element is in view
				if (currentAction.shouldScroll !== false) {
					targetElement.scrollIntoView({
						behavior: 'smooth',
						block: 'center',
					});
				}

				// Trigger click after a short delay to allow for scrolling
				setTimeout(() => {
					// Create and dispatch a click event
					const clickEvent = new MouseEvent('click', {
						bubbles: true,
						cancelable: true,
						view: window,
					});
					targetElement.dispatchEvent(clickEvent);

					// Move to the next action
					handleActionEnd();
				}, 300);
			} else {
				// Handle case where we have coordinates instead of an element
				const position = getPositionFromElement(targetElement);
				if (position) {
					// Find the element at the position coordinates
					const elementAtPosition = document.elementFromPoint(
						position.x,
						position.y
					) as HTMLElement | null;

					if (elementAtPosition) {
						// First, ensure the element is in view if needed
						if (currentAction.shouldScroll !== false) {
							elementAtPosition.scrollIntoView({
								behavior: 'smooth',
								block: 'center',
							});
						}

						// Short delay to allow for scrolling
						setTimeout(() => {
							// Create and dispatch a click event
							const clickEvent = new MouseEvent('click', {
								bubbles: true,
								cancelable: true,
								view: window,
							});
							elementAtPosition.dispatchEvent(clickEvent);

							// Move to the next action
							handleActionEnd();
						}, 300);
					} else {
						console.error('No element found at the specified position');
						handleActionEnd(); // Proceed to next action anyway
					}
				} else {
					console.error('Unable to execute click: Invalid target');
					handleActionEnd(); // Proceed to next action anyway
				}
			}
		} catch (error) {
			console.error('Error executing click:', error);
			handleActionEnd(); // Proceed to next action anyway
		}
	}, [currentAction, handleActionEnd]);

	// Modified effect to handle IDLE actions with automatic duration
	useEffect(() => {
		if (!currentAction) return;

		if (currentAction.type === 'IDLE') {
			if (currentAction.duration) {
				const timeout = setTimeout(() => {
					nextAction(currentAction.id);
				}, currentAction.duration);

				return () => clearTimeout(timeout);
			}
			if (currentAction.advanceFunction) {
				currentAction.advanceFunction(() => {
					nextAction(currentAction.id);
				});
			}
		}

		// Handle auto-completing CHAT_TOOLTIP actions with duration
		if (currentAction.type === 'CHAT_TOOLTIP' && currentAction.duration) {
			const timeout = setTimeout(() => {
				nextAction(currentAction.id);
			}, currentAction.duration);

			return () => clearTimeout(timeout);
		}

		// Handle EXECUTE_CLICK actions without animation - directly execute the click
		if (
			currentAction.type === 'EXECUTE_CLICK' &&
			currentAction.showCursor === false
		) {
			// Execute click directly rather than setting a state
			executeClick();
		}
	}, [currentAction, nextAction, executeClick, handleActionEnd]);

	// Handler for cursor animation completion
	const handleCursorAnimationComplete = useCallback(
		(clicked: boolean) => {
			// Use type guards for different action types
			if (currentAction?.type === 'VIRTUAL_CLICK') {
				const clickAction = currentAction as VirtualClickAction;
				if (
					clickAction.advanceMode !== 'external' &&
					typeof clickAction.advanceMode !== 'function'
				) {
					return handleActionEnd();
				}
			}

			// For VIRTUAL_DRAG with external advance mode, loop the animation
			if (currentAction?.type === 'VIRTUAL_DRAG') {
				// CARE -> it should default to clickable
				if (clicked && currentAction.advanceMode !== 'external') {
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
		[handleActionEnd, currentAction]
	);

	// Handler for MULTI_VIRTUAL_CLICK completion
	const handleMultiClickComplete = useCallback(() => {
		if (currentAction?.type === 'MULTI_VIRTUAL_CLICK') {
			// If there are more clicks to go through
			if (currentClickIndex < currentAction.actions.length - 1) {
				// Move to the next click
				setCurrentClickIndex((prevIndex) => prevIndex + 1);
			} else if (currentAction.loop) {
				// If looping is enabled, start from the beginning
				setCurrentClickIndex(0);
			} else if (currentAction.advanceMode !== 'external') {
				// Complete the entire action only if advanceMode is not 'external'
				handleActionEnd();
			}
		}
	}, [currentAction, currentClickIndex, handleActionEnd]);

	// Handle delay between clicks for MULTI_VIRTUAL_CLICK
	useEffect(() => {
		if (
			currentAction?.type === 'MULTI_VIRTUAL_CLICK' &&
			currentClickIndex > 0
		) {
			const defaultDelay = 500; // Default delay between clicks in ms
			const delay =
				currentAction.delay !== undefined ? currentAction.delay : defaultDelay;

			// Apply delay before showing the next click
			const timer = setTimeout(() => {
				// This empty timeout just creates a delay
			}, delay);

			return () => clearTimeout(timer);
		}
	}, [currentAction, currentClickIndex]);

	// If there's no current action or the animation system is inactive, don't render anything
	if (!isActive || !currentAction) {
		return null;
	}

	// Render the appropriate component based on action type
	switch (currentAction.type) {
		case 'IF':
			return (
				<IFActionRenderer
					key={actionKey}
					action={currentAction}
					actionKey={actionKey}
					prevCursorPosition={prevCursorPosition}
					isAnimatingOut={isAnimatingOut}
					handleActionEnd={handleActionEnd}
					handleMultiClickComplete={handleMultiClickComplete}
					currentClickIndex={currentClickIndex}
					executeClick={executeClick}
					dragIterationCount={dragIterationCount}
					isDragAnimatingOut={isDragAnimatingOut}
					setDragIterationCount={setDragIterationCount}
					setIsDragAnimatingOut={setIsDragAnimatingOut}
				/>
			);
		case 'GATE_IF':
			// GATE_IF actions are handled in the useEffect and don't need special rendering
			return null;
		case 'CURSOR_TAKEOVER':
			return (
				<CedarCursor
					key={actionKey}
					isRedirected={currentAction.isRedirected}
					messages={currentAction.messages}
					onAnimationComplete={handleActionEnd}
					cursorColor={currentAction.cursorColor}
					blocking={currentAction.blocking}
				/>
			);

		case 'VIRTUAL_CLICK': {
			// Determine the start position - use action.startPosition if provided,
			// otherwise use the previous cursor position, or undefined if neither exists
			const resolvedStartPosition: PositionOrElement | undefined =
				currentAction.startPosition ||
				(prevCursorPosition ? prevCursorPosition : undefined);

			// Determine the advanceMode from the action – if the provided value
			// is a **callback** variant (expects an argument), fall back to
			// 'default' as VirtualCursor itself doesn't need to know about it.
			const rawAdvanceMode = currentAction.advanceMode;
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
					key={actionKey}
					initial={{ opacity: 1 }}
					animate={{ opacity: isAnimatingOut ? 0 : 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
					<VirtualCursor
						endPosition={currentAction.endPosition}
						startPosition={resolvedStartPosition}
						tooltipText={currentAction.tooltipText}
						onAnimationComplete={handleCursorAnimationComplete}
						tooltipPosition={currentAction.tooltipPosition}
						tooltipAnchor={currentAction.tooltipAnchor}
						advanceMode={advanceMode}
						blocking={currentAction.blocking}
						shouldScroll={currentAction.shouldScroll}
						disableClickableArea={currentAction.disableClickableArea}
					/>
				</motion.div>
			);
		}

		case 'VIRTUAL_DRAG': {
			// Determine the start position - use action.startPosition if provided,
			// otherwise use the previous cursor position, or undefined if neither exists
			const resolvedStartPosition: PositionOrElement | undefined =
				currentAction.startPosition ||
				(prevCursorPosition ? prevCursorPosition : undefined);

			return (
				<motion.div
					key={`${actionKey}-drag-${dragIterationCount}`}
					initial={{ opacity: 1 }}
					animate={{ opacity: isDragAnimatingOut || isAnimatingOut ? 0 : 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.3, ease: 'easeInOut' }}
					style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
					<VirtualCursor
						endPosition={currentAction.endPosition}
						startPosition={resolvedStartPosition}
						tooltipText={currentAction.tooltipText}
						onAnimationComplete={handleCursorAnimationComplete}
						tooltipPosition={currentAction.tooltipPosition}
						tooltipAnchor={currentAction.tooltipAnchor}
						startTooltip={currentAction.startTooltip}
						advanceMode={'auto'}
						shouldScroll={currentAction.shouldScroll}
						dragCursor={currentAction.dragCursor !== false}
					/>
				</motion.div>
			);
		}

		case 'MULTI_VIRTUAL_CLICK': {
			// Determine the current click action
			const currentClickAction = currentAction.actions[currentClickIndex];

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
					currentAction.actions[currentClickIndex - 1].endPosition;
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
				((rawAdvanceModeMulti as (...args: unknown[]) => unknown).length ??
					0) >= 1
					? 'default'
					: (rawAdvanceModeMulti as CursorAdvanceModeMulti) || 'default';

			return (
				<VirtualCursor
					key={`${actionKey}-${currentClickIndex}`}
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
				currentAction.startPosition ||
				(prevCursorPosition ? prevCursorPosition : undefined);

			return (
				<VirtualTypingCursor
					key={actionKey}
					endPosition={currentAction.endPosition}
					startPosition={typingStartPosition}
					expectedValue={currentAction.expectedValue}
					checkExistingValue={currentAction.checkExistingValue}
					typingDelay={currentAction.typingDelay}
					tooltipText={currentAction.tooltipText}
					tooltipPosition={currentAction.tooltipPosition}
					tooltipAnchor={currentAction.tooltipAnchor}
					advanceMode={((): 'auto' | 'external' | 'default' | number => {
						if (typeof currentAction.advanceMode === 'function') {
							return 'default';
						}
						return (
							(currentAction.advanceMode as
								| 'auto'
								| 'external'
								| 'default'
								| number
								| undefined) || 'default'
						);
					})()}
					onAnimationComplete={handleActionEnd}
					blocking={currentAction.blocking}
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
					key={actionKey}
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
						content={currentAction.content}
						position='top'
						textColor={currentAction.textColor}
						onEnd={() => handleActionEnd()}
					/>
				</motion.div>
			);
		}

		case 'CHAT':
			return null;

		case 'IDLE':
			return null;

		case 'DIALOGUE':
			return (
				<>
					{currentAction.highlightElements && (
						<HighlightOverlay
							elements={currentAction.highlightElements}
							shouldScroll={currentAction.shouldScroll}
						/>
					)}
					<DialogueBox
						key={actionKey}
						text={currentAction.text}
						style={currentAction.style}
						advanceMode={(():
							| 'auto'
							| 'external'
							| 'default'
							| number
							| (() => boolean) => {
							if (
								typeof currentAction.advanceMode === 'function' &&
								((currentAction.advanceMode as (...args: unknown[]) => unknown)
									.length ?? 0) >= 1
							) {
								return 'default';
							}
							return (
								(currentAction.advanceMode as
									| 'auto'
									| 'external'
									| 'default'
									| number
									| (() => boolean)) || 'default'
							);
						})()}
						blocking={currentAction.blocking}
						onComplete={handleActionEnd}
					/>
				</>
			);

		case 'DIALOGUE_BANNER': {
			const bannerAction = currentAction as DialogueBannerAction & {
				children?: React.ReactNode;
			};
			return (
				<DialogueBanner
					key={actionKey}
					style={bannerAction.style}
					advanceMode={bannerAction.advanceMode}
					onComplete={handleActionEnd}>
					{bannerAction.children ?? bannerAction.text}
				</DialogueBanner>
			);
		}

		case 'SURVEY':
			return (
				<SurveyDialog
					key={actionKey}
					title={currentAction.title}
					description={currentAction.description}
					questions={currentAction.questions}
					open={true}
					onOpenChange={(open) => {
						if (!open && !currentAction.blocking) {
							handleActionEnd();
						}
					}}
					submitButtonText={currentAction.submitButtonText}
					cancelButtonText={currentAction.cancelButtonText}
					onSubmit={(responses) => {
						currentAction.onSubmit?.(responses);
						handleActionEnd();
					}}
					blocking={currentAction.blocking}
					trigger_id={currentAction.trigger_id}
				/>
			);

		case 'EXECUTE_CLICK': {
			// Only render cursor animation if showCursor is true (default) or undefined
			const showCursor = currentAction.showCursor !== false;

			if (showCursor) {
				// Determine the start position - use action.startPosition if provided,
				// otherwise use the previous cursor position, or undefined if neither exists
				const resolvedStartPosition: PositionOrElement | undefined =
					currentAction.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<motion.div
						key={actionKey}
						initial={{ opacity: 1 }}
						animate={{ opacity: isAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentAction.target}
							startPosition={resolvedStartPosition}
							tooltipText={currentAction.tooltipText}
							onAnimationComplete={executeClick}
							tooltipPosition={currentAction.tooltipPosition}
							advanceMode={'auto'}
							blocking={currentAction.blocking}
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
					key={actionKey}
					title={currentAction.title || 'Notification'}
					description={currentAction.description}
					variant={currentAction.variant}
					position={currentAction.position || 'bottom-right'}
					duration={currentAction.duration || 4000}
					toastMode={currentAction.toastMode}
					action={currentAction.action}
					onClose={() => nextAction(currentAction.id)}
				/>
			);
		}

		case 'EXECUTE_TYPING': {
			return (
				<ExecuteTyping
					key={actionKey}
					endPosition={currentAction.endPosition}
					expectedValue={currentAction.expectedValue}
					onComplete={handleActionEnd}
				/>
			);
		}

		case 'RIGHT_CLICK': {
			return (
				<RightClickIndicator
					key={actionKey}
					duration={currentAction.duration || 2000}
					onComplete={handleActionEnd}
				/>
			);
		}

		default:
			console.error('Unknown action type:', currentAction);
			return null;
	}
};

export default ActionRenderer;

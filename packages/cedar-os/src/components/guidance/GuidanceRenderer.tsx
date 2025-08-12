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
import ToastCard from '@/components/guidance/components/ToastCard';
import {
	ChatGuidance,
	DialogueBannerGuidance,
	GateIfGuidance,
	VirtualClickGuidance,
	VirtualDragGuidance,
	VirtualTypingGuidance,
} from '@/store/guidance/guidanceSlice';
import { useGuidance, useMessages } from '@/store/CedarStore';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import IFGuidanceRenderer from '@/components/guidance/components/IFGuidanceRenderer';

// Simplified GuidanceRenderer that delegates IF rendering to IFGuidanceRenderer
const GuidanceRenderer: React.FC = () => {
	const {
		currentGuidance,
		nextGuidance,
		isActive,
		prevCursorPosition,
		isAnimatingOut,
		addGuidancesToStart,
	} = useGuidance();

	// Message helpers
	const { addMessage } = useMessages();

	const [guidanceKey, setGuidanceKey] = useState('');
	const [currentClickIndex, setCurrentClickIndex] = useState(0);
	const [dragIterationCount, setDragIterationCount] = useState(0);
	const [isDragAnimatingOut, setIsDragAnimatingOut] = useState(false);
	const throttleRef = useRef(false);
	const executeClickTargetRef = useRef<PositionOrElement | null>(null);
	const functionAdvanceModeIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Call next guidance when animation completes
	const handleGuidanceEnd = useCallback(() => {
		nextGuidance(currentGuidance?.id);
	}, [currentGuidance, nextGuidance]);

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

	// When the guidance changes, update the key to force a complete re-render
	useEffect(() => {
		// Handle CHAT guidances: dispatch MessageInput(s) via addMessage
		if (currentGuidance?.type === 'CHAT') {
			const chatGuidance = currentGuidance as ChatGuidance;
			{
				const runChat = async () => {
					// Primary message
					const delay = chatGuidance.messageDelay ?? 0;
					if (delay > 0) {
						await new Promise((res) => setTimeout(res, delay));
					}
					addMessage(chatGuidance.content);
					if (chatGuidance.autoAdvance !== false) {
						handleGuidanceEnd();
					}

					// Custom messages
					if (chatGuidance.customMessages) {
						for (const msg of chatGuidance.customMessages) {
							const msgDelay = msg.messageDelay ?? 0;
							if (msgDelay > 0) {
								await new Promise((res) => setTimeout(res, msgDelay));
							}
							addMessage(msg.content);
							if (msg.autoAdvance !== false) {
								handleGuidanceEnd();
							}
						}
					}
				};
				runChat();
			}
		}

		if (currentGuidance?.id) {
			setGuidanceKey(currentGuidance.id);
			setCurrentClickIndex(0);
			setDragIterationCount(0);
			setIsDragAnimatingOut(false);

			// Handle GATE_IF guidances by evaluating the condition once and adding appropriate guidances
			if (currentGuidance.type === 'GATE_IF') {
				const gateIfGuidance = currentGuidance as GateIfGuidance;

				// Get the condition result
				const evaluateCondition = async () => {
					try {
						// Get initial result
						const result =
							typeof gateIfGuidance.condition === 'function'
								? gateIfGuidance.condition()
								: gateIfGuidance.condition;

						let finalResult: boolean;

						if (result instanceof Promise) {
							finalResult = await result;
						} else {
							finalResult = !!result;
						}

						// Add the appropriate guidances to the queue based on the result
						if (finalResult) {
							addGuidancesToStart(gateIfGuidance.trueGuidances);
						} else {
							addGuidancesToStart(gateIfGuidance.falseGuidances);
						}
					} catch (error) {
						console.error('Error evaluating GATE_IF condition:', error);
						// In case of error, add the falseGuidances as fallback
						addGuidancesToStart(gateIfGuidance.falseGuidances);
					}
				};

				// Start the evaluation process
				evaluateCondition();

				return;
			}

			// Store target for EXECUTE_CLICK guidances
			if (currentGuidance.type === 'EXECUTE_CLICK') {
				executeClickTargetRef.current = currentGuidance.target;
			} else {
				executeClickTargetRef.current = null;
			}

			// Clean up any existing interval
			if (functionAdvanceModeIntervalRef.current) {
				clearInterval(functionAdvanceModeIntervalRef.current);
				functionAdvanceModeIntervalRef.current = null;
			}

			// Set up interval for function-based advanceMode
			// Use proper type guards to ensure we're dealing with the right guidance types
			if (
				currentGuidance.type === 'VIRTUAL_CLICK' ||
				currentGuidance.type === 'VIRTUAL_DRAG' ||
				currentGuidance.type === 'VIRTUAL_TYPING'
			) {
				// Now we know it's a VirtualClickGuidance, VirtualDragGuidance, or VirtualTypingGuidance and has advanceMode
				const clickOrDragGuidance = currentGuidance as
					| VirtualClickGuidance
					| VirtualDragGuidance
					| VirtualTypingGuidance;

				if (typeof clickOrDragGuidance.advanceMode === 'function') {
					const advanceFn = clickOrDragGuidance.advanceMode;

					// If the function expects at least one argument, we treat it as
					// the **callback** variant – invoke once and let it call
					// `nextGuidance` (via handleGuidanceEnd) when ready.
					if (advanceFn.length >= 1) {
						(advanceFn as (next: () => void) => void)(() => {
							// Ensure we don't create a new reference every call
							handleGuidanceEnd();
						});
						// No polling interval in this mode
						return;
					}

					// Otherwise treat it as the **predicate** variant that returns
					// a boolean and should be polled until true.

					if ((advanceFn as () => boolean)()) {
						// If the predicate returns true immediately, advance on next tick
						setTimeout(() => handleGuidanceEnd(), 0);
						return;
					}

					// Set up interval to periodically check the predicate (every 500 ms)
					functionAdvanceModeIntervalRef.current = setInterval(() => {
						const shouldAdvance = (advanceFn as () => boolean)();
						if (shouldAdvance) {
							handleGuidanceEnd();

							if (functionAdvanceModeIntervalRef.current) {
								clearInterval(functionAdvanceModeIntervalRef.current);
								functionAdvanceModeIntervalRef.current = null;
							}
						}
					}, 500);
				}
			}
		}

		// Clean up interval on unmount or when currentGuidance changes
		return () => {
			if (functionAdvanceModeIntervalRef.current) {
				clearInterval(functionAdvanceModeIntervalRef.current);
				functionAdvanceModeIntervalRef.current = null;
			}
		};
	}, [
		currentGuidance?.id,
		currentGuidance?.type,
		handleGuidanceEnd,
		addGuidancesToStart,
		addMessage,
		nextGuidance,
	]);

	// Function to execute the actual click - now outside of conditional blocks
	const executeClick = useCallback(() => {
		// Exit if no current guidance or not an execute click guidance
		if (!currentGuidance || currentGuidance.type !== 'EXECUTE_CLICK') {
			return;
		}

		try {
			// Get the target element - properly handling lazy elements
			let targetElement: PositionOrElement = currentGuidance.target;

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
				if (currentGuidance.shouldScroll !== false) {
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

					// Move to the next guidance
					handleGuidanceEnd();
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
						if (currentGuidance.shouldScroll !== false) {
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

							// Move to the next guidance
							handleGuidanceEnd();
						}, 300);
					} else {
						console.error('No element found at the specified position');
						handleGuidanceEnd(); // Proceed to next guidance anyway
					}
				} else {
					console.error('Unable to execute click: Invalid target');
					handleGuidanceEnd(); // Proceed to next guidance anyway
				}
			}
		} catch (error) {
			console.error('Error executing click:', error);
			handleGuidanceEnd(); // Proceed to next guidance anyway
		}
	}, [currentGuidance, handleGuidanceEnd]);

	// Modified effect to handle IDLE guidances with automatic duration
	useEffect(() => {
		if (!currentGuidance) return;

		if (currentGuidance.type === 'IDLE') {
			if (currentGuidance.duration) {
				const timeout = setTimeout(() => {
					nextGuidance(currentGuidance.id);
				}, currentGuidance.duration);

				return () => clearTimeout(timeout);
			}
			if (currentGuidance.advanceFunction) {
				currentGuidance.advanceFunction(() => {
					nextGuidance(currentGuidance.id);
				});
			}
		}

		// Handle auto-completing CHAT_TOOLTIP guidances with duration
		if (currentGuidance.type === 'CHAT_TOOLTIP' && currentGuidance.duration) {
			const timeout = setTimeout(() => {
				nextGuidance(currentGuidance.id);
			}, currentGuidance.duration);

			return () => clearTimeout(timeout);
		}

		// Handle EXECUTE_CLICK guidances without animation - directly execute the click
		if (
			currentGuidance.type === 'EXECUTE_CLICK' &&
			currentGuidance.showCursor === false
		) {
			// Execute click directly rather than setting a state
			executeClick();
		}
	}, [currentGuidance, nextGuidance, executeClick, handleGuidanceEnd]);

	// Handler for cursor animation completion
	const handleCursorAnimationComplete = useCallback(
		(clicked: boolean) => {
			// Use type guards for different guidance types
			if (currentGuidance?.type === 'VIRTUAL_CLICK') {
				const clickGuidance = currentGuidance as VirtualClickGuidance;
				if (
					clickGuidance.advanceMode !== 'external' &&
					typeof clickGuidance.advanceMode !== 'function'
				) {
					return handleGuidanceEnd();
				}
			}

			// For VIRTUAL_DRAG with external advance mode, loop the animation
			if (currentGuidance?.type === 'VIRTUAL_DRAG') {
				// CARE -> it should default to clickable
				if (clicked && currentGuidance.advanceMode !== 'external') {
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
		[handleGuidanceEnd, currentGuidance]
	);

	// Handler for MULTI_VIRTUAL_CLICK completion
	const handleMultiClickComplete = useCallback(() => {
		if (currentGuidance?.type === 'MULTI_VIRTUAL_CLICK') {
			// If there are more clicks to go through
			if (currentClickIndex < currentGuidance.guidances.length - 1) {
				// Move to the next click
				setCurrentClickIndex((prevIndex) => prevIndex + 1);
			} else if (currentGuidance.loop) {
				// If looping is enabled, start from the beginning
				setCurrentClickIndex(0);
			} else if (currentGuidance.advanceMode !== 'external') {
				// Complete the entire guidance only if advanceMode is not 'external'
				handleGuidanceEnd();
			}
		}
	}, [currentGuidance, currentClickIndex, handleGuidanceEnd]);

	// Handle delay between clicks for MULTI_VIRTUAL_CLICK
	useEffect(() => {
		if (
			currentGuidance?.type === 'MULTI_VIRTUAL_CLICK' &&
			currentClickIndex > 0
		) {
			const defaultDelay = 500; // Default delay between clicks in ms
			const delay =
				currentGuidance.delay !== undefined
					? currentGuidance.delay
					: defaultDelay;

			// Apply delay before showing the next click
			const timer = setTimeout(() => {
				// This empty timeout just creates a delay
			}, delay);

			return () => clearTimeout(timer);
		}
	}, [currentGuidance, currentClickIndex]);

	// If there's no current guidance or the animation system is inactive, don't render anything
	if (!isActive || !currentGuidance) {
		return null;
	}

	// Render the appropriate component based on guidance type
	switch (currentGuidance.type) {
		case 'IF':
			return (
				<IFGuidanceRenderer
					key={guidanceKey}
					guidance={currentGuidance}
					guidanceKey={guidanceKey}
					prevCursorPosition={prevCursorPosition}
					isAnimatingOut={isAnimatingOut}
					handleGuidanceEnd={handleGuidanceEnd}
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
			// GATE_IF guidances are handled in the useEffect and don't need special rendering
			return null;
		case 'CURSOR_TAKEOVER':
			return (
				<CedarCursor
					key={guidanceKey}
					isRedirected={currentGuidance.isRedirected}
					messages={currentGuidance.messages}
					onAnimationComplete={handleGuidanceEnd}
					cursorColor={currentGuidance.cursorColor}
					blocking={currentGuidance.blocking}
				/>
			);

		case 'VIRTUAL_CLICK': {
			// Determine the start position - use guidance.startPosition if provided,
			// otherwise use the previous cursor position, or undefined if neither exists
			const resolvedStartPosition: PositionOrElement | undefined =
				currentGuidance.startPosition ||
				(prevCursorPosition ? prevCursorPosition : undefined);

			// Determine the advanceMode from the guidance – if the provided value
			// is a **callback** variant (expects an argument), fall back to
			// 'default' as VirtualCursor itself doesn't need to know about it.
			const rawAdvanceMode = currentGuidance.advanceMode;
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
						endPosition={currentGuidance.endPosition}
						startPosition={resolvedStartPosition}
						tooltipText={currentGuidance.tooltipText}
						onAnimationComplete={handleCursorAnimationComplete}
						tooltipPosition={currentGuidance.tooltipPosition}
						tooltipAnchor={currentGuidance.tooltipAnchor}
						advanceMode={advanceMode}
						blocking={currentGuidance.blocking}
						shouldScroll={currentGuidance.shouldScroll}
						disableClickableArea={currentGuidance.disableClickableArea}
					/>
				</motion.div>
			);
		}

		case 'VIRTUAL_DRAG': {
			// Determine the start position - use guidance.startPosition if provided,
			// otherwise use the previous cursor position, or undefined if neither exists
			const resolvedStartPosition: PositionOrElement | undefined =
				currentGuidance.startPosition ||
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
						endPosition={currentGuidance.endPosition}
						startPosition={resolvedStartPosition}
						tooltipText={currentGuidance.tooltipText}
						onAnimationComplete={handleCursorAnimationComplete}
						tooltipPosition={currentGuidance.tooltipPosition}
						tooltipAnchor={currentGuidance.tooltipAnchor}
						startTooltip={currentGuidance.startTooltip}
						advanceMode={'auto'}
						shouldScroll={currentGuidance.shouldScroll}
						dragCursor={currentGuidance.dragCursor !== false}
					/>
				</motion.div>
			);
		}

		case 'MULTI_VIRTUAL_CLICK': {
			// Determine the current click guidance
			const currentClickGuidance = currentGuidance.guidances[currentClickIndex];

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
					currentGuidance.guidances[currentClickIndex - 1].endPosition;
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
			// Determine the start position - use guidance.startPosition if provided,
			const typingStartPosition: PositionOrElement | undefined =
				currentGuidance.startPosition ||
				(prevCursorPosition ? prevCursorPosition : undefined);

			return (
				<VirtualTypingCursor
					key={guidanceKey}
					endPosition={currentGuidance.endPosition}
					startPosition={typingStartPosition}
					expectedValue={currentGuidance.expectedValue}
					checkExistingValue={currentGuidance.checkExistingValue}
					typingDelay={currentGuidance.typingDelay}
					tooltipText={currentGuidance.tooltipText}
					tooltipPosition={currentGuidance.tooltipPosition}
					tooltipAnchor={currentGuidance.tooltipAnchor}
					advanceMode={((): 'auto' | 'external' | 'default' | number => {
						if (typeof currentGuidance.advanceMode === 'function') {
							return 'default';
						}
						return (
							(currentGuidance.advanceMode as
								| 'auto'
								| 'external'
								| 'default'
								| number
								| undefined) || 'default'
						);
					})()}
					onAnimationComplete={handleGuidanceEnd}
					blocking={currentGuidance.blocking}
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
			// We know TooltipText with position="top" will apply translateY(-100%)
			// So we place this at the center top of the button
			const tooltipPosition = {
				left: chatButtonRect.left + chatButtonRect.width / 2,
				top: chatButtonRect.top - 15, // Add a small vertical offset
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
						// Only translate horizontally to center, let TooltipText handle vertical position
						transform: 'translateX(-50%)',
						transformOrigin: 'bottom center',
					}}>
					<TooltipText
						content={currentGuidance.content}
						position='top'
						textColor={currentGuidance.textColor}
						onEnd={() => handleGuidanceEnd()}
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
					{currentGuidance.highlightElements && (
						<HighlightOverlay
							elements={currentGuidance.highlightElements}
							shouldScroll={currentGuidance.shouldScroll}
						/>
					)}
					<DialogueBox
						key={guidanceKey}
						text={currentGuidance.text}
						style={currentGuidance.style}
						advanceMode={(():
							| 'auto'
							| 'external'
							| 'default'
							| number
							| (() => boolean) => {
							if (
								typeof currentGuidance.advanceMode === 'function' &&
								((
									currentGuidance.advanceMode as (...args: unknown[]) => unknown
								).length ?? 0) >= 1
							) {
								return 'default';
							}
							return (
								(currentGuidance.advanceMode as
									| 'auto'
									| 'external'
									| 'default'
									| number
									| (() => boolean)) || 'default'
							);
						})()}
						blocking={currentGuidance.blocking}
						onComplete={handleGuidanceEnd}
					/>
				</>
			);

		case 'DIALOGUE_BANNER': {
			const bannerGuidance = currentGuidance as DialogueBannerGuidance & {
				children?: React.ReactNode;
			};
			return (
				<DialogueBanner
					key={guidanceKey}
					style={bannerGuidance.style}
					advanceMode={bannerGuidance.advanceMode}
					onComplete={handleGuidanceEnd}>
					{bannerGuidance.children ?? bannerGuidance.text}
				</DialogueBanner>
			);
		}

		case 'SURVEY':
			return (
				<SurveyDialog
					key={guidanceKey}
					title={currentGuidance.title}
					description={currentGuidance.description}
					questions={currentGuidance.questions}
					open={true}
					onOpenChange={(open) => {
						if (!open && !currentGuidance.blocking) {
							handleGuidanceEnd();
						}
					}}
					submitButtonText={currentGuidance.submitButtonText}
					cancelButtonText={currentGuidance.cancelButtonText}
					onSubmit={(responses) => {
						currentGuidance.onSubmit?.(responses);
						handleGuidanceEnd();
					}}
					blocking={currentGuidance.blocking}
					trigger_id={currentGuidance.trigger_id}
				/>
			);

		case 'EXECUTE_CLICK': {
			// Only render cursor animation if showCursor is true (default) or undefined
			const showCursor = currentGuidance.showCursor !== false;

			if (showCursor) {
				// Determine the start position - use guidance.startPosition if provided,
				// otherwise use the previous cursor position, or undefined if neither exists
				const resolvedStartPosition: PositionOrElement | undefined =
					currentGuidance.startPosition ||
					(prevCursorPosition ? prevCursorPosition : undefined);

				return (
					<motion.div
						key={guidanceKey}
						initial={{ opacity: 1 }}
						animate={{ opacity: isAnimatingOut ? 0 : 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3, ease: 'easeInOut' }}
						style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none' }}>
						<VirtualCursor
							endPosition={currentGuidance.target}
							startPosition={resolvedStartPosition}
							tooltipText={currentGuidance.tooltipText}
							onAnimationComplete={executeClick}
							tooltipPosition={currentGuidance.tooltipPosition}
							advanceMode={'auto'}
							blocking={currentGuidance.blocking}
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
					title={currentGuidance.title || 'Notification'}
					description={currentGuidance.description}
					variant={currentGuidance.variant}
					position={currentGuidance.position || 'bottom-right'}
					duration={currentGuidance.duration || 4000}
					toastMode={currentGuidance.toastMode}
					action={currentGuidance.action}
					onClose={() => nextGuidance(currentGuidance.id)}
				/>
			);
		}

		case 'EXECUTE_TYPING': {
			return (
				<ExecuteTyping
					key={guidanceKey}
					endPosition={currentGuidance.endPosition}
					expectedValue={currentGuidance.expectedValue}
					onComplete={handleGuidanceEnd}
				/>
			);
		}

		case 'RIGHT_CLICK': {
			return (
				<RightClickIndicator
					key={guidanceKey}
					duration={currentGuidance.duration || 2000}
					onComplete={handleGuidanceEnd}
				/>
			);
		}

		default:
			console.error('Unknown guidance type:', currentGuidance);
			return null;
	}
};

export default GuidanceRenderer;

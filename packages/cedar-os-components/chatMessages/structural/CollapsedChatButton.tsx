import React, {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import { useCedarStore, useStyling } from 'cedar-os';
import Container3DButton from '@/containers/Container3DButton';
import { GripVertical } from 'lucide-react';

/**
 * Shared collapsed trigger button for Cedar chat UIs.
 *
 * When rendered it checks whether it overlaps any interactive element (button, anchor, element with role="button")
 * beneath it. If so, it will iteratively move up (increase bottom offset) until it no longer blocks those elements.
 */
interface CollapsedChatButtonProps {
	/** Which side of the screen the button sits on */
	side?: 'left' | 'right';
	/** Text (question suggestion) to display */
	label: string;
	/** Callback when the button is clicked */
	onClick?: () => void;
	/** Layout id forwarded to the underlying motion component for shared-layout animations */
	layoutId?: string;
	/** Whether the button is placed via CSS `position: fixed` or `absolute`. Default is `fixed` so it works out-of-box */
	position?: 'fixed' | 'absolute';
	/** Show the keyboard shortcut helper */
}

const INTERACTIVE_SELECTORS = ['button', '[role="button"]', 'a[href]'];

const isInteractive = (el: Element | null, self: HTMLElement) => {
	if (!el || el === self || self.contains(el)) return false;
	return INTERACTIVE_SELECTORS.some((selector) =>
		(el as HTMLElement).matches(selector)
	);
};

export const CollapsedButton = forwardRef<
	HTMLDivElement,
	CollapsedChatButtonProps
>(({ side = 'right', label, onClick, layoutId, position = 'fixed' }, ref) => {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const { styling } = useStyling();
	const isDarkMode = styling.darkMode;

	const setShowChat = useCedarStore((state) => state.setShowChat);

	// Starting offset = 8px (bottom-2) for a tighter fit
	const BASE_OFFSET = 8;

	// Retrieve persisted offset (if any)
	const getInitialOffset = () => {
		if (typeof window === 'undefined') return BASE_OFFSET;
		const saved = window.localStorage.getItem('cedarCollapsedBottomOffset');
		if (saved) {
			const parsed = parseInt(saved, 10);
			if (!isNaN(parsed)) return parsed;
		}
		return BASE_OFFSET;
	};

	// Track if offsets were previously persisted (ref so we can update dynamically)
	const hasPersistedOffsetsRef = useRef<boolean>(
		typeof window !== 'undefined' &&
			window.localStorage.getItem('cedarCollapsedBottomOffset') !== null
	);

	const [bottomOffset, setBottomOffset] = useState<number>(() =>
		getInitialOffset()
	);

	// Track if the user has manually repositioned the button
	const userRepositionedRef = useRef(false);

	// Drag handling refs/state
	const [isDragging, setIsDragging] = useState(false);

	// Drag start positions
	const dragStartY = useRef(0);
	const dragStartX = useRef(0);

	// Offsets at drag start
	const dragStartBottomOffset = useRef(0);
	const dragStartSideOffset = useRef(0);

	// Horizontal offset (distance from corresponding side)
	const getInitialSideOffset = () => {
		if (typeof window === 'undefined') return 0;
		const key =
			side === 'left'
				? 'cedarCollapsedLeftOffset'
				: 'cedarCollapsedRightOffset';
		const saved = window.localStorage.getItem(key);
		if (saved) {
			const parsed = parseInt(saved, 10);
			if (!isNaN(parsed)) return parsed;
		}
		return 0;
	};

	const [sideOffset, setSideOffset] = useState<number>(() =>
		getInitialSideOffset()
	);

	// Memoise without dynamic dependencies to avoid unnecessary re-creations

	const adjustPosition = useCallback(
		() => {
			// Skip auto-adjustment if the user has manually repositioned or if bottom offset is persisted
			if (userRepositionedRef.current || hasPersistedOffsetsRef.current) return;

			const wrapper = wrapperRef.current;
			if (
				!wrapper ||
				typeof window === 'undefined' ||
				typeof document === 'undefined'
			)
				return;

			// Reset first so we get an accurate rect for the default position
			wrapper.style.bottom = `${BASE_OFFSET}px`;
			const step = wrapper.getBoundingClientRect().height + 4; // move one button height + 8px gap each iteration
			let currentOffset = BASE_OFFSET;
			let attempt = 0;
			const maxAttempts = Math.ceil(
				(window.innerHeight - BASE_OFFSET * 2) / step
			);

			while (attempt < maxAttempts) {
				// Place temporarily
				wrapper.style.bottom = `${currentOffset}px`;
				const rect = wrapper.getBoundingClientRect();
				const samplePoints: Array<[number, number]> = [
					// centre
					[rect.left + rect.width / 2, rect.top + rect.height / 2],
					// corners (slightly inset to stay within viewport)
					[rect.left + 4, rect.top + 4],
					[rect.right - 4, rect.top + 4],
					[rect.left + 4, rect.bottom - 4],
					[rect.right - 4, rect.bottom - 4],
				];

				const blocking = samplePoints.some(([x, y]) => {
					const els = document.elementsFromPoint(x, y);
					return els.some((el) => isInteractive(el, wrapper));
				});

				if (!blocking) {
					setBottomOffset(currentOffset);
					return;
				}

				currentOffset += step;
				attempt += 1;
			}

			// Fallback – stick to last computed offset
			setBottomOffset(currentOffset);
		},
		[
			/* no dynamic deps */
		]
	);

	// Re-calculate on mount and when window resizes or scrolls (scroll inside nested containers is captured with true)
	useLayoutEffect(() => {
		adjustPosition();
		window.addEventListener('resize', adjustPosition);
		window.addEventListener('scroll', adjustPosition, true);
		return () => {
			window.removeEventListener('resize', adjustPosition);
			window.removeEventListener('scroll', adjustPosition, true);
		};
		// deliberately excluding adjustPosition from deps – it's memoised
	}, []);

	/* ===== Auto-adjust when new interactive elements appear (MutationObserver) ===== */
	useEffect(() => {
		if (
			typeof MutationObserver === 'undefined' ||
			typeof document === 'undefined'
		)
			return;

		// Attributes that affect clickability
		const watchedAttrs = ['class', 'role', 'href'];
		let rafId: number | null = null;

		const schedule = () => {
			if (rafId === null) {
				rafId = window.requestAnimationFrame(() => {
					rafId = null;
					adjustPosition();
				});
			}
		};

		const observer = new MutationObserver((mutations: MutationRecord[]) => {
			for (const m of mutations) {
				if (
					(m.type === 'childList' &&
						(m.addedNodes.length > 0 || m.removedNodes.length > 0)) ||
					(m.type === 'attributes' &&
						watchedAttrs.includes(m.attributeName as string))
				) {
					schedule();
					break;
				}
			}
		});

		observer.observe(document.body, {
			subtree: true,
			childList: true,
			attributes: true,
			attributeFilter: watchedAttrs,
		});

		return () => {
			observer.disconnect();
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, [adjustPosition]);

	const positionClasses = `${position} bottom-0 ${
		side === 'left' ? 'left-0' : 'right-0'
	}`;

	/* ===== Drag to reposition (vertical) ===== */
	const startDrag = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(true);
			dragStartY.current = e.clientY;
			dragStartX.current = e.clientX;
			dragStartBottomOffset.current = bottomOffset;
			dragStartSideOffset.current = sideOffset;

			if (typeof document !== 'undefined') {
				document.body.style.cursor = 'move';
				document.body.style.userSelect = 'none';
				document.body.style.setProperty('-webkit-user-select', 'none');
			}
		},
		[bottomOffset, sideOffset, side]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging) return;
			const deltaY = dragStartY.current - e.clientY; // positive when dragging up
			const newBottomOffset = Math.max(
				0,
				dragStartBottomOffset.current + deltaY
			);
			setBottomOffset(newBottomOffset);

			// Horizontal movement
			const deltaX = e.clientX - dragStartX.current;
			if (side === 'left') {
				const newLeftOffset = Math.max(0, dragStartSideOffset.current + deltaX);
				setSideOffset(newLeftOffset);
			} else {
				const newRightOffset = Math.max(
					0,
					dragStartSideOffset.current - deltaX
				);
				setSideOffset(newRightOffset);
			}
		},
		[isDragging, bottomOffset, sideOffset, side]
	);

	const handleMouseUp = useCallback(() => {
		if (!isDragging) return;
		setIsDragging(false);
		const SNAP_THRESHOLD = 20; // px tolerance to snap back to default
		const nearDefault =
			Math.abs(bottomOffset - BASE_OFFSET) <= SNAP_THRESHOLD &&
			sideOffset <= SNAP_THRESHOLD;

		if (nearDefault) {
			// Snap back to default and treat as not repositioned
			setBottomOffset(BASE_OFFSET);
			setSideOffset(0);
			userRepositionedRef.current = false;
			hasPersistedOffsetsRef.current = false;

			// Clear persisted offsets
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem('cedarCollapsedBottomOffset');
				window.localStorage.removeItem('cedarCollapsedLeftOffset');
				window.localStorage.removeItem('cedarCollapsedRightOffset');
			}
		} else {
			userRepositionedRef.current = true;
			hasPersistedOffsetsRef.current = true;
			// Persist the new offsets
			if (typeof window !== 'undefined') {
				window.localStorage.setItem(
					'cedarCollapsedBottomOffset',
					bottomOffset.toString()
				);
				const key =
					side === 'left'
						? 'cedarCollapsedLeftOffset'
						: 'cedarCollapsedRightOffset';
				window.localStorage.setItem(key, sideOffset.toString());
			}
		}

		if (typeof document !== 'undefined') {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			document.body.style.setProperty('-webkit-user-select', '');
		}
	}, [isDragging, bottomOffset, sideOffset, side, BASE_OFFSET]);

	// Bind/unbind document listeners while dragging
	useEffect(() => {
		if (isDragging) {
			if (typeof document !== 'undefined') {
				document.addEventListener('mousemove', handleMouseMove);
				document.addEventListener('mouseup', handleMouseUp);
			}
		}
		return () => {
			if (typeof document !== 'undefined') {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
		};
	}, [isDragging, handleMouseMove, handleMouseUp]);

	// Expose the DOM node to parent via forwarded ref
	useImperativeHandle(ref, () => wrapperRef.current as HTMLDivElement, []);

	return (
		<div
			ref={wrapperRef}
			className={`${positionClasses} group`}
			style={{
				bottom: bottomOffset,
				zIndex: 9999,
				[side === 'left' ? 'left' : 'right']: sideOffset,
			}}
			aria-label='Open Cedar chat (collapsed)'>
			{/* Drag handle – appears on hover */}
			<div
				className={`absolute top-1/2 -translate-y-1/2 ${
					side === 'left' ? 'left-full ml-1' : 'right-full mr-2'
				} opacity-0 group-hover:opacity-100 transition-opacity cursor-move select-none`}
				onMouseDown={startDrag}
				aria-label='Drag to reposition chat trigger'>
				<GripVertical className='w-4 h-4' />
			</div>
			<Container3DButton
				withMotion={true}
				motionProps={{ layoutId }}
				id='cedar-copilot-collapsed-button'
				onClick={() => {
					setShowChat(true);
					onClick?.();
				}}
				className={`${isDarkMode ? 'bg-[#475569]' : ''} overflow-hidden`}>
				<span className='truncate flex-1 text-left font-semibold'>{label}</span>
			</Container3DButton>
		</div>
	);
});

CollapsedButton.displayName = 'CollapsedButton';

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TooltipMenu, type TooltipMenuItem } from '../inputs/TooltipMenu';
import { FloatingChatInput } from '../chatInput/FloatingChatInput';
import {
	useCedarStore,
	useSpell,
	SelectionEvent,
	ActivationMode,
	type ActivationConditions,
} from '../../cedar-os/src/store/CedarStore';

export interface ExtendedTooltipMenuItem extends TooltipMenuItem {
	/** If true, this item will spawn a floating input instead of invoking immediately */
	spawnsInput?: boolean;
}

interface TooltipMenuSpellProps {
	/** Unique identifier for this spell instance */
	spellId: string;
	/** Menu items to display */
	items: ExtendedTooltipMenuItem[];
	/** Optional activation conditions override (defaults to text selection) */
	activationConditions?: ActivationConditions;
	/** Whether to use streaming for the floating input */
	stream?: boolean;
}

const TooltipMenuSpell: React.FC<TooltipMenuSpellProps> = ({
	spellId,
	items,
	activationConditions,
	stream = true,
}) => {
	const [menuPosition, setMenuPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [showFloatingInput, setShowFloatingInput] = useState(false);
	const [floatingInputPosition, setFloatingInputPosition] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const selectionRangeRef = useRef<Range | null>(null);
	const selectedTextRef = useRef<string>('');

	// Default activation conditions for text selection
	const defaultConditions: ActivationConditions = {
		events: [SelectionEvent.TEXT_SELECT],
		mode: ActivationMode.TOGGLE,
	};

	// Calculate position for the menu based on selection
	const calculateMenuPosition = () => {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return null;

		const range = selection.getRangeAt(0);
		const rect = range.getBoundingClientRect();

		// Store the range and text for later use
		selectionRangeRef.current = range.cloneRange();
		selectedTextRef.current = selection.toString();

		// Position the menu above the selection, centered
		return {
			x: rect.left + rect.width / 2,
			y: rect.top - 10, // 10px above the selection
		};
	};

	// Use the new simplified useSpell hook
	useSpell({
		id: spellId,
		activationConditions: activationConditions || defaultConditions,
		onActivate: (state) => {
			if (state.triggerData?.selectedText) {
				const position = calculateMenuPosition();
				if (position) {
					// Adjust position to keep menu on screen
					const menuWidth = items.length * 48; // Approximate width based on button size
					const menuHeight = 48; // Approximate height

					let adjustedX = position.x - menuWidth / 2;
					let adjustedY = position.y - menuHeight;

					// Keep within viewport bounds
					const padding = 10;
					adjustedX = Math.max(
						padding,
						Math.min(adjustedX, window.innerWidth - menuWidth - padding)
					);
					adjustedY = Math.max(padding, adjustedY);

					setMenuPosition({ x: adjustedX, y: adjustedY });
				}
			}
		},
		onDeactivate: () => {
			setMenuPosition(null);
			setShowFloatingInput(false);
			selectionRangeRef.current = null;
			selectedTextRef.current = '';
			// Don't clear selection here - let the action decide
		},
		preventDefaultEvents: false, // Don't prevent default for text selection
		ignoreInputElements: false, // Allow in input elements for text editing
	});

	const handleItemClick = (item: ExtendedTooltipMenuItem) => {
		if (item.spawnsInput) {
			// Show floating input below the menu
			if (menuPosition) {
				// Position the floating input below the menu
				setFloatingInputPosition({
					x: menuPosition.x + (items.length * 48) / 2, // Center of menu
					y: menuPosition.y + 48, // Below the menu
				});
				setShowFloatingInput(true);
				// Hide the menu but keep the selection
				setMenuPosition(null);
			}
		} else {
			// Execute the item's action with the Cedar store
			item.onInvoke(useCedarStore.getState());

			// Clear the menu
			setMenuPosition(null);
		}
	};

	const handleClose = () => {
		setMenuPosition(null);
		// Don't clear selection when just closing the menu
		// User might want to keep the selection
	};

	const handleFloatingInputClose = () => {
		setShowFloatingInput(false);
		setFloatingInputPosition(null);
		// Clear the text selection when closing the floating input
		const selection = window.getSelection();
		if (selection) {
			selection.removeAllRanges();
		}
	};

	// Effect to add selected text to input when floating input opens
	useEffect(() => {
		if (showFloatingInput && selectedTextRef.current) {
			// Small delay to ensure the input is rendered
			setTimeout(() => {
				const store = useCedarStore.getState();
				// Add the selected text to the input
				store.setOverrideInputContent(selectedTextRef.current);
			}, 100);
		}
	}, [showFloatingInput]);

	return (
		<>
			{/* Render menu if active */}
			{menuPosition && (
				<TooltipMenu
					position={menuPosition}
					items={items}
					onClose={handleClose}
					onItemClick={handleItemClick}
				/>
			)}

			{/* Render floating input if active */}
			{showFloatingInput && floatingInputPosition && (
				<FloatingChatInput
					position={floatingInputPosition}
					onClose={handleFloatingInputClose}
					stream={stream}
					autoFocus={true}
				/>
			)}
		</>
	);
};

export default TooltipMenuSpell;

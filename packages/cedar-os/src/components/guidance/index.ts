export { default as ClickableArea } from './components/ClickableArea';
export { default as TooltipText } from './components/TooltipText';
export { default as VirtualCursor } from './components/VirtualCursor';
export { getPositionFromElement } from './utils/positionUtils';
export { default as VirtualTypingCursor } from './components/VirtualTypingCursor';

// Maintain backward compatibility
export { default as VirtualMouse } from './components/VirtualCursor';

export { calculatePosition } from './utils/positionUtils';
export type { Position } from './utils/positionUtils';

export {
	getElementOrPosition,
	lazyFindElement,
	findChildElement,
	lazyFindChildElement,
	lazyFindParentElement,
	// New rect validation utilities
	isRectValidAndVisible,
	hasValidVisibleRect,
	lazyHasValidVisibleRect,
	hasAllValidVisibleRects,
	hasAnyValidVisibleRect,
	lazyHasAllValidVisibleRects,
	lazyHasAnyValidVisibleRect,
	hasAttribute,
	lazyHasAttribute,
} from './utils/elementUtils';
export type {
	PositionOrElement,
	LazyPositionOrElement,
	ElementFinder,
} from './utils/elementUtils';

export { default as DialogueBox } from './components/DialogueBox';
export type { DialogueBoxProps } from './components/DialogueBox';

export { default as GuidanceRenderer } from './GuidanceRenderer';

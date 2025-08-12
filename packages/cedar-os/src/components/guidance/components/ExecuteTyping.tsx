import React, { useEffect, useRef } from 'react';
import {
	PositionOrElement,
	LazyPositionOrElement,
} from '@/components/guidance/utils/positionUtils';
import {
	isInputElement,
	startTypingAnimation,
	Timeout,
} from '@/components/guidance/utils/typingUtils';

interface ExecuteTypingProps {
	endPosition: PositionOrElement;
	expectedValue: string;
	onComplete?: () => void;
}

const ExecuteTyping: React.FC<ExecuteTypingProps> = ({
	endPosition,
	expectedValue,
	onComplete,
}) => {
	const typingTimeoutRef = useRef<Timeout | null>(null);

	useEffect(() => {
		// Properly resolve the endPosition if it's a lazy reference
		let resolvedEndPosition = endPosition;
		if (
			endPosition &&
			typeof endPosition === 'object' &&
			'_lazy' in endPosition
		) {
			resolvedEndPosition = (endPosition as LazyPositionOrElement).resolve();
		}

		// Validate that we have a proper element
		const isValidElement =
			resolvedEndPosition &&
			typeof resolvedEndPosition === 'object' &&
			(resolvedEndPosition as HTMLElement).getBoundingClientRect;

		// Get the actual element
		const endElement = isValidElement
			? (resolvedEndPosition as HTMLElement)
			: null;

		if (!endElement || !isInputElement(endElement)) {
			console.error('ExecuteTyping: Invalid or non-input element provided');
			onComplete?.();
			return;
		}

		if (typeof expectedValue !== 'string') {
			console.error('ExecuteTyping: Only string expectedValue is supported');
			onComplete?.();
			return;
		}

		// Start typing immediately
		startTypingAnimation(
			endElement,
			expectedValue,
			150, // default typing delay
			true, // check existing value
			() => {
				onComplete?.();
			},
			typingTimeoutRef
		);

		// Cleanup on unmount
		return () => {
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}
		};
	}, [endPosition, expectedValue, onComplete]);

	// This component doesn't render anything visible
	return null;
};

export default ExecuteTyping;

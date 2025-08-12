import { Tag } from '@/backend/tags/getTags';
// import { RatingsBar } from '@/scripts/highlighter/components/ActionBar/RatingsBar';
// import { TagsAction } from '@/scripts/highlighter/components/ActionBar/TagsAction';
import {
	MarkerPosition,
	getMarkerPosition,
	getSelectedText,
} from '@/scripts/highlighter/utils/markerUtils';
import { Highlighter, PenBoxIcon, SmilePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EmojiPickerWrapper } from '../Reactions/EmojiPickerWrapper';
// import { useSWRConfig } from 'swr';
import posthog from 'posthog-js';

const QUICK_REACTIONS = [
	{ emoji: '❤️', label: 'heart' },
	{ emoji: '🔥', label: 'fire' },
	{ emoji: '🤯', label: 'mind blown' },
] as const;

type ActionBarProps = {
	handleHighlight: () => void;
	handleAddNote: () => void;
	handleRate: (rating: number) => void;
	handleHighlightAndTag: (tag: Tag) => void;
	onAddReaction: (emoji: string) => Promise<void>;
};

export const ActionBar = ({
	handleHighlight,
	handleAddNote,
	// handleRate,
	// handleHighlightAndTag,
	onAddReaction,
}: ActionBarProps) => {
	const [markerPosition, setMarkerPosition] = useState<
		MarkerPosition | { display: 'none' }
	>({ display: 'none' });
	const actionBarRef = useRef<HTMLDivElement>(null);

	// const { cache } = useSWRConfig();
	// const { data: tags = [] } = (cache.get('getTags') || {}) as {
	//  data?: Tag[];
	// };

	// const watchLaterTag = tags.find(
	//  (tag) => tag.name.toLowerCase() === 'watch later'
	// );
	const closeActionBar = (clearSelection: boolean = false) => {
		if (clearSelection) {
			window.getSelection()?.empty();
		}
		setMarkerPosition({ display: 'none' });
	};

	const isClickInsideEmojiPicker = (event: MouseEvent) => {
		return (event.target as Element)?.closest('.emoji-picker') !== null;
	};

	// Handles if any event is in emoji picker including scroll and click events to prevent action bar from closing
	const isInsideEmojiPicker = (event: Event): boolean => {
		const target = event.target;
		if (target instanceof Element) {
			return target.closest('.emoji-picker') !== null;
		}
		if (target instanceof Document) {
			return false;
		}
		if (target instanceof HTMLElement) {
			return target.closest('.emoji-picker') !== null;
		}
		return false;
	};

	// Wrap all action bar handlers to close the action bar when they're done
	const wrappedHandlers = {
		handleHighlight: () => {
			posthog.capture('highlight_text', {
				text_length: getSelectedText().length,
				url: window.location.href,
			});
			handleHighlight();
			closeActionBar(false);
		},
		handleAddNote: () => {
			posthog.capture('add_note', {
				text_length: getSelectedText().length,
				url: window.location.href,
			});
			handleAddNote();
			closeActionBar(true);
		},
		onAddReaction: async (emoji: string) => {
			posthog.capture('add_reaction', {
				emoji: emoji,
				text_length: getSelectedText().length,
				url: window.location.href,
			});
			await onAddReaction(emoji);
			closeActionBar(true);
		},
	};

	// Handle text selection
	useEffect(() => {
		const handleSelectionChange = (event: MouseEvent) => {
			const selectedText = getSelectedText();
			if (selectedText.length > 0) {
				setMarkerPosition(getMarkerPosition());
			} else if (!isClickInsideEmojiPicker(event)) {
				closeActionBar(false);
			}
		};

		const handleScroll = (event: Event) => {
			if (!isInsideEmojiPicker(event)) {
				closeActionBar(false);
			}
		};

		// Add selection change listener
		const handleSelectionChangeEvent = () => {
			const selectedText = getSelectedText();
			if (!selectedText) {
				closeActionBar(false);
			}
		};

		document.addEventListener('mouseup', handleSelectionChange);
		document.addEventListener('scroll', handleScroll, true); // true for capture phase
		document.addEventListener(
			'selectionchange',
			handleSelectionChangeEvent
		);

		return () => {
			document.removeEventListener('mouseup', handleSelectionChange);
			document.removeEventListener('scroll', handleScroll, true);
			document.removeEventListener(
				'selectionchange',
				handleSelectionChangeEvent
			);
		};
	}, []);

	// Handle clicks outside the action bar
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const isInsideActionBar = actionBarRef.current?.contains(
				event.target as Node
			);

			if (!isInsideActionBar && !isClickInsideEmojiPicker(event)) {
				setMarkerPosition({ display: 'none' });
			}
		};

		document.addEventListener('mousedown', handleClickOutside);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	if (!markerPosition || !getSelectedText()) {
		return null;
	}

	return (
		<div
			ref={actionBarRef}
			className='fixed bg-popover text-slate-400 ll-gap-3 gap-2 w-fit justify-center items-center flex-row rounded-md border p-2 text-sm z-infinite'
			style={markerPosition}
		>
			<button
				className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150'
				onClick={wrappedHandlers.handleHighlight}
			>
				<Highlighter className='w-full h-full' />
			</button>
			<button
				className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150'
				onClick={wrappedHandlers.handleAddNote}
			>
				<PenBoxIcon className='w-full h-full' />
			</button>
			{/* <RatingsBar onRate={handleRate} /> */}
			{/* <TagsAction onTagSelect={handleHighlightAndTag} /> */}
			{/* {watchLaterTag && (
				<button
					className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150'
					onClick={() => handleHighlightAndTag(watchLaterTag)}
				>
					<Clock className='w-full h-full' />
				</button>
			)} */}

			<div className='flex gap-1'>
				{/* Quick Reaction Buttons */}
				<div className='flex items-center gap-1 '>
					{QUICK_REACTIONS.map(({ emoji, label }) => (
						<button
							key={label}
							onClick={() => {
								posthog.capture('quick_reaction', {
									emoji: emoji,
									label: label,
									text_length: getSelectedText().length,
									url: window.location.href,
								});
								wrappedHandlers.onAddReaction(emoji);
							}}
							className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150 flex items-center justify-center'
							aria-label={`React with ${label}`}
						>
							<span className='text-sm'>{emoji}</span>
						</button>
					))}

					<EmojiPickerWrapper
						searchDisabled
						onEmojiClick={wrappedHandlers.onAddReaction}
						trigger={
							<button
								className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150'
								onMouseDown={(e) => e.preventDefault()}
							>
								<SmilePlus className='w-full h-full' />
							</button>
						}
					/>
				</div>

				{/* Other Actions */}
				<div className='flex items-center gap-1'>
					<button
						className='hover:text-white hover:border-white border border-transparent cursor-pointer w-6 h-6 rounded-lg p-1 transition-colors duration-150'
						onClick={() => {
							posthog.capture('close_action_bar', {
								text_length: getSelectedText().length,
								url: window.location.href,
							});
							closeActionBar(true);
						}}
					>
						<X className='w-full h-full' />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ActionBar;

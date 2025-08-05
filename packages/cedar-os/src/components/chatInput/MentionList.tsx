import { useMentionProvidersByTrigger } from '@/store/agentInputContext/mentionProviders';
import { MentionItem } from '@/store/agentInputContext/types';
import { cn, withClassName } from '@/styles/stylingUtils';
import React, {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useState,
	useRef,
} from 'react';

interface MentionListProps {
	items: MentionItem[];
	command: (props: MentionItem) => void;
}

interface MentionListRef {
	onKeyDown: (data: { event: React.KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
	({ items, command }, ref) => {
		const [selectedIndex, setSelectedIndex] = useState(0);
		const providers = useMentionProvidersByTrigger('@');
		const containerRef = useRef<HTMLDivElement>(null);
		const itemRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([]);

		useEffect(() => {
			setSelectedIndex(0);
		}, [items]);

		// Scroll selected item into view
		useEffect(() => {
			const selectedItem = itemRefs.current[selectedIndex];
			if (selectedItem && containerRef.current) {
				const container = containerRef.current;
				const itemTop = selectedItem.offsetTop;
				const itemBottom = itemTop + selectedItem.offsetHeight;
				const containerTop = container.scrollTop;
				const containerBottom = containerTop + container.clientHeight;

				// Scroll down if item is below visible area
				if (itemBottom > containerBottom) {
					container.scrollTop = itemBottom - container.clientHeight;
				}
				// Scroll up if item is above visible area
				else if (itemTop < containerTop) {
					container.scrollTop = itemTop;
				}
			}
		}, [selectedIndex]);

		const selectItem = (index: number) => {
			const item = items[index];
			if (item) {
				command(item);
			}
		};

		const upHandler = () => {
			setSelectedIndex((selectedIndex + items.length - 1) % items.length);
		};

		const downHandler = () => {
			setSelectedIndex((selectedIndex + 1) % items.length);
		};

		const enterHandler = () => {
			selectItem(selectedIndex);
		};

		useImperativeHandle(ref, () => ({
			onKeyDown: ({ event }: { event: React.KeyboardEvent }) => {
				if (event.key === 'ArrowUp') {
					upHandler();
					return true;
				}
				if (event.key === 'ArrowDown') {
					downHandler();
					return true;
				}
				if (event.key === 'Enter') {
					enterHandler();
					return true;
				}
				return false;
			},
		}));

		const renderItem = (item: MentionItem, index: number) => {
			// Find the provider that created this item
			// We'll need to pass the provider ID through the item or find another way
			// For now, try to find a provider that would create this type of item
			const provider = item.providerId
				? providers.find((p) => p.id === item.providerId)
				: undefined;

			// Use custom renderer if provider has one
			if (provider?.renderMenuItem) {
				return (
					<div
						key={item.id}
						ref={(el) => {
							itemRefs.current[index] = el;
						}}
						className={cn(
							'text-left px-3 py-1 hover:bg-gray-200 cursor-pointer',
							index === selectedIndex && 'bg-gray-200'
						)}
						onClick={() => selectItem(index)}>
						{provider.renderMenuItem(item)}
					</div>
				);
			}

			// Default rendering with icon from metadata
			const icon = item.metadata?.icon;
			const color = item.metadata?.color;

			// Apply color with 50% opacity for hover/selected state
			const bgStyle =
				index === selectedIndex && color
					? { backgroundColor: `${color}80` } // 80 in hex = 50% opacity
					: {};

			return (
				<button
					key={item.id}
					ref={(el) => {
						itemRefs.current[index] = el;
					}}
					type='button'
					className={cn(
						'w-full text-left px-2 py-1.5 cursor-pointer text-black text-sm transition-colors',
						index === selectedIndex && !color && 'bg-gray-200'
					)}
					style={bgStyle}
					onMouseEnter={(e) => {
						if (color && index !== selectedIndex) {
							e.currentTarget.style.backgroundColor = `${color}40`; // 40 in hex = 25% opacity for hover
						}
					}}
					onMouseLeave={(e) => {
						if (color && index !== selectedIndex) {
							e.currentTarget.style.backgroundColor = '';
						}
					}}
					onClick={() => selectItem(index)}>
					<div className='flex items-center gap-1'>
						{icon && withClassName(icon, 'w-4 h-4')}
						<span className=''>{item.label}</span>
					</div>
				</button>
			);
		};

		return (
			<div
				ref={containerRef}
				className='shadow-lg bg-white rounded-md max-h-60 overflow-y-auto scrollbar-hide'>
				{items.length > 0 ? (
					items.map((item, index) => renderItem(item, index))
				) : (
					<div className='px-3 py-1 text-gray-500'>No results</div>
				)}
			</div>
		);
	}
);

MentionList.displayName = 'MentionList';

export default MentionList;

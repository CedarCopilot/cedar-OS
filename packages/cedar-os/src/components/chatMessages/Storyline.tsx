import { useStyling } from '@/store/CedarStore';
import { StorylineMessage, StorylineSection } from '@/store/messages/types';
import React, { useRef, useEffect, useState } from 'react';
import StorylineEdge from './StorylineEdge';
import { motion, AnimatePresence } from 'framer-motion';

interface StorylineProps {
	message: StorylineMessage;
}

const Storyline: React.FC<StorylineProps> = ({ message }) => {
	const { styling } = useStyling();
	const titleRefs = useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);
	const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
	const [edgePositions, setEdgePositions] = useState<
		{ fromY: number; toY: number; centerX: number }[]
	>([]);
	const [visibleSections, setVisibleSections] = useState<number[]>([]);

	// Sequentially reveal sections
	useEffect(() => {
		if (message.sections.length === 0) return;

		// Show the first section immediately
		setVisibleSections([0]);

		// Sequentially add each section with a delay
		message.sections.forEach((_, index) => {
			if (index === 0) return; // Skip the first one as it's already visible

			const delay = index * 2.0; // Increased from 1.2 to 2.0 seconds delay between sections
			setTimeout(() => {
				setVisibleSections((prev) => [...prev, index]);
			}, delay * 1000);
		});
	}, [message.sections]);

	// Scroll to newly visible sections
	useEffect(() => {
		if (visibleSections.length === 0) return;

		// Get the last visible section
		const lastVisibleIndex = Math.max(...visibleSections);
		const lastVisibleRef = sectionRefs.current[lastVisibleIndex];

		if (lastVisibleRef) {
			// Wait a bit longer for the animation to start before scrolling
			lastVisibleRef.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		}
	}, [visibleSections]);

	// Update edge positions when refs change or on resize
	useEffect(() => {
		const updateEdgePositions = () => {
			if (!containerRef.current) return;

			const containerRect = containerRef.current.getBoundingClientRect();
			const newPositions = [];

			for (let i = 0; i < titleRefs.current.length - 1; i++) {
				const fromEl = titleRefs.current[i];
				const toEl = titleRefs.current[i + 1];

				if (fromEl && toEl) {
					const fromRect = fromEl.getBoundingClientRect();
					const toRect = toEl.getBoundingClientRect();

					// Calculate relative positions to the SVG container
					const fromY = fromRect.bottom - containerRect.top;
					const toY = toRect.top - containerRect.top;
					const centerX =
						fromRect.left - containerRect.left + fromRect.width / 2;

					newPositions.push({ fromY, toY, centerX });
				}
			}
			setEdgePositions(newPositions);
		};

		// Initial update and when resizing
		updateEdgePositions();
		window.addEventListener('resize', updateEdgePositions);

		// Also update on scroll events since positions might change
		document.addEventListener('scroll', updateEdgePositions, true);

		return () => {
			window.removeEventListener('resize', updateEdgePositions);
			document.removeEventListener('scroll', updateEdgePositions, true);
		};
	}, [message.sections, visibleSections]);

	// Render content with inline actions
	const renderContentWithActions = (text: string) => {
		return <span>{text}</span>;
	};

	// Animation variants
	const sectionVariants = {
		hidden: {
			opacity: 0,
			y: 15,
		},
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.8, // Increased from 0.4 to 0.8
				ease: 'easeOut',
			},
		},
	};

	const titleVariants = {
		hidden: {
			opacity: 0,
			scale: 0.8,
		},
		visible: {
			opacity: 1,
			scale: 1,
			transition: {
				duration: 0.6, // Increased from 0.3 to 0.6
				ease: 'backOut',
			},
		},
	};

	const textVariants = {
		hidden: {
			opacity: 0,
			x: -10,
		},
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				duration: 0.8, // Increased from 0.4 to 0.8
				delay: 0.3, // Increased from 0.15 to 0.3
				ease: 'easeOut',
			},
		},
	};

	// Render a storyline section
	const renderStorylineSection = (
		section: StorylineSection,
		sectionIndex: number
	) => {
		const isVisible = visibleSections.includes(sectionIndex);

		switch (typeof section) {
			case 'string':
				return (
					<AnimatePresence key={`section-${sectionIndex}`}>
						{isVisible && (
							<motion.div
								ref={(el: HTMLDivElement | null) => {
									sectionRefs.current[sectionIndex] = el;
								}}
								className='mt-3 mb-3 w-full'
								variants={sectionVariants}
								initial='hidden'
								animate='visible'>
								<motion.p
									className='text-sm font-serif text-[#141413]'
									variants={textVariants}>
									{section}
								</motion.p>
							</motion.div>
						)}
					</AnimatePresence>
				);
			case 'object':
				if (section.type === 'storyline_section') {
					return (
						<AnimatePresence key={`section-${sectionIndex}`}>
							{isVisible && (
								<motion.div
									ref={(el: HTMLDivElement | null) => {
										sectionRefs.current[sectionIndex] = el;
									}}
									className='mb-6 relative'
									variants={sectionVariants}
									initial='hidden'
									animate='visible'>
									<div className='grid grid-cols-[120px_1fr] items-start gap-4'>
										<div className='flex justify-center'>
											<motion.div
												ref={(el: HTMLDivElement | null) => {
													titleRefs.current[sectionIndex] = el;
												}}
												className='bg-gray-200 text-gray-800 font-semibold px-3 py-1.5 rounded-md shadow-sm text-xs w-[100px] text-center'
												variants={titleVariants}>
												{section.icon && (
													<span className='mr-1'>{section.icon}</span>
												)}
												{section.title}
											</motion.div>
										</div>
										<motion.div
											className='font-serif text-[#141413] text-sm'
											variants={textVariants}>
											{section.description}
										</motion.div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					);
				}
				return null;
			default:
				return null;
		}
	};

	// Only show edges between visible sections
	const getVisibleEdges = () => {
		return edgePositions.filter(
			(_, index) =>
				visibleSections.includes(index) && visibleSections.includes(index + 1)
		);
	};

	if (message.type !== 'storyline') {
		return null;
	}

	return (
		<div className='max-w-[100%]'>
			<div
				ref={containerRef}
				className='rounded-xl py-2 px-3 text-sm relative w-full'
				style={{
					color: '#141413',
				}}>
				{/* First render the base message text */}
				<motion.div
					className='mb-4 font-serif'
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}>
					{' '}
					{/* Increased from 0.5 to 0.8 */}
					{renderContentWithActions(message.content)}
				</motion.div>

				{/* Render edges first (underneath sections) */}
				<div className='storyline-edges absolute inset-0 pointer-events-none z-0'>
					<svg className='w-full h-full absolute top-0 left-0 overflow-visible'>
						{getVisibleEdges().map((pos, idx) => (
							<StorylineEdge
								key={`edge-${idx}`}
								fromY={pos.fromY}
								toY={pos.toY}
								centerX={pos.centerX}
							/>
						))}
					</svg>
				</div>

				{/* Then render each storyline section */}
				<div className='storyline-sections relative z-10'>
					{message.sections.map((section, index) =>
						renderStorylineSection(section, index)
					)}
				</div>
			</div>
		</div>
	);
};

export default Storyline;

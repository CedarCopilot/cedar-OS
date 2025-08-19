import React, { useEffect } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { diffWords, diffChars, diffLines } from 'diff';

// TypewriterText component for animated text appearance
const TypewriterText: React.FC<{
	text: string;
	color: string;
	backgroundColor: string;
	diffMode?: 'words' | 'chars' | 'lines';
}> = ({ text, color, backgroundColor, diffMode }) => {
	const motionText = useMotionValue('');

	useEffect(() => {
		const animation = animate(0, text.length, {
			duration: Math.max(0.5, Math.min(1.5, text.length * 0.04)),
			ease: 'linear',
			onUpdate: (latest) => {
				motionText.set(text.slice(0, Math.ceil(latest)));
			},
		});

		return () => animation.stop();
	}, [text, motionText]);

	// Handle multiline text for line mode
	if (diffMode === 'lines' && text.includes('\n')) {
		const lines = text.split('\n');
		return (
			<>
				{lines.map((line, index) => (
					<React.Fragment key={index}>
						{line && (
							<motion.span
								className='relative'
								style={{
									backgroundColor,
									color,
									borderRadius: '2px',
									padding: '0 2px',
									textDecoration: 'none',
								}}>
								<motion.span style={{ whiteSpace: 'pre-wrap' }}>
									{line}
								</motion.span>
							</motion.span>
						)}
						{index < lines.length - 1 && <br />}
					</React.Fragment>
				))}
			</>
		);
	}

	return (
		<motion.span
			className='relative'
			style={{
				backgroundColor,
				color,
				borderRadius: '2px',
				padding: '0 2px',
				textDecoration: 'none',
			}}>
			<motion.span style={{ whiteSpace: 'pre-wrap' }}>{motionText}</motion.span>
		</motion.span>
	);
};

// StrikethroughText component for removed text (no fade out)
const StrikethroughText: React.FC<{
	text: string;
	diffMode?: 'words' | 'chars' | 'lines';
}> = ({ text, diffMode }) => {
	const strikethrough = useMotionValue(0);

	useEffect(() => {
		// Animate the strikethrough line
		const strikeAnimation = animate(strikethrough, 1, {
			duration: 0.3,
			ease: 'easeOut',
		});

		return () => {
			strikeAnimation.stop();
		};
	}, [strikethrough]);

	// Split text by lines if it contains newlines
	const lines = text.split('\n');

	// If it's a single line or no newlines, render as before
	if (lines.length === 1) {
		return (
			<motion.span
				className='relative inline-block'
				style={{
					backgroundColor: 'rgba(239, 68, 68, 0.2)',
					color: 'rgba(239, 68, 68, 0.9)',
					borderRadius: '2px',
					padding: '0 2px',
				}}>
				<span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>
				<motion.div
					className='absolute top-1/2 left-0 right-0 h-[1px] bg-red-500'
					style={{
						scaleX: strikethrough,
						transformOrigin: 'left center',
						transform: 'translateY(-50%)',
					}}
				/>
			</motion.span>
		);
	}

	// For multiline text, render each line with its own strikethrough
	return (
		<>
			{lines.map((line, index) => (
				<React.Fragment key={index}>
					{line && (
						<motion.span
							className='relative inline-block'
							style={{
								backgroundColor: 'rgba(239, 68, 68, 0.2)',
								color: 'rgba(239, 68, 68, 0.9)',
								borderRadius: '2px',
								padding: '0 2px',
							}}>
							<span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
							<motion.div
								className='absolute top-1/2 left-0 right-0 h-[1px] bg-red-500'
								style={{
									scaleX: strikethrough,
									transformOrigin: 'left center',
									transform: 'translateY(-50%)',
								}}
							/>
						</motion.span>
					)}
					{index < lines.length - 1 && (diffMode === 'lines' ? <br /> : '\n')}
				</React.Fragment>
			))}
		</>
	);
};

interface DiffTextProps {
	oldText: string;
	newText: string;
	diffMode?: 'words' | 'chars' | 'lines';
	showRemoved?: boolean;
	animateChanges?: boolean;
	className?: string;
}

export const DiffText: React.FC<DiffTextProps> = ({
	oldText,
	newText,
	diffMode = 'words',
	showRemoved = true,
	animateChanges = true,
	className = '',
}) => {
	// Use the appropriate diff function based on mode
	let changes;
	if (diffMode === 'chars') {
		changes = diffChars(oldText, newText);
	} else if (diffMode === 'lines') {
		changes = diffLines(oldText, newText, {});
	} else {
		changes = diffWords(oldText, newText);
	}

	// Reorder changes to show added before removed when they're consecutive
	const reorderedChanges = [];
	let i = 0;

	while (i < changes.length) {
		const current = changes[i];

		// If current is added or removed, look ahead for consecutive add/remove pairs
		if (current.added || current.removed) {
			const group = [];
			let j = i;

			// Collect consecutive added/removed changes
			while (j < changes.length && (changes[j].added || changes[j].removed)) {
				group.push(changes[j]);
				j++;
			}

			// Separate added and removed from the group
			const addedChanges = group.filter((change) => change.added);
			const removedChanges = group.filter((change) => change.removed);

			// Add them in order: added first, then removed
			reorderedChanges.push(...addedChanges, ...removedChanges);

			i = j; // Move to next non-add/remove change
		} else {
			// Unchanged text, add as-is
			reorderedChanges.push(current);
			i++;
		}
	}

	return (
		<span className={className}>
			{reorderedChanges.map((part, index) => {
				if (part.added) {
					// Added text - green with typewriter effect
					return animateChanges ? (
						<TypewriterText
							key={`added-${index}`}
							text={part.value}
							color='rgb(34, 197, 94)'
							backgroundColor='rgba(34, 197, 94, 0.15)'
							diffMode={diffMode}
						/>
					) : (
						// Handle multiline added text for non-animated case
						(() => {
							if (diffMode === 'lines' && part.value.includes('\n')) {
								const lines = part.value.split('\n');
								return (
									<React.Fragment key={`added-${index}`}>
										{lines.map((line, lineIndex) => (
											<React.Fragment key={lineIndex}>
												{line && (
													<span
														style={{
															backgroundColor: 'rgba(34, 197, 94, 0.15)',
															color: 'rgb(34, 197, 94)',
															borderRadius: '2px',
															padding: '0 2px',
														}}>
														{line}
													</span>
												)}
												{lineIndex < lines.length - 1 && <br />}
											</React.Fragment>
										))}
									</React.Fragment>
								);
							}

							return (
								<span
									key={`added-${index}`}
									style={{
										backgroundColor: 'rgba(34, 197, 94, 0.15)',
										color: 'rgb(34, 197, 94)',
										borderRadius: '2px',
										padding: '0 2px',
									}}>
									{part.value}
								</span>
							);
						})()
					);
				} else if (part.removed) {
					// Removed text - red with strikethrough (no fade)
					if (!showRemoved) return null;

					return animateChanges ? (
						<StrikethroughText
							key={`removed-${index}`}
							text={part.value}
							diffMode={diffMode}
						/>
					) : (
						// Handle multiline removed text for non-animated case
						(() => {
							const lines = part.value.split('\n');
							if (lines.length === 1) {
								return (
									<span
										key={`removed-${index}`}
										style={{
											backgroundColor: 'rgba(239, 68, 68, 0.15)',
											color: 'rgba(239, 68, 68, 0.7)',
											borderRadius: '2px',
											padding: '0 2px',
											textDecoration: 'line-through',
										}}>
										{part.value}
									</span>
								);
							}

							return (
								<React.Fragment key={`removed-${index}`}>
									{lines.map((line, lineIndex) => (
										<React.Fragment key={lineIndex}>
											{line && (
												<span
													style={{
														backgroundColor: 'rgba(239, 68, 68, 0.15)',
														color: 'rgba(239, 68, 68, 0.7)',
														borderRadius: '2px',
														padding: '0 2px',
														textDecoration: 'line-through',
													}}>
													{line}
												</span>
											)}
											{lineIndex < lines.length - 1 &&
												(diffMode === 'lines' ? <br /> : '\n')}
										</React.Fragment>
									))}
								</React.Fragment>
							);
						})()
					);
				} else {
					// Unchanged text - handle line mode
					if (diffMode === 'lines' && part.value.includes('\n')) {
						const lines = part.value.split('\n');
						return (
							<React.Fragment key={`unchanged-${index}`}>
								{lines.map((line, lineIndex) => (
									<React.Fragment key={lineIndex}>
										{line}
										{lineIndex < lines.length - 1 && <br />}
									</React.Fragment>
								))}
							</React.Fragment>
						);
					}
					return <span key={`unchanged-${index}`}>{part.value}</span>;
				}
			})}
		</span>
	);
};

export default DiffText;

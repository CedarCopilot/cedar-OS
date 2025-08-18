'use client';

import React, { useState } from 'react';
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { PhantomText } from '@/text/PhantomText';
import SliderSpell from '@/spells/SliderSpell';
import RangeSliderSpell from '@/spells/RangeSliderSpell';
import { ActivationMode, useRegisterState } from 'cedar-os';
import {
	Type,
	FileText,
	ScrollText,
	BookOpen,
	Newspaper,
	Library,
} from 'lucide-react';

export function TextLengthSection() {
	const [wordCount, setWordCount] = useState(50);
	const [isSliderActive, setIsSliderActive] = useState(false);
	const [textInput, setTextInput] = useState('');

	// Register the word count state for Cedar to access
	useRegisterState({
		key: 'textLengthDemo.wordCount',
		value: wordCount,
		setValue: (value: number) => setWordCount(value),
		description: 'Current word count for the text length demo',
	});

	// Register the text input state
	useRegisterState({
		key: 'textLengthDemo.textInput',
		value: textInput,
		setValue: (value: string) => setTextInput(value),
		description: 'Text input field content',
	});

	const handleSliderChange = (value: number) => {
		// Map slider value (0-100) to word count (5-1000)
		// Using exponential scale for better distribution
		const minWords = 5;
		const maxWords = 1000;

		// Exponential mapping for more granular control at lower values
		const normalizedValue = value / 100;
		const exponentialValue = Math.pow(normalizedValue, 2.5);
		const mappedWordCount = Math.round(
			minWords + (maxWords - minWords) * exponentialValue
		);

		setWordCount(mappedWordCount);
		setIsSliderActive(true);
	};

	const handleSliderComplete = (value: number) => {
		handleSliderChange(value);
		setIsSliderActive(false);
		console.log('Text length slider completed:', wordCount, 'words');
	};

	const handleRangeSliderChange = (value: number) => {
		setWordCount(value);
		setIsSliderActive(true);
	};

	const handleRangeSliderComplete = (value: number, optionIndex: number) => {
		setWordCount(value);
		setIsSliderActive(false);
		console.log(
			'Range slider completed:',
			value,
			'words (option',
			optionIndex,
			')'
		);
	};

	// Define fixed word count options for RangeSliderSpell
	const wordCountOptions = [
		{
			value: 10,
			text: 'Tweet (${value} words)',
			icon: '🐦',
			color: '#1DA1F2',
		},
		{
			value: 25,
			text: 'Summary (${value} words)',
			icon: '📝',
			color: '#10B981',
		},
		{
			value: 50,
			text: 'Paragraph (${value} words)',
			icon: '📄',
			color: '#F59E0B',
		},
		{
			value: 150,
			text: 'Short Article (${value} words)',
			icon: '📰',
			color: '#EF4444',
		},
		{
			value: 300,
			text: 'Blog Post (${value} words)',
			icon: '📖',
			color: '#8B5CF6',
		},
		{
			value: 500,
			text: 'Long Article (${value} words)',
			icon: '📚',
			color: '#EC4899',
		},
		{
			value: 1000,
			text: 'Essay (${value} words)',
			icon: '🎓',
			color: '#DC2626',
		},
	];

	// Define word count ranges with metadata
	const wordCountRanges = [
		{
			min: 0,
			max: 15,
			icon: '✍️',
			text: 'Brief (${value} words)',
			color: '#3B82F6', // blue
		},
		{
			min: 15,
			max: 30,
			icon: '📝',
			text: 'Short (${value} words)',
			color: '#10B981', // green
		},
		{
			min: 30,
			max: 50,
			icon: '📄',
			text: 'Medium (${value} words)',
			color: '#F59E0B', // amber
		},
		{
			min: 50,
			max: 70,
			icon: '📑',
			text: 'Long (${value} words)',
			color: '#EF4444', // red
		},
		{
			min: 70,
			max: 85,
			icon: '📰',
			text: 'Article (${value} words)',
			color: '#8B5CF6', // purple
		},
		{
			min: 85,
			max: 100,
			icon: '📚',
			text: 'Essay (${value} words)',
			color: '#EC4899', // pink
		},
	];

	// Get icon based on current word count
	const getWordCountIcon = () => {
		if (wordCount <= 20) return <Type className='w-4 h-4' />;
		if (wordCount <= 50) return <FileText className='w-4 h-4' />;
		if (wordCount <= 150) return <ScrollText className='w-4 h-4' />;
		if (wordCount <= 300) return <BookOpen className='w-4 h-4' />;
		if (wordCount <= 600) return <Newspaper className='w-4 h-4' />;
		return <Library className='w-4 h-4' />;
	};

	// Get descriptive text for word count
	const getWordCountDescription = () => {
		if (wordCount <= 20) return 'Brief sentence';
		if (wordCount <= 50) return 'Short paragraph';
		if (wordCount <= 150) return 'Medium content';
		if (wordCount <= 300) return 'Long form';
		if (wordCount <= 600) return 'Article length';
		return 'Essay length';
	};

	return (
		<>
			<GlassyPaneContainer className='p-6'>
				<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
					Text Length Demo
				</h3>

				<div className='space-y-4'>
					{/* Instructions */}
					<div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4'>
						<h4 className='font-semibold text-blue-900 dark:text-blue-100 mb-2'>
							🎚️ Interactive Text Length Control
						</h4>
						<div className='space-y-2'>
							<p className='text-blue-700 dark:text-blue-300 text-sm'>
								<strong>Continuous Slider:</strong> Hold{' '}
								<kbd className='px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs'>
									T
								</kbd>{' '}
								and move your mouse horizontally for precise control (5-1000
								words).
							</p>
							<p className='text-blue-700 dark:text-blue-300 text-sm'>
								<strong>Quick Presets:</strong> Hold{' '}
								<kbd className='px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs'>
									Y
								</kbd>{' '}
								and move your mouse to snap to common word counts.
							</p>
						</div>
					</div>

					{/* Current Word Count Display */}
					<div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
						<div className='flex items-center gap-3'>
							{getWordCountIcon()}
							<div>
								<p className='text-sm font-medium text-gray-900 dark:text-white'>
									{getWordCountDescription()}
								</p>
								<p className='text-xs text-gray-500 dark:text-gray-400'>
									Target length
								</p>
							</div>
						</div>
						<div className='text-right'>
							<p className='text-2xl font-bold text-gray-900 dark:text-white'>
								{wordCount}
							</p>
							<p className='text-xs text-gray-500 dark:text-gray-400'>words</p>
						</div>
					</div>

					{/* Text Input Area */}
					<div className='space-y-2'>
						<label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
							Text Input with Phantom Placeholder
						</label>
						<div className='relative'>
							<textarea
								value={textInput}
								onChange={(e) => setTextInput(e.target.value)}
								className='w-full h-40 p-3 border rounded-lg bg-white dark:bg-gray-900 
									text-gray-900 dark:text-white border-gray-300 dark:border-gray-600
									focus:ring-2 focus:ring-blue-500 focus:border-transparent
									resize-none transition-all duration-200'
								placeholder=' '
								style={{
									backgroundColor: textInput ? undefined : 'transparent',
								}}
							/>
							{/* Show PhantomText when input is empty */}
							{!textInput && (
								<div className='absolute inset-0 p-3 pointer-events-none'>
									<PhantomText
										wordCount={wordCount}
										className='text-gray-400 dark:text-gray-500 leading-relaxed'
									/>
								</div>
							)}
						</div>
						<div className='flex justify-between items-center'>
							<p className='text-xs text-gray-500 dark:text-gray-400'>
								{textInput
									? `Current: ${
											textInput.split(/\s+/).filter((w) => w).length
									  } words`
									: 'Start typing or adjust the slider to see placeholder text'}
							</p>
							{textInput && (
								<button
									onClick={() => setTextInput('')}
									className='text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 
										dark:hover:text-blue-300 transition-colors'>
									Clear text
								</button>
							)}
						</div>
					</div>

					{/* Visual Word Count Indicator */}
					<div className='space-y-2'>
						<p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
							Word Count Range Indicator
						</p>
						<div className='relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden'>
							{/* Range segments */}
							<div className='absolute inset-0 flex'>
								<div className='flex-1 bg-blue-100 dark:bg-blue-900/30 border-r border-gray-300 dark:border-gray-700' />
								<div className='flex-1 bg-green-100 dark:bg-green-900/30 border-r border-gray-300 dark:border-gray-700' />
								<div className='flex-1 bg-amber-100 dark:bg-amber-900/30 border-r border-gray-300 dark:border-gray-700' />
								<div className='flex-1 bg-red-100 dark:bg-red-900/30 border-r border-gray-300 dark:border-gray-700' />
								<div className='flex-1 bg-purple-100 dark:bg-purple-900/30 border-r border-gray-300 dark:border-gray-700' />
								<div className='flex-1 bg-pink-100 dark:bg-pink-900/30' />
							</div>
							{/* Current position indicator */}
							<div
								className='absolute top-0 bottom-0 w-1 bg-gray-900 dark:bg-white transition-all duration-300'
								style={{
									left: `${Math.min(
										95,
										(Math.log(wordCount / 5) / Math.log(200)) * 100
									)}%`,
								}}
							/>
							{/* Labels */}
							<div className='absolute inset-0 flex items-center justify-around pointer-events-none'>
								<span className='text-xs font-medium text-blue-700 dark:text-blue-300'>
									Brief
								</span>
								<span className='text-xs font-medium text-green-700 dark:text-green-300'>
									Short
								</span>
								<span className='text-xs font-medium text-amber-700 dark:text-amber-300'>
									Medium
								</span>
								<span className='text-xs font-medium text-red-700 dark:text-red-300'>
									Long
								</span>
								<span className='text-xs font-medium text-purple-700 dark:text-purple-300'>
									Article
								</span>
								<span className='text-xs font-medium text-pink-700 dark:text-pink-300'>
									Essay
								</span>
							</div>
						</div>
					</div>

					{/* Status indicator */}
					{isSliderActive && (
						<div className='text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg'>
							<p className='text-sm text-green-700 dark:text-green-300 animate-pulse'>
								Adjusting text length...
							</p>
						</div>
					)}
				</div>
			</GlassyPaneContainer>

			{/* Hidden SliderSpell Component */}
			<SliderSpell
				spellId='text-length-slider'
				activationConditions={{
					events: ['t'],
					mode: ActivationMode.HOLD,
				}}
				sliderConfig={{
					min: 0,
					max: 100,
					step: 1,
					unit: '',
					ranges: wordCountRanges,
				}}
				onComplete={handleSliderComplete}
				onChange={handleSliderChange}
			/>

			{/* Hidden RangeSliderSpell Component */}
			<RangeSliderSpell
				spellId='text-length-range-slider'
				activationConditions={{
					events: ['y'],
					mode: ActivationMode.HOLD,
				}}
				rangeSliderConfig={{
					options: wordCountOptions,
					unit: ' words',
					proportionalSpacing: false,
				}}
				onComplete={handleRangeSliderComplete}
				onChange={handleRangeSliderChange}
			/>
		</>
	);
}

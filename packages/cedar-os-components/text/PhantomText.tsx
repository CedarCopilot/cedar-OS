'use client';

import React, { useMemo } from 'react';
import { cn } from 'cedar-os';

interface PhantomTextProps {
	/** Number of words to generate */
	wordCount: number;
	/** Optional CSS classes */
	className?: string;
	/** Optional inline styles */
	style?: React.CSSProperties;
	/** Whether to wrap text in a paragraph element */
	asParagraph?: boolean;
	/** Custom word pool for generating text */
	customWords?: string[];
}

// Default word pool for generating placeholder text
const DEFAULT_WORD_POOL = [
	'lorem',
	'ipsum',
	'dolor',
	'sit',
	'amet',
	'consectetur',
	'adipiscing',
	'elit',
	'sed',
	'do',
	'eiusmod',
	'tempor',
	'incididunt',
	'ut',
	'labore',
	'et',
	'dolore',
	'magna',
	'aliqua',
	'enim',
	'ad',
	'minim',
	'veniam',
	'quis',
	'nostrud',
	'exercitation',
	'ullamco',
	'laboris',
	'nisi',
	'aliquip',
	'ex',
	'ea',
	'commodo',
	'consequat',
	'duis',
	'aute',
	'irure',
	'in',
	'reprehenderit',
	'voluptate',
	'velit',
	'esse',
	'cillum',
	'fugiat',
	'nulla',
	'pariatur',
	'excepteur',
	'sint',
	'occaecat',
	'cupidatat',
	'non',
	'proident',
	'sunt',
	'culpa',
	'qui',
	'officia',
	'deserunt',
	'mollit',
	'anim',
	'id',
	'est',
	'laborum',
	'perspiciatis',
	'unde',
	'omnis',
	'iste',
	'natus',
	'error',
	'voluptatem',
	'accusantium',
	'doloremque',
	'laudantium',
	'totam',
	'rem',
	'aperiam',
	'eaque',
	'ipsa',
	'quae',
	'ab',
	'illo',
	'inventore',
	'veritatis',
	'quasi',
	'architecto',
	'beatae',
	'vitae',
	'dicta',
	'explicabo',
	'nemo',
	'enim',
	'ipsam',
	'quia',
	'voluptas',
	'aspernatur',
	'aut',
	'odit',
	'fugit',
	'consequuntur',
	'magni',
	'dolores',
	'eos',
	'ratione',
	'sequi',
	'nesciunt',
	'neque',
	'porro',
	'quisquam',
	'dolorem',
	'adipisci',
	'numquam',
	'eius',
	'modi',
	'tempora',
	'incidunt',
	'magnam',
	'quaerat',
	'etiam',
	'nihil',
	'molestiae',
	'consequatur',
	'vel',
	'illum',
	'odio',
	'dignissimos',
	'ducimus',
	'blanditiis',
	'praesentium',
	'voluptatum',
	'deleniti',
	'atque',
	'corrupti',
	'quos',
	'quas',
	'molestias',
	'excepturi',
	'obcaecati',
	'cupiditate',
	'provident',
	'similique',
	'mollitia',
	'animi',
	'dolorum',
	'fuga',
	'harum',
	'quidem',
	'rerum',
	'facilis',
	'expedita',
	'distinctio',
	'nam',
	'libero',
	'tempore',
	'cum',
	'soluta',
	'nobis',
	'eligendi',
	'optio',
	'cumque',
	'impedit',
	'quo',
	'minus',
	'quod',
	'maxime',
	'placeat',
	'facere',
	'possimus',
	'assumenda',
	'repellendus',
	'temporibus',
	'autem',
	'quibusdam',
	'officiis',
	'debitis',
	'reiciendis',
	'voluptatibus',
	'maiores',
	'alias',
	'perferendis',
	'doloribus',
	'asperiores',
	'repellat',
];

/**
 * PhantomText Component
 *
 * Generates placeholder text with a specified word count.
 * Useful for prototyping, testing layouts, or creating demo content.
 *
 * @example
 * ```tsx
 * // Generate 50 words of placeholder text
 * <PhantomText wordCount={50} />
 *
 * // With custom styling
 * <PhantomText wordCount={100} className="text-gray-500 italic" />
 *
 * // With custom word pool
 * <PhantomText
 *   wordCount={30}
 *   customWords={['hello', 'world', 'react', 'component']}
 * />
 * ```
 */
export const PhantomText: React.FC<PhantomTextProps> = ({
	wordCount,
	className = '',
	style,
	asParagraph = false,
	customWords,
}) => {
	// Generate the placeholder text
	const phantomText = useMemo(() => {
		if (wordCount <= 0) return '';

		const wordPool =
			customWords && customWords.length > 0 ? customWords : DEFAULT_WORD_POOL;

		const words: string[] = [];
		let sentenceWordCount = 0;
		let isNewSentence = true;

		for (let i = 0; i < wordCount; i++) {
			// Pick a random word from the pool
			const randomIndex = Math.floor(Math.random() * wordPool.length);
			let word = wordPool[randomIndex];

			// Capitalize first word of sentence
			if (isNewSentence) {
				word = word.charAt(0).toUpperCase() + word.slice(1);
				isNewSentence = false;
			}

			words.push(word);
			sentenceWordCount++;

			// Randomly end sentences (average sentence length ~12 words)
			const shouldEndSentence =
				sentenceWordCount >= 5 &&
				(sentenceWordCount >= 20 || Math.random() < 0.15);

			if (shouldEndSentence && i < wordCount - 1) {
				// Add punctuation
				const punctuation =
					Math.random() < 0.9 ? '.' : Math.random() < 0.5 ? '?' : '!';
				words[words.length - 1] += punctuation;
				sentenceWordCount = 0;
				isNewSentence = true;
			}

			// Add comma occasionally for natural flow
			if (
				!isNewSentence &&
				sentenceWordCount > 3 &&
				sentenceWordCount < 15 &&
				Math.random() < 0.1 &&
				i < wordCount - 1
			) {
				words[words.length - 1] += ',';
			}
		}

		// Ensure the text ends with punctuation
		const lastWord = words[words.length - 1];
		if (lastWord && !lastWord.match(/[.!?]$/)) {
			words[words.length - 1] += '.';
		}

		return words.join(' ');
	}, [wordCount, customWords]);

	const Wrapper = asParagraph ? 'p' : 'span';

	return (
		<Wrapper
			className={cn('phantom-text', className)}
			style={style}
			data-word-count={wordCount}>
			{phantomText}
		</Wrapper>
	);
};

export default PhantomText;

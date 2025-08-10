'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStyling } from 'cedar-os';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
	content: string;
	processPrefix?: boolean;
	className?: string;
	inline?: boolean;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
	content,
	processPrefix = false,
	className = '',
	inline = false,
}) => {
	const { styling } = useStyling();
	const [copiedCode, setCopiedCode] = useState<string | null>(null);

	const handleCopyCode = (code: string) => {
		navigator.clipboard.writeText(code);
		setCopiedCode(code);
		setTimeout(() => setCopiedCode(null), 2000);
	};

	// Helper function to process prefix markers in text if needed
	const processChildren = (children: React.ReactNode): React.ReactNode => {
		if (!processPrefix) return children;

		if (typeof children === 'string') {
			const parts = children.split(/(@@PREFIX@@.*?@@ENDPREFIX@@)/);
			return parts.map((part, index) => {
				if (part.startsWith('@@PREFIX@@') && part.endsWith('@@ENDPREFIX@@')) {
					const prefixText = part
						.replace('@@PREFIX@@', '')
						.replace('@@ENDPREFIX@@', '');
					return (
						<span key={index} style={{ color: styling.accentColor }}>
							{prefixText}
						</span>
					);
				}
				return part;
			});
		}
		if (Array.isArray(children)) {
			return children.map((child) =>
				typeof child === 'string' ? processChildren(child) : child
			);
		}
		return children;
	};

	const Wrapper = inline ? 'span' : 'div';
	const wrapperClassName = inline ? `inline ${className}` : className;

	return (
		<Wrapper className={wrapperClassName}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					p: ({ children }) =>
						inline ? (
							<span className='inline'>{processChildren(children)}</span>
						) : (
							<p>{processChildren(children)}</p>
						),
					a: ({ children, href }) => (
						<a
							href={href}
							className='text-blue-500 underline inline'
							target='_blank'
							rel='noopener noreferrer'>
							{children}
						</a>
					),
					code: ({ children, className }) => {
						const match = /language-(\w+)/.exec(className || '');
						const isInline = !match;
						const codeString = String(children).replace(/\n$/, '');

						return isInline ? (
							<code
								className='px-1 py-0.5 rounded text-sm inline font-mono bg-[#2d2d2d]'
								style={{
									color: styling.color,
								}}>
								{children}
							</code>
						) : (
							<div
								className='relative group my-4 rounded-lg overflow-hidden'
								style={{
									backgroundColor: '#1e1e1e',
									border: '1px solid rgba(255, 255, 255, 0.1)',
								}}>
								{match && (
									<div
										className='flex items-center justify-between px-4 py-2 text-xs bg-[#2d2d2d]'
										style={{
											borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
											color: '#888',
										}}>
										<span className='font-mono'>{match[1]}</span>
										<div className='flex items-center gap-2'>
											<button
												onClick={() => handleCopyCode(codeString)}
												className='flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors'
												style={{ color: '#888' }}>
												{copiedCode === codeString ? (
													<Check className='w-3 h-3' />
												) : (
													<Copy className='w-3 h-3' />
												)}
												<span>
													{copiedCode === codeString ? 'Copied' : 'Copy'}
												</span>
											</button>
											<button
												className='px-2 py-1 rounded hover:bg-white/10 transition-colors'
												style={{ color: '#888' }}>
												Edit
											</button>
										</div>
									</div>
								)}
								<pre className='p-4 overflow-x-auto'>
									<code
										className='text-sm font-mono'
										style={{ color: '#d4d4d4' }}>
										{codeString}
									</code>
								</pre>
							</div>
						);
					},
					pre: ({ children }) => <>{children}</>,
					h1: ({ children }) => (
						<h1 className='text-2xl font-bold mt-4 mb-2'>
							{processChildren(children)}
						</h1>
					),
					h2: ({ children }) => (
						<h2 className='text-xl font-bold mt-3 mb-2'>
							{processChildren(children)}
						</h2>
					),
					h3: ({ children }) => (
						<h3 className='text-lg font-bold mt-2 mb-1'>
							{processChildren(children)}
						</h3>
					),
					h4: ({ children }) => (
						<h4 className='text-base font-bold mt-2 mb-1'>
							{processChildren(children)}
						</h4>
					),
					h5: ({ children }) => (
						<h5 className='text-sm font-bold mt-1 mb-1'>
							{processChildren(children)}
						</h5>
					),
					h6: ({ children }) => (
						<h6 className='text-xs font-bold mt-1 mb-1'>
							{processChildren(children)}
						</h6>
					),
					blockquote: ({ children }) => (
						<blockquote
							className='border-l-4 pl-4 my-2 italic'
							style={{ borderColor: styling.accentColor }}>
							{children}
						</blockquote>
					),
					strong: ({ children }) => (
						<strong className='font-bold inline'>
							{processChildren(children)}
						</strong>
					),
					em: ({ children }) => (
						<em className='italic inline'>{processChildren(children)}</em>
					),
					ul: ({ children }) => (
						<ul className='list-disc list-inside my-2 space-y-1'>{children}</ul>
					),
					ol: ({ children }) => (
						<ol className='list-decimal list-inside my-2 space-y-1'>
							{children}
						</ol>
					),
					li: ({ children }) => (
						<li className='ml-2'>{processChildren(children)}</li>
					),
					br: () => <br />,
					table: ({ children }) => (
						<div className='overflow-x-auto my-4'>
							<table className='min-w-full border-collapse'>{children}</table>
						</div>
					),
					thead: ({ children }) => (
						<thead
							className='border-b-2'
							style={{ borderColor: styling.accentColor }}>
							{children}
						</thead>
					),
					tbody: ({ children }) => (
						<tbody
							className='divide-y'
							style={{ borderColor: `${styling.accentColor}30` }}>
							{children}
						</tbody>
					),
					tr: ({ children }) => (
						<tr
							className='border-b'
							style={{ borderColor: `${styling.accentColor}20` }}>
							{children}
						</tr>
					),
					th: ({ children }) => (
						<th
							className='px-4 py-2 text-left font-semibold'
							style={{
								borderRight: `1px solid ${styling.accentColor}20`,
								backgroundColor: `${styling.accentColor}10`,
							}}>
							{children}
						</th>
					),
					td: ({ children }) => (
						<td
							className='px-4 py-2'
							style={{ borderRight: `1px solid ${styling.accentColor}20` }}>
							{children}
						</td>
					),
				}}>
				{content}
			</ReactMarkdown>
		</Wrapper>
	);
};

export default MarkdownRenderer;

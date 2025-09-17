'use client';

import React, { memo, useMemo } from 'react';
import { useStyling } from 'cedar-os';
import { Streamdown } from 'streamdown';

interface MarkdownRendererProps {
	content: string;
	processPrefix?: boolean;
	className?: string;
	inline?: boolean;
}

const processContent = (content: string, processPrefix: boolean, accentColor: string): string => {
	if (!processPrefix) return content;
	
	// Process prefix markers for special styling
	// Since Streamdown handles HTML, we can use HTML tags directly
	return content.replace(
		/@@PREFIX@@(.*?)@@ENDPREFIX@@/g,
		`<span style="color: ${accentColor}; font-weight: 500;">$1</span>`
	);
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = memo(
	({ content, processPrefix = false, className = '', inline = false }) => {
		const { styling } = useStyling();
		
		// Process content with prefix markers
		const processedContent = useMemo(
			() => processContent(content, processPrefix, styling.accentColor),
			[content, processPrefix, styling.accentColor]
		);
		
		const containerClassName = inline 
			? `inline ${className}`.trim()
			: className;

		// Apply basic styling - use black text instead of styling.color (which is blue #93C5FD)
		const streamdownStyle = {
			color: '#000000', // Force black text since styling.color is blue by default
			display: inline ? 'inline' : 'block',
		} as React.CSSProperties;

		// For inline mode, wrap in span instead of div  
		const Wrapper = inline ? 'span' : 'div';

		// Minimal component override - black text with lighter font weight
		const components = {
			// Override default paragraph color and font weight
			p: (props: any) => <p {...props} style={{ color: '#000000', fontWeight: 400, ...props.style }} />,
			// Keep other text elements with black color and normal weight
			span: (props: any) => <span {...props} style={{ color: '#000000', fontWeight: 400, ...props.style }} />,
			div: (props: any) => <div {...props} style={{ color: '#000000', fontWeight: 400, ...props.style }} />,
		};

		return (
			<Wrapper className={containerClassName} style={streamdownStyle}>
				<Streamdown 
					parseIncompleteMarkdown={true}
					components={components}
				>
					{processedContent}
				</Streamdown>
			</Wrapper>
		);
	}
);

MarkdownRenderer.displayName = 'MarkdownRenderer';

export default MarkdownRenderer;
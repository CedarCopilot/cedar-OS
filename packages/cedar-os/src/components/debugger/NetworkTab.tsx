import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/styles/stylingUtils';
import { CollapsibleSection } from './CollapsibleSection';
import type { NetworkTabProps, DebugLogEntry } from './types';
import { sanitizeJson } from '@/utils/sanitizeJson';

export const NetworkTab: React.FC<NetworkTabProps> = ({
	logs,
	onCopy,
	copiedId,
}) => {
	const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
	const [expandedSections, setExpandedSections] = useState<Set<string>>(
		new Set()
	);
	const scrollRef = useRef<HTMLDivElement>(null);

	// Helper function to safely stringify JSON with fallback to sanitizeJson
	const safeStringify = (obj: unknown, indent = 2): string => {
		try {
			return JSON.stringify(obj, null, indent);
		} catch (error) {
			// If JSON.stringify fails due to circular references or non-serializable objects,
			// use sanitizeJson to create a safe representation
			try {
				const sanitized = sanitizeJson(obj as object);
				return JSON.stringify(sanitized, null, indent);
			} catch {
				// If even sanitization fails, return a safe error message
				return `[Error serializing object: ${
					error instanceof Error ? error.message : 'Unknown error'
				}]`;
			}
		}
	};

	// Reverse logs to show oldest at top, newest at bottom
	// Filter out standalone handler logs since they're now part of response/stream logs
	const chronologicalLogs = React.useMemo(() => {
		return [...logs].reverse().filter((log) => log.type !== 'handler');
	}, [logs]);

	useEffect(() => {
		// Auto-scroll to bottom when new logs arrive
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [chronologicalLogs.length]);

	const toggleExpanded = (logId: string) => {
		setExpandedLogs((prev) => {
			const next = new Set(prev);
			if (next.has(logId)) {
				next.delete(logId);
			} else {
				next.add(logId);
			}
			return next;
		});
	};

	const toggleSection = (sectionId: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(sectionId)) {
				next.delete(sectionId);
			} else {
				next.add(sectionId);
			}
			return next;
		});
	};

	const getLogTypeColor = (log: DebugLogEntry) => {
		switch (log.type) {
			case 'error':
			case 'stream-error':
				return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
			case 'stream-complete':
				return 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800';
			case 'response':
				return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800';
			case 'request':
				return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800';
			case 'handler':
				return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
			default:
				return 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800';
		}
	};

	const getLogTypeHover = (log: DebugLogEntry) => {
		switch (log.type) {
			case 'error':
			case 'stream-error':
				return 'hover:bg-red-100 dark:hover:bg-red-900/80';
			case 'stream-complete':
				return 'hover:bg-purple-100 dark:hover:bg-purple-900/80';
			case 'response':
				return 'hover:bg-green-100 dark:hover:bg-green-900/80';
			case 'request':
				return 'hover:bg-blue-100 dark:hover:bg-blue-900/80';
			case 'handler':
				return 'hover:bg-amber-100 dark:hover:bg-amber-900/80';
			default:
				return 'hover:bg-gray-100 dark:hover:bg-gray-900/80';
		}
	};

	const getLogTypeIcon = (log: DebugLogEntry) => {
		switch (log.type) {
			case 'error':
			case 'stream-error':
				return '✕';
			case 'stream-complete':
				return '◈';
			case 'response':
				return '←';
			case 'request':
				return '→';
			case 'handler':
				return '⚡';
			default:
				return '•';
		}
	};

	const getLogTypeLabel = (log: DebugLogEntry) => {
		switch (log.type) {
			case 'error':
				return 'Error';
			case 'stream-error':
				return 'Stream Error';
			case 'stream-complete':
				const chunkLength = log.data.streamContent?.length || 0;
				const objectCount = log.data.streamObjects?.length || 0;
				if (chunkLength > 0 && objectCount > 0) {
					return `Stream (${chunkLength} chars, ${objectCount} objects)`;
				} else if (chunkLength > 0) {
					return `Stream (${chunkLength} chars)`;
				} else if (objectCount > 0) {
					return `Stream (${objectCount} objects)`;
				}
				return 'Stream';
			case 'response':
				return 'Response';
			case 'request':
				return 'Request';
			case 'handler':
				return 'Handler';
			default:
				return 'Unknown';
		}
	};

	const formatTimestamp = (date: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMinutes = Math.floor(diffMs / (1000 * 60));
		const diffSeconds = Math.floor(diffMs / 1000);

		if (diffMinutes >= 1) {
			return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
		} else if (diffSeconds >= 1) {
			return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`;
		} else {
			return 'just now';
		}
	};

	return (
		<div ref={scrollRef} className='h-full overflow-y-auto p-2 space-y-1'>
			{chronologicalLogs.length === 0 ? (
				<div className='text-center text-gray-500 dark:text-gray-400 py-4 text-xs'>
					No network activity yet
				</div>
			) : (
				chronologicalLogs.map((log) => {
					const isExpanded = expandedLogs.has(log.id);

					return (
						<div
							key={log.id}
							className={cn(
								'border rounded-lg transition-all',
								getLogTypeColor(log)
							)}>
							<div
								className={cn(
									'flex items-center justify-between p-2 cursor-pointer transition-colors',
									isExpanded ? 'rounded-t-lg' : 'rounded-lg',
									getLogTypeHover(log)
								)}
								onClick={() => toggleExpanded(log.id)}>
								<div className='flex items-center gap-1.5 flex-1'>
									<span className='text-sm'>{getLogTypeIcon(log)}</span>
									<div className='flex flex-col'>
										<div className='flex items-center gap-1.5'>
											<span className='font-medium text-xs'>
												{getLogTypeLabel(log)}
											</span>
											{log.provider && log.type !== 'handler' && (
												<span className='px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs'>
													{log.provider}
												</span>
											)}
											{log.processorName && log.type === 'handler' && (
												<span className='px-1.5 py-0.5 bg-amber-200 dark:bg-amber-700 rounded text-xs'>
													{log.processorName}
												</span>
											)}
											{log.duration && (
												<span className='text-xs text-gray-600 dark:text-gray-400'>
													{log.duration}ms
												</span>
											)}
										</div>
										{log.apiRoute && (
											<span className='text-xs text-gray-500 dark:text-gray-400 font-mono'>
												{log.apiRoute}
											</span>
										)}
									</div>
									<span className='text-xs text-gray-500 dark:text-gray-500 ml-auto mr-2'>
										{formatTimestamp(log.timestamp)}
									</span>
								</div>
								<div className='flex items-center gap-1'>
									<button
										onClick={(e) => {
											e.stopPropagation();
											onCopy(safeStringify(log.data), log.id);
										}}
										className={cn(
											'p-0.5 rounded transition-colors',
											(() => {
												switch (log.type) {
													case 'error':
													case 'stream-error':
														return 'hover:bg-red-200 dark:hover:bg-red-800';
													case 'stream-complete':
														return 'hover:bg-purple-200 dark:hover:bg-purple-800';
													case 'response':
														return 'hover:bg-green-200 dark:hover:bg-green-800';
													case 'request':
														return 'hover:bg-blue-200 dark:hover:bg-blue-800';
													case 'handler':
														return 'hover:bg-amber-200 dark:hover:bg-amber-800';
													default:
														return 'hover:bg-gray-200 dark:hover:bg-gray-700';
												}
											})()
										)}>
										{copiedId === log.id ? (
											<Check className='w-3 h-3 text-green-600' />
										) : (
											<Copy className='w-3 h-3' />
										)}
									</button>
									{isExpanded ? (
										<ChevronDown className='w-3 h-3' />
									) : (
										<ChevronRight className='w-3 h-3' />
									)}
								</div>
							</div>

							<AnimatePresence>
								{isExpanded && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2 }}
										className='overflow-hidden'>
										<div className='p-2 pt-0 space-y-2 rounded-b-lg'>
											{/* Additional Context Section */}
											{log.data.params && (
												<CollapsibleSection
													id={`${log.id}-context`}
													title='Additional Context'
													isExpanded={expandedSections.has(`${log.id}-context`)}
													onToggle={() => toggleSection(`${log.id}-context`)}
													badges={[]}>
													<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto'>
														{safeStringify(log.data.params)}
													</pre>
												</CollapsibleSection>
											)}

											{/* Request Section */}
											{log.data.params && (
												<CollapsibleSection
													id={`${log.id}-request`}
													title='Request'
													isExpanded={expandedSections.has(`${log.id}-request`)}
													onToggle={() => toggleSection(`${log.id}-request`)}
													badges={[
														{
															label: `Path: ${log.apiRoute || '/api/unknown'}`,
															color: 'gray' as const,
														},
														{ label: 'Method: POST', color: 'blue' as const },
														{
															label: (() => {
																const sizeBytes = safeStringify(
																	log.data.params
																).length;
																if (sizeBytes < 1024) {
																	return `Size: ${sizeBytes}B`;
																} else {
																	return `Size: ${(sizeBytes / 1024).toFixed(
																		1
																	)}KB`;
																}
															})(),
															color: 'gray' as const,
														},
													]}>
													<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto'>
														{safeStringify(log.data.params)}
													</pre>
												</CollapsibleSection>
											)}

											{/* Response Section */}
											{(log.data.response ||
												log.data.streamContent ||
												log.data.streamObjects) && (
												<CollapsibleSection
													id={`${log.id}-response`}
													title='Response'
													isExpanded={expandedSections.has(
														`${log.id}-response`
													)}
													onToggle={() => toggleSection(`${log.id}-response`)}
													badges={[
														{
															label:
																log.type === 'error'
																	? 'Status: Error'
																	: 'Status: Success',
															color:
																log.type === 'error'
																	? ('red' as const)
																	: ('green' as const),
														},
														{
															label: `Time: ${log.duration || 0}ms`,
															color: 'gray' as const,
														},
														...(log.data.streamContent
															? [
																	{
																		label: `Chars: ${log.data.streamContent.length}`,
																		color: 'purple' as const,
																	},
															  ]
															: []),
														{
															label: `Provider: ${log.provider || 'unknown'}`,
															color: 'gray' as const,
														},
													]}>
													{log.data.streamContent && (
														<div className='mb-2'>
															<div className='text-xs font-semibold mb-1'>
																Stream Content:
															</div>
															<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-60 overflow-y-auto'>
																{log.data.streamContent}
															</pre>
														</div>
													)}
													{log.data.streamObjects &&
														log.data.streamObjects.length > 0 && (
															<div className='mb-2'>
																<div className='text-xs font-semibold mb-1'>
																	Stream Objects (
																	{log.data.streamObjects.length}):
																</div>
																<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-60 overflow-y-auto'>
																	{safeStringify(log.data.streamObjects)}
																</pre>
															</div>
														)}
													{log.data.response && (
														<div>
															<div className='text-xs font-semibold mb-1'>
																Response Data:
															</div>
															<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto'>
																{safeStringify(log.data.response)}
															</pre>
														</div>
													)}
												</CollapsibleSection>
											)}

											{/* Response Handler Section */}
											{log.data.handlers && log.data.handlers.length > 0 && (
												<CollapsibleSection
													id={`${log.id}-handlers`}
													title='Response Handlers'
													isExpanded={expandedSections.has(
														`${log.id}-handlers`
													)}
													onToggle={() => toggleSection(`${log.id}-handlers`)}
													badges={(() => {
														// Group handlers by processor name and create badges
														const handlerCounts = log.data.handlers!.reduce(
															(acc, handler) => {
																const name = handler.processorName;
																acc[name] = (acc[name] || 0) + 1;
																return acc;
															},
															{} as Record<string, number>
														);

														return Object.entries(handlerCounts).map(
															([processorName, count]) => ({
																label:
																	count > 1
																		? `${processorName} (${count})`
																		: processorName,
																color: (() => {
																	// Color based on namespace
																	if (processorName?.includes('builtin'))
																		return 'green' as const;
																	if (
																		processorName?.includes('fallback') ||
																		processorName?.includes('unhandled')
																	)
																		return 'yellow' as const;
																	if (
																		processorName?.includes('unknown') ||
																		processorName?.includes('untyped')
																	)
																		return 'gray' as const;
																	if (
																		processorName?.includes('validation-failed')
																	)
																		return 'red' as const;
																	if (
																		processorName?.includes('execution-error')
																	)
																		return 'red' as const;
																	if (processorName?.includes('default'))
																		return 'blue' as const;
																	return 'amber' as const;
																})(),
															})
														);
													})()}>
													<div className='space-y-2'>
														{log.data.handlers.map((handler, idx) => {
															// Special display for text handlers
															if (handler.processorName === 'builtin:text') {
																const content =
																	'content' in handler.handledObject
																		? String(handler.handledObject.content)
																		: '';
																return (
																	<div
																		key={idx}
																		className='border border-gray-200 dark:border-gray-700 rounded p-2'>
																		<div className='flex items-center gap-2 mb-1'>
																			<span className='bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded text-xs'>
																				builtin:text
																			</span>
																			<span className='text-xs text-gray-500 dark:text-gray-400'>
																				{content.length} characters
																			</span>
																		</div>
																		<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap'>
																			{content}
																		</pre>
																	</div>
																);
															}

															// Regular display for other handlers
															return (
																<div
																	key={idx}
																	className='border border-gray-200 dark:border-gray-700 rounded p-2'>
																	<div className='flex items-center gap-2 mb-1'>
																		<span
																			className={cn(
																				'px-1.5 py-0.5 rounded text-xs',
																				(() => {
																					// Color based on namespace
																					if (
																						handler.processorName?.includes(
																							'builtin'
																						)
																					)
																						return 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200';
																					if (
																						handler.processorName?.includes(
																							'fallback'
																						) ||
																						handler.processorName?.includes(
																							'unhandled'
																						)
																					)
																						return 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200';
																					if (
																						handler.processorName?.includes(
																							'unknown'
																						) ||
																						handler.processorName?.includes(
																							'untyped'
																						)
																					)
																						return 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
																					if (
																						handler.processorName?.includes(
																							'validation-failed'
																						)
																					)
																						return 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
																					if (
																						handler.processorName?.includes(
																							'execution-error'
																						)
																					)
																						return 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
																					if (
																						handler.processorName?.includes(
																							'default'
																						)
																					)
																						return 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200';
																					return 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200';
																				})()
																			)}>
																			{handler.processorName}
																		</span>
																		<span className='text-xs text-gray-500 dark:text-gray-400'>
																			Type:{' '}
																			{'type' in handler.handledObject
																				? String(handler.handledObject.type)
																				: 'untyped'}
																		</span>
																	</div>
																	<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto'>
																		{safeStringify(handler.handledObject)}
																	</pre>
																</div>
															);
														})}
													</div>
												</CollapsibleSection>
											)}

											{/* Error Section */}
											{log.data.error && (
												<div className='border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950 p-2'>
													<div className='text-xs font-semibold mb-1 text-red-600'>
														Error:
													</div>
													<pre className='text-xs bg-red-100 dark:bg-red-900/20 p-2 rounded overflow-x-auto text-red-700 dark:text-red-300'>
														{log.data.error.message ||
															safeStringify(log.data.error)}
													</pre>
												</div>
											)}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					);
				})
			)}
		</div>
	);
};

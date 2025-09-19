import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Hash,
	Check,
	Copy,
	ChevronDown,
	ChevronRight,
	GitCompare,
	AlertTriangle,
	Plus,
	Minus,
	Edit,
} from 'lucide-react';
import { isEqual } from 'lodash';
import { diffLines, diffJson, diffWords, Change } from 'diff';
import type { registeredState } from '@/store/stateSlice/stateSlice';
import type { StatesTabProps } from './types';

export const StatesTab: React.FC<StatesTabProps> = ({
	states,
	diffStates = {},
	onCopy,
	copiedId,
}) => {
	const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

	const toggleExpanded = (stateKey: string) => {
		setExpandedStates((prev) => {
			const next = new Set(prev);
			if (next.has(stateKey)) {
				next.delete(stateKey);
			} else {
				next.add(stateKey);
			}
			return next;
		});
	};

	const getStatePreview = (registeredState: registeredState): string => {
		const value = registeredState?.value;
		if (value === null) return 'null';
		if (value === undefined) return 'undefined';
		if (typeof value === 'string')
			return `"${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`;
		if (typeof value === 'number' || typeof value === 'boolean')
			return String(value);
		if (Array.isArray(value)) return `Array(${value.length})`;
		if (typeof value === 'object')
			return `Object(${Object.keys(value).length} keys)`;
		return String(value);
	};

	// Helper function to get diff analysis
	const getDiffAnalysis = (key: string) => {
		const diffHistoryState = diffStates[key];
		if (!diffHistoryState?.diffState) return null;

		const { oldState, newState, computedState, isDiffMode } =
			diffHistoryState.diffState;
		const registeredState = states[key];

		// Check if oldState and newState are different
		const hasStateDifference = !isEqual(oldState, newState);

		// Check if computedState is different from registered state
		const hasComputedDifference = registeredState
			? !isEqual(computedState, registeredState.value)
			: false;

		return {
			oldState,
			newState,
			computedState,
			isDiffMode,
			hasStateDifference,
			hasComputedDifference,
			cleanState:
				diffHistoryState.diffMode === 'defaultAccept' ? newState : oldState,
		};
	};

	// Helper function to render diff indicator
	const renderDiffIndicator = (key: string) => {
		const diffAnalysis = getDiffAnalysis(key);
		if (!diffAnalysis) return null;

		const { isDiffMode, hasStateDifference, hasComputedDifference } =
			diffAnalysis;

		if (isDiffMode && hasStateDifference) {
			return (
				<div className='flex items-center gap-1 ml-1' title='Has diff changes'>
					<GitCompare className='w-3 h-3 text-orange-500' />
				</div>
			);
		}

		if (hasComputedDifference) {
			return (
				<div
					className='flex items-center gap-1 ml-1'
					title='Computed state differs from registered state'>
					<AlertTriangle className='w-3 h-3 text-yellow-500' />
				</div>
			);
		}

		return null;
	};

	// Helper function to get precise JSON differences using diff package
	const getJSONDifferences = (oldObj: unknown, newObj: unknown) => {
		const oldStr = JSON.stringify(oldObj, null, 2);
		const newStr = JSON.stringify(newObj, null, 2);

		// Try JSON diff first (structural diff)
		try {
			const jsonDiff = diffJson(
				oldObj as string | object,
				newObj as string | object
			);
			if (jsonDiff.length > 1) {
				return { type: 'json', diff: jsonDiff, oldStr, newStr };
			}
		} catch {
			// Fallback to line diff if JSON diff fails
		}

		// Fallback to line-by-line diff
		const lineDiff = diffLines(oldStr, newStr);
		return { type: 'lines', diff: lineDiff, oldStr, newStr };
	};

	// Helper function to render precise diff using diff package with preserved formatting
	const renderPreciseDiff = (changes: Change[]) => {
		return (
			<div className='text-xs font-mono'>
				{changes.map((change, index) => {
					let className = '';
					let prefix = '';

					if (change.added) {
						className =
							'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200';
						prefix = '+';
					} else if (change.removed) {
						className =
							'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200';
						prefix = '-';
					} else {
						className = 'text-gray-700 dark:text-gray-300';
						prefix = ' ';
					}

					// Split by lines and render each line while preserving whitespace
					const lines = change.value.split('\n');
					return lines
						.map((line, lineIndex) => {
							// Skip empty lines at the end
							if (lineIndex === lines.length - 1 && line === '') {
								return null;
							}

							return (
								<div
									key={`${index}-${lineIndex}`}
									className={`${className} flex`}>
									<span className='select-none opacity-50 mr-2 flex-shrink-0'>
										{prefix}
									</span>
									<pre className='whitespace-pre font-mono text-xs m-0 p-0 bg-transparent'>
										{line}
									</pre>
								</div>
							);
						})
						.filter(Boolean);
				})}
			</div>
		);
	};

	// Helper function to render word-level diff for individual lines with preserved formatting
	const renderWordDiff = (oldText: string, newText: string) => {
		const wordDiff = diffWords(oldText, newText);

		return (
			<pre className='text-xs font-mono whitespace-pre-wrap m-0 p-0 bg-transparent'>
				{wordDiff.map((change, index) => {
					if (change.added) {
						return (
							<span
								key={index}
								className='bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 px-1 rounded'>
								{change.value}
							</span>
						);
					} else if (change.removed) {
						return (
							<span
								key={index}
								className='bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200 px-1 rounded line-through'>
								{change.value}
							</span>
						);
					} else {
						return <span key={index}>{change.value}</span>;
					}
				})}
			</pre>
		);
	};

	// Helper function to create a visual diff with highlighted changes
	const renderObjectDiff = (
		oldObj: unknown,
		newObj: unknown,
		title: string,
		copyId: string
	) => {
		const oldStr = JSON.stringify(oldObj, null, 2);
		const newStr = JSON.stringify(newObj, null, 2);

		if (oldStr === newStr) {
			return (
				<div>
					<div className='flex items-center gap-2 mb-2'>
						<span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
							{title}
						</span>
						<span className='text-xs text-gray-500 dark:text-gray-400'>
							(No differences)
						</span>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onCopy(newStr, copyId);
							}}
							className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
							{copiedId === copyId ? (
								<Check className='w-3 h-3 text-green-600' />
							) : (
								<Copy className='w-3 h-3' />
							)}
						</button>
					</div>
					<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre font-mono'>
						{newStr}
					</pre>
				</div>
			);
		}

		// Get precise differences using diff package
		const diffResult = getJSONDifferences(oldObj, newObj);
		const { type, diff } = diffResult;

		// Count changes
		const addedCount = diff.filter((change) => change.added).length;
		const removedCount = diff.filter((change) => change.removed).length;
		const totalChanges = addedCount + removedCount;

		return (
			<div>
				<div className='flex items-center gap-2 mb-2'>
					<span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
						{title}
					</span>
					<div title='Has differences'>
						<Edit className='w-3 h-3 text-orange-500' />
					</div>
					<span className='text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded'>
						{totalChanges} change{totalChanges !== 1 ? 's' : ''} ({type} diff)
					</span>
					<button
						onClick={(e) => {
							e.stopPropagation();
							onCopy(`OLD:\n${oldStr}\n\nNEW:\n${newStr}`, copyId);
						}}
						className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
						{copiedId === copyId ? (
							<Check className='w-3 h-3 text-green-600' />
						) : (
							<Copy className='w-3 h-3' />
						)}
					</button>
				</div>

				{/* Diff Statistics */}
				{totalChanges > 0 && (
					<div className='mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded border'>
						<div className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
							Diff Summary:
						</div>
						<div className='flex gap-4 text-xs'>
							{addedCount > 0 && (
								<span className='text-green-600 dark:text-green-400'>
									+{addedCount} addition{addedCount !== 1 ? 's' : ''}
								</span>
							)}
							{removedCount > 0 && (
								<span className='text-red-600 dark:text-red-400'>
									-{removedCount} deletion{removedCount !== 1 ? 's' : ''}
								</span>
							)}
						</div>
					</div>
				)}

				{/* Unified Diff View */}
				<div className='mb-4'>
					<div className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
						Unified Diff:
					</div>
					<div className='bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto'>
						{renderPreciseDiff(diff)}
					</div>
				</div>

				{/* Word-level diff for short changes */}
				{type === 'lines' && oldStr.length < 1000 && newStr.length < 1000 && (
					<div className='mb-4'>
						<div className='text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
							Word-level Changes:
						</div>
						<div className='bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-3 overflow-x-auto'>
							{renderWordDiff(oldStr, newStr)}
						</div>
					</div>
				)}

				{/* Side-by-side view for reference */}
				<details className='mt-4'>
					<summary className='text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100'>
						Show Side-by-Side Comparison
					</summary>
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-2 mt-2'>
						<div>
							<div className='flex items-center gap-1 mb-1'>
								<Minus className='w-3 h-3 text-red-500' />
								<span className='text-xs text-red-700 dark:text-red-300 font-medium'>
									Before
								</span>
							</div>
							<pre className='text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded overflow-x-auto border border-red-200 dark:border-red-800 whitespace-pre font-mono'>
								{oldStr}
							</pre>
						</div>
						<div>
							<div className='flex items-center gap-1 mb-1'>
								<Plus className='w-3 h-3 text-green-500' />
								<span className='text-xs text-green-700 dark:text-green-300 font-medium'>
									After
								</span>
							</div>
							<pre className='text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded overflow-x-auto border border-green-200 dark:border-green-800 whitespace-pre font-mono'>
								{newStr}
							</pre>
						</div>
					</div>
				</details>
			</div>
		);
	};

	return (
		<div className='h-full overflow-y-auto p-2 space-y-1'>
			{Object.keys(states).length === 0 ? (
				<div className='text-center text-gray-500 dark:text-gray-400 py-4 text-xs'>
					No states registered yet
				</div>
			) : (
				Object.entries(states).map(([key, registeredState]) => {
					const isExpanded = expandedStates.has(key);

					return (
						<div
							key={key}
							className='border rounded-lg bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800'>
							<div
								className={`flex items-center justify-between p-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-900/80 ${
									isExpanded ? 'rounded-t-lg' : 'rounded-lg'
								}`}
								onClick={() => toggleExpanded(key)}>
								<div className='flex items-center gap-1.5 flex-1'>
									<Hash className='w-3 h-3 text-gray-500' />
									<span className='font-medium text-xs font-mono'>{key}</span>
									{renderDiffIndicator(key)}
									{!isExpanded && (
										<span className='text-xs text-gray-500 dark:text-gray-500 ml-1'>
											{getStatePreview(registeredState)}
										</span>
									)}
								</div>
								<div className='flex items-center gap-1'>
									<button
										onClick={(e) => {
											e.stopPropagation();
											onCopy(JSON.stringify(registeredState, null, 2), key);
										}}
										className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
										{copiedId === key ? (
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
										<div className='p-3 pt-0 rounded-b-lg space-y-3'>
											{/* Registered State */}
											<div>
												<div className='flex items-center gap-2 mb-2'>
													<span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
														Registered State
													</span>
													<button
														onClick={(e) => {
															e.stopPropagation();
															onCopy(
																JSON.stringify(registeredState, null, 2),
																`${key}-registered`
															);
														}}
														className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
														{copiedId === `${key}-registered` ? (
															<Check className='w-3 h-3 text-green-600' />
														) : (
															<Copy className='w-3 h-3' />
														)}
													</button>
												</div>
												<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre font-mono'>
													{JSON.stringify(registeredState, null, 2)}
												</pre>
											</div>

											{/* Diff State Information */}
											{(() => {
												const diffAnalysis = getDiffAnalysis(key);
												if (!diffAnalysis) return null;

												return (
													<div className='space-y-3'>
														{/* Diff State Summary */}
														<div className='bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800'>
															<div className='flex items-center gap-2 mb-2'>
																<GitCompare className='w-3 h-3 text-blue-600' />
																<span className='text-xs font-semibold text-blue-700 dark:text-blue-300'>
																	Diff State
																</span>
															</div>
															<div className='text-xs text-blue-600 dark:text-blue-400 space-y-1'>
																<div>
																	Diff Mode:{' '}
																	<span className='font-mono'>
																		{diffAnalysis.isDiffMode
																			? 'Active'
																			: 'Inactive'}
																	</span>
																</div>
																<div>
																	Has State Difference:{' '}
																	<span className='font-mono'>
																		{diffAnalysis.hasStateDifference
																			? 'Yes'
																			: 'No'}
																	</span>
																</div>
																<div>
																	Computed vs Registered Diff:{' '}
																	<span className='font-mono'>
																		{diffAnalysis.hasComputedDifference
																			? 'Yes'
																			: 'No'}
																	</span>
																</div>
															</div>
														</div>

														{/* Old State vs New State Diff */}
														{renderObjectDiff(
															diffAnalysis.oldState,
															diffAnalysis.newState,
															'State Changes',
															`${key}-diff`
														)}

														{/* Computed vs Clean State Precise Diff */}
														{renderObjectDiff(
															diffAnalysis.cleanState,
															diffAnalysis.computedState,
															'Computed vs Clean State',
															`${key}-computed-clean-diff`
														)}

														{/* Individual State Views (Collapsible) */}
														<details className='mt-4'>
															<summary className='text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100'>
																Show Individual State Views
															</summary>
															<div className='grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3'>
																{/* Computed State */}
																<div>
																	<div className='flex items-center gap-2 mb-2'>
																		<span className='text-xs font-semibold text-purple-700 dark:text-purple-300'>
																			Computed State
																		</span>
																		<button
																			onClick={(e) => {
																				e.stopPropagation();
																				onCopy(
																					JSON.stringify(
																						diffAnalysis.computedState,
																						null,
																						2
																					),
																					`${key}-computed`
																				);
																			}}
																			className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
																			{copiedId === `${key}-computed` ? (
																				<Check className='w-3 h-3 text-green-600' />
																			) : (
																				<Copy className='w-3 h-3' />
																			)}
																		</button>
																	</div>
																	<pre className='text-xs bg-purple-50 dark:bg-purple-900/20 p-2 rounded overflow-x-auto border border-purple-200 dark:border-purple-800 whitespace-pre font-mono'>
																		{JSON.stringify(
																			diffAnalysis.computedState,
																			null,
																			2
																		)}
																	</pre>
																</div>

																{/* Clean State */}
																<div>
																	<div className='flex items-center gap-2 mb-2'>
																		<span className='text-xs font-semibold text-gray-700 dark:text-gray-300'>
																			Clean State
																		</span>
																		<button
																			onClick={(e) => {
																				e.stopPropagation();
																				onCopy(
																					JSON.stringify(
																						diffAnalysis.cleanState,
																						null,
																						2
																					),
																					`${key}-clean`
																				);
																			}}
																			className='p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'>
																			{copiedId === `${key}-clean` ? (
																				<Check className='w-3 h-3 text-green-600' />
																			) : (
																				<Copy className='w-3 h-3' />
																			)}
																		</button>
																	</div>
																	<pre className='text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre font-mono'>
																		{JSON.stringify(
																			diffAnalysis.cleanState,
																			null,
																			2
																		)}
																	</pre>
																</div>
															</div>
														</details>

														{/* Computed vs Registered State Comparison */}
														{diffAnalysis.hasComputedDifference && (
															<div className='bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800'>
																<div className='flex items-center gap-2 mb-3'>
																	<AlertTriangle className='w-4 h-4 text-yellow-600' />
																	<span className='text-xs font-semibold text-yellow-700 dark:text-yellow-300'>
																		State Synchronization Issue
																	</span>
																</div>
																<div className='text-xs text-yellow-700 dark:text-yellow-300 mb-3'>
																	The computed state differs from the registered
																	state, indicating a potential synchronization
																	issue.
																</div>
																{renderObjectDiff(
																	registeredState.value,
																	diffAnalysis.computedState,
																	'Registered vs Computed State',
																	`${key}-sync-diff`
																)}
															</div>
														)}
													</div>
												);
											})()}
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

'use client';

import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '../ui/collapsible';
import { useDebugStore } from './use-debug-store';
import { cn } from 'cedar-os';
import { Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const getStatusColor = (status: number) => {
	if (status >= 200 && status < 300)
		return 'text-green-600 dark:text-green-400';
	if (status >= 400 && status < 500)
		return 'text-orange-600 dark:text-orange-400';
	if (status >= 500) return 'text-red-600 dark:text-red-400';
	return 'text-muted-foreground';
};

function JsonViewer({ data }: { data: any }) {
	const jsonString = JSON.stringify(data, null, 2);

	return (
		<div className='bg-muted/30 dark:bg-muted/20 p-3 rounded-md border'>
			<pre className='text-xs font-mono text-foreground overflow-x-auto'>
				<code>{jsonString}</code>
			</pre>
		</div>
	);
}

function RequestDetails({ request }: { request: any }) {
	const [expandedSections, setExpandedSections] = useState<
		Record<string, boolean>
	>({
		response: false, // Default response section to expanded to match image
	});

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const additionalContext = {
		user: '456',
		model: 'gpt',
		selectedNodes: 3,
		temp: 0.3,
	};

	const requestDetails = {
		path: '/ai/summarize',
		method: 'POST',
		size: '0.25KB',
	};

	const responseData = {
		content:
			'Performance review meeting request for Q4, needs scheduling for next week',
		usage: {
			promptTokens: 85,
			completionTokens: 42,
			totalTokens: 127,
		},
		metadata: {
			model: 'gpt-4-turbo',
			finishReason: 'stop',
			responseTime: 850,
		},
		object: {
			type: 'email_summary',
		},
	};

	const handlerInfo = {
		type: 'setState',
		status: 'Success',
		time: '12ms',
	};

	return (
		<div className='space-y-1 mt-2 border-t pt-2'>
			<Collapsible
				open={expandedSections.context}
				onOpenChange={() => toggleSection('context')}>
				<CollapsibleTrigger className='flex items-center justify-between w-full text-left py-1 hover:bg-muted/20 rounded px-1'>
					<div className='flex items-center gap-2'>
						{expandedSections.context ? (
							<ChevronDown className='h-3 w-3' />
						) : (
							<ChevronRight className='h-3 w-3' />
						)}
						<span className='text-sm font-medium'>Additional Context</span>
					</div>
					<div className='flex gap-2 text-xs text-muted-foreground'>
						<Badge
							variant='secondary'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							User: {additionalContext.user}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Model: {additionalContext.model}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							selectedNodes: {additionalContext.selectedNodes}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Temp: {additionalContext.temp}
						</Badge>
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent className='px-4 pb-2'>
					<div className='flex flex-wrap gap-2'>
						{/*<Badge
							variant='secondary'
							className='text-xs text-[#00AD50] bg-transparent border-[#OAOAOA]'>
							User: {additionalContext.user}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#00AD50] bg-transparent border-[#OAOAOA]'>
							Model: {additionalContext.model}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#00AD50] bg-transparent border-[#OAOAOA]'>
							selectedNodes: {additionalContext.selectedNodes}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs text-[#00AD50] bg-transparent border-[#OAOAOA]'>
							Temp: {additionalContext.temp}
						</Badge>*/}
					</div>
				</CollapsibleContent>
			</Collapsible>

			<Collapsible
				open={expandedSections.request}
				onOpenChange={() => toggleSection('request')}>
				<CollapsibleTrigger className='flex items-center justify-between w-full text-left py-1 hover:bg-muted/20 rounded px-1'>
					<div className='flex items-center gap-2'>
						{expandedSections.request ? (
							<ChevronDown className='h-3 w-3' />
						) : (
							<ChevronRight className='h-3 w-3' />
						)}
						<span className='text-sm font-medium'>Request</span>
					</div>
					<div className='flex gap-2 text-xs text-muted-foreground'>
						<Badge
							variant={'outline'}
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Path: {requestDetails.path}
						</Badge>
						<Badge
							variant={'outline'}
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Method: {requestDetails.method}
						</Badge>
						<Badge
							variant={'outline'}
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Size: {requestDetails.size}
						</Badge>
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent className='px-4 pb-2'>
					{/*<div className='flex flex-wrap gap-2'>
						<Badge
							variant='outline'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5]'>
							Path: {requestDetails.path}
						</Badge>
						<Badge
							variant='outline'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5]'>
							Method: {requestDetails.method}
						</Badge>
						<Badge
							variant='outline'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5]'>
							Size: {requestDetails.size}
						</Badge>
					</div>*/}
				</CollapsibleContent>
			</Collapsible>

			<Collapsible
				// open={expandedSections.response}
				onOpenChange={() => toggleSection('response')}>
				<CollapsibleTrigger className='flex items-center justify-between w-full text-left py-1 hover:bg-muted/20 rounded px-1'>
					<div className='flex items-center gap-2'>
						{expandedSections.response ? (
							<ChevronDown className='h-3 w-3' />
						) : (
							<ChevronRight className='h-3 w-3' />
						)}
						<span className='text-sm font-medium'>Response</span>
					</div>
					<div className='flex gap-2 text-xs'>
						<Badge
							variant='default'
							className={cn(
								'text-xs text-[#00AD50] bg-transparent border-[#E5E5E5]',
								getStatusColor(request.status)
							)}>
							Status: {request.status}
						</Badge>

						<Badge
							variant='default'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Time: 1200ms
						</Badge>
						<Badge
							variant='default'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Tokens: 127
						</Badge>
						<Badge
							variant='default'
							className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Model: gpt
						</Badge>
						{/*<span className='text-muted-foreground'>Time: 1200ms</span>
						<span className='text-muted-foreground'>Tokens: 127</span>
						<span className='text-muted-foreground'>Model: gpt</span>*/}
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent className='px-4 pb-2'>
					<JsonViewer data={responseData} />
				</CollapsibleContent>
			</Collapsible>

			<Collapsible
				open={expandedSections.handler}
				onOpenChange={() => toggleSection('handler')}>
				<CollapsibleTrigger className='flex items-center justify-between w-full text-left py-1 hover:bg-muted/20 rounded px-1'>
					<div className='flex items-center gap-2'>
						{expandedSections.handler ? (
							<ChevronDown className='h-3 w-3' />
						) : (
							<ChevronRight className='h-3 w-3' />
						)}
						<span className='text-sm font-medium'>Handler</span>
					</div>
					<div className='flex gap-2 text-xs'>
						<Badge
							variant='secondary'
							className='text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
							Type: {handlerInfo.type}
						</Badge>
						<Badge
							variant='secondary'
							className='text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'>
							Status: {handlerInfo.status}
						</Badge>
						<Badge className='text-xs text-[#0A0A0A] bg-transparent border-[#E5E5E5] dark:text-white'>
							Time: {handlerInfo.time}
						</Badge>
					</div>
				</CollapsibleTrigger>
				<CollapsibleContent className='px-4 pb-2'>
					<div className='flex flex-wrap gap-2'>
						<Badge variant='secondary' className='text-xs'>
							Type: {handlerInfo.type}
						</Badge>
						<Badge variant='secondary' className='text-xs'>
							Status: {handlerInfo.status}
						</Badge>
						<Badge variant='secondary' className='text-xs'>
							Time: {handlerInfo.time}
						</Badge>
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}

export function NetworkTab() {
	const { networkRequests } = useDebugStore();
	const [expandedRequests, setExpandedRequests] = useState<
		Record<string, boolean>
	>({
		'1': false, // Default first request to expanded to match image
	});

	const toggleRequest = (requestId: string) => {
		setExpandedRequests((prev) => ({ ...prev, [requestId]: !prev[requestId] }));
	};

	const formatTime = (date: Date) => {
		return date.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		});
	};

	return (
		<ScrollArea className='h-full'>
			<div className='p-3 space-y-2'>
				{networkRequests.map((request) => (
					<div
						key={request.id}
						className='border rounded-lg bg-[#FCFCFC] dark:bg-card/50'>
						<Collapsible
							open={expandedRequests[request.id]}
							onOpenChange={() => toggleRequest(request.id)}>
							<CollapsibleTrigger className='w-full p-3 text-left cursor-pointer'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-2'>
										{expandedRequests[request.id] ? (
											<ChevronDown className='h-4 w-4 text-muted-foreground cursor-pointer' />
										) : (
											<ChevronRight className='h-4 w-4 text-muted-foreground cursor-pointer' />
										)}
										<Badge variant='outline' className='text-xs font-mono'>
											{request.method}
										</Badge>
										<span
											className={cn(
												'text-sm font-medium',
												getStatusColor(request.status)
											)}>
											{request.status}
										</span>
										{request.streaming && (
											<div className='flex items-center gap-1'>
												<Zap className='h-3 w-3 text-blue-500' />
												<span className='text-xs text-blue-500 font-medium'>
													STREAMING
												</span>
											</div>
										)}
									</div>
									<span className='text-xs text-muted-foreground'>
										{formatTime(request.timestamp)}
									</span>
								</div>

								<div className='text-sm font-mono text-foreground mt-1 ml-6'>
									{request.url}
								</div>
								<div className='text-xs text-muted-foreground mt-1 ml-6'>
									{request.duration}ms
								</div>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<div className='px-3 pb-3'>
									<RequestDetails request={request} />
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>
				))}

				{networkRequests.length === 0 && (
					<div className='text-center text-muted-foreground text-sm py-8'>
						No network requests recorded
					</div>
				)}
			</div>
		</ScrollArea>
	);
}

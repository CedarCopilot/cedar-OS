'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	CedarCaptionChat,
	ChatBubbles,
	ChatInput,
	FloatingCedarChat,
	useCedarStore,
} from 'cedar-os';
import { useState, useEffect } from 'react';
import { Card } from '../components/Card';

interface SliderControlProps {
	label: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	onChange: (value: number) => void;
	disabled?: boolean;
}

function SliderControl({
	label,
	value,
	min,
	max,
	step = 1,
	onChange,
	disabled,
}: SliderControlProps) {
	return (
		<div className={`space-y-2 ${disabled ? 'opacity-50' : ''}`}>
			<Label className='text-xs font-medium'>
				{label}: {value}px
			</Label>
			<Slider
				value={[value]}
				min={min}
				max={max}
				step={step}
				onValueChange={(values) => onChange(values[0])}
				disabled={disabled}
				className='w-full'
			/>
		</div>
	);
}

interface CheckboxControlProps {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}

function CheckboxControl({ label, checked, onChange }: CheckboxControlProps) {
	return (
		<div className='flex items-center space-x-2'>
			<Checkbox checked={checked} onCheckedChange={onChange} />
			<Label className='text-xs font-medium'>{label}</Label>
		</div>
	);
}

interface ChatSectionProps {
	activeTab?: string;
	onTabChange?: (tab: string) => void;
}

export function ChatSection({
	activeTab: externalActiveTab,
	onTabChange,
}: ChatSectionProps = {}) {
	// Use internal state if no external control is provided
	const [internalActiveTab, setInternalActiveTab] = useState('caption');
	const activeTab = externalActiveTab ?? internalActiveTab;
	const setActiveTab = onTabChange ?? setInternalActiveTab;

	const setShowChat = useCedarStore((state) => state.setShowChat);

	// Effect to sync showChat state with sidepanel tab
	useEffect(() => {
		if (externalActiveTab !== undefined) {
			// When controlled externally, sync the showChat state
			setShowChat(externalActiveTab === 'sidepanel');
		}
	}, [externalActiveTab, setShowChat]);

	// Floating Chat Props
	const [floatingProps, setFloatingProps] = useState({
		side: 'right' as 'left' | 'right',
		title: 'Cedar Assistant',
		collapsedLabel: 'Open the Cedar Copilot',
		resizable: true,
		dimensions: {
			useWidth: false,
			width: 400,
			useHeight: false,
			height: 600,
			useMinWidth: false,
			minWidth: 300,
			useMinHeight: false,
			minHeight: 400,
			useMaxWidth: false,
			maxWidth: 600,
			useMaxHeight: false,
			maxHeight: 800,
		},
	});

	// Side Panel Props
	const [sidePanelProps, setSidePanelProps] = useState({
		side: 'left' as 'left' | 'right',
		title: 'Cedar Support',
		collapsedLabel: 'Open Cedar Copilot',
		resizable: true,
		dimensions: {
			useWidth: false,
			width: 350,
			useMinWidth: false,
			minWidth: 300,
			useMaxWidth: false,
			maxWidth: 500,
		},
	});

	// Caption Props
	const [captionProps, setCaptionProps] = useState({
		className: 'custom-caption-chat',
		dimensions: {
			useWidth: false,
			width: 600,
			useMaxWidth: false,
			maxWidth: 800,
		},
	});

	// Helper functions to create dimension objects
	const getFloatingDimensions = () => {
		const dims: Record<string, number> = {};
		if (floatingProps.dimensions.useWidth)
			dims.width = floatingProps.dimensions.width;
		if (floatingProps.dimensions.useHeight)
			dims.height = floatingProps.dimensions.height;
		if (floatingProps.dimensions.useMinWidth)
			dims.minWidth = floatingProps.dimensions.minWidth;
		if (floatingProps.dimensions.useMinHeight)
			dims.minHeight = floatingProps.dimensions.minHeight;
		if (floatingProps.dimensions.useMaxWidth)
			dims.maxWidth = floatingProps.dimensions.maxWidth;
		if (floatingProps.dimensions.useMaxHeight)
			dims.maxHeight = floatingProps.dimensions.maxHeight;
		return Object.keys(dims).length > 0 ? dims : undefined;
	};

	// Helper function used in sidepanel tab content for dimension configuration display
	const getSidePanelDimensions = () => {
		const dims: Record<string, number> = {};
		if (sidePanelProps.dimensions.useWidth)
			dims.width = sidePanelProps.dimensions.width;
		if (sidePanelProps.dimensions.useMinWidth)
			dims.minWidth = sidePanelProps.dimensions.minWidth;
		if (sidePanelProps.dimensions.useMaxWidth)
			dims.maxWidth = sidePanelProps.dimensions.maxWidth;
		return Object.keys(dims).length > 0 ? dims : undefined;
	};

	const getCaptionDimensions = () => {
		const dims: Record<string, number> = {};
		if (captionProps.dimensions.useWidth)
			dims.width = captionProps.dimensions.width;
		if (captionProps.dimensions.useMaxWidth)
			dims.maxWidth = captionProps.dimensions.maxWidth;
		return Object.keys(dims).length > 0 ? dims : undefined;
	};

	return (
		<>
			<Card title='Chat'>
				<Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
					<TabsList className='grid w-full grid-cols-4'>
						<TabsTrigger value='caption'>Caption</TabsTrigger>
						<TabsTrigger value='embedded'>Embedded</TabsTrigger>
						<TabsTrigger value='floating'>Floating</TabsTrigger>
						<TabsTrigger value='sidepanel'>Side Panel</TabsTrigger>
					</TabsList>

					<TabsContent value='embedded' className='space-y-4'>
						<div className='p-4 bg-gray-50 rounded-lg'>
							<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
								{/* Description Column */}
								<div className='space-y-4'>
									<h3 className='font-semibold mb-2'>Embedded Mode</h3>
									<p className='text-sm text-gray-600 mb-3'>
										Chat interface embedded directly into your page layout.
									</p>
									<div className='space-y-2 text-sm'>
										<div>
											<strong>Features:</strong>
										</div>
										<ul className='list-disc list-inside space-y-1 text-gray-600'>
											<li>Direct integration with page content</li>
											<li>Customizable container styling</li>
											<li>Full control over layout and positioning</li>
											<li>Combines ChatInput and message display</li>
										</ul>
									</div>
								</div>

								{/* Chat Column */}
								<div className='space-y-4'>
									<h4 className='font-semibold text-sm'>Live Chat Interface</h4>
									<div className='h-96 border border-gray-200 rounded-lg bg-white relative flex flex-col'>
										{/* Messages Display */}
										<div className='flex-1 overflow-hidden'>
											<ChatBubbles maxHeight='100%' />
										</div>

										{/* Chat Input */}
										<div className='border-t p-4'>
											<ChatInput />
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value='floating' className='space-y-4'>
						<div className='p-4 bg-gray-50 rounded-lg'>
							<h3 className='font-semibold mb-2'>
								Floating Mode Configuration
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{/* Basic Props */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Basic Properties</h4>
									<div className='space-y-2'>
										<Label className='text-xs'>Side</Label>
										<select
											value={floatingProps.side}
											onChange={(e) =>
												setFloatingProps((prev) => ({
													...prev,
													side: e.target.value as 'left' | 'right',
												}))
											}
											className='w-full px-2 py-1 text-xs border rounded'>
											<option value='left'>Left</option>
											<option value='right'>Right</option>
										</select>
									</div>
									<div className='space-y-2'>
										<Label className='text-xs'>Title</Label>
										<Input
											value={floatingProps.title}
											onChange={(e) =>
												setFloatingProps((prev) => ({
													...prev,
													title: e.target.value,
												}))
											}
											className='text-xs'
										/>
									</div>
									<div className='space-y-2'>
										<Label className='text-xs'>Collapsed Label</Label>
										<Input
											value={floatingProps.collapsedLabel}
											onChange={(e) =>
												setFloatingProps((prev) => ({
													...prev,
													collapsedLabel: e.target.value,
												}))
											}
											className='text-xs'
										/>
									</div>
									<CheckboxControl
										label='Resizable'
										checked={floatingProps.resizable}
										onChange={(checked) =>
											setFloatingProps((prev) => ({
												...prev,
												resizable: checked,
											}))
										}
									/>
								</div>

								{/* Dimensions */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Dimensions</h4>
									<div className='space-y-3'>
										<div>
											<CheckboxControl
												label='Set Width'
												checked={floatingProps.dimensions.useWidth}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Width'
												value={floatingProps.dimensions.width}
												min={200}
												max={800}
												step={10}
												disabled={!floatingProps.dimensions.useWidth}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, width: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Height'
												checked={floatingProps.dimensions.useHeight}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useHeight: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Height'
												value={floatingProps.dimensions.height}
												min={300}
												max={1000}
												step={10}
												disabled={!floatingProps.dimensions.useHeight}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, height: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Min Width'
												checked={floatingProps.dimensions.useMinWidth}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMinWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Min Width'
												value={floatingProps.dimensions.minWidth}
												min={200}
												max={600}
												step={10}
												disabled={!floatingProps.dimensions.useMinWidth}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, minWidth: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Max Width'
												checked={floatingProps.dimensions.useMaxWidth}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMaxWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Max Width'
												value={floatingProps.dimensions.maxWidth}
												min={400}
												max={1200}
												step={10}
												disabled={!floatingProps.dimensions.useMaxWidth}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, maxWidth: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Min Height'
												checked={floatingProps.dimensions.useMinHeight}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMinHeight: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Min Height'
												value={floatingProps.dimensions.minHeight}
												min={300}
												max={800}
												step={10}
												disabled={!floatingProps.dimensions.useMinHeight}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															minHeight: value,
														},
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Max Height'
												checked={floatingProps.dimensions.useMaxHeight}
												onChange={(checked) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMaxHeight: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Max Height'
												value={floatingProps.dimensions.maxHeight}
												min={500}
												max={1200}
												step={10}
												disabled={!floatingProps.dimensions.useMaxHeight}
												onChange={(value) =>
													setFloatingProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															maxHeight: value,
														},
													}))
												}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value='sidepanel' className='space-y-4'>
						<div className='p-4 bg-gray-50 rounded-lg'>
							<h3 className='font-semibold mb-2'>
								Side Panel Mode Configuration
							</h3>
							<div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
								<p className='text-sm text-blue-800'>
									<strong>Note:</strong> The side panel wraps around the entire
									page content and squishes it when opened. The panel is now
									active and controlled by this tab.
								</p>
								<p className='text-xs text-blue-600 mt-2'>
									Current dimensions:{' '}
									{JSON.stringify(getSidePanelDimensions() || 'default')}
								</p>
							</div>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{/* Basic Props */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Basic Properties</h4>
									<div className='space-y-2'>
										<Label className='text-xs'>Side</Label>
										<select
											value={sidePanelProps.side}
											onChange={(e) =>
												setSidePanelProps((prev) => ({
													...prev,
													side: e.target.value as 'left' | 'right',
												}))
											}
											className='w-full px-2 py-1 text-xs border rounded'>
											<option value='left'>Left</option>
											<option value='right'>Right</option>
										</select>
									</div>
									<div className='space-y-2'>
										<Label className='text-xs'>Title</Label>
										<Input
											value={sidePanelProps.title}
											onChange={(e) =>
												setSidePanelProps((prev) => ({
													...prev,
													title: e.target.value,
												}))
											}
											className='text-xs'
										/>
									</div>
									<div className='space-y-2'>
										<Label className='text-xs'>Collapsed Label</Label>
										<Input
											value={sidePanelProps.collapsedLabel}
											onChange={(e) =>
												setSidePanelProps((prev) => ({
													...prev,
													collapsedLabel: e.target.value,
												}))
											}
											className='text-xs'
										/>
									</div>
									<CheckboxControl
										label='Resizable'
										checked={sidePanelProps.resizable}
										onChange={(checked) =>
											setSidePanelProps((prev) => ({
												...prev,
												resizable: checked,
											}))
										}
									/>
								</div>

								{/* Dimensions */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Dimensions</h4>
									<div className='space-y-3'>
										<div>
											<CheckboxControl
												label='Set Width'
												checked={sidePanelProps.dimensions.useWidth}
												onChange={(checked) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Width'
												value={sidePanelProps.dimensions.width}
												min={200}
												max={800}
												step={10}
												disabled={!sidePanelProps.dimensions.useWidth}
												onChange={(value) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, width: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Min Width'
												checked={sidePanelProps.dimensions.useMinWidth}
												onChange={(checked) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMinWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Min Width'
												value={sidePanelProps.dimensions.minWidth}
												min={200}
												max={600}
												step={10}
												disabled={!sidePanelProps.dimensions.useMinWidth}
												onChange={(value) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, minWidth: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Max Width'
												checked={sidePanelProps.dimensions.useMaxWidth}
												onChange={(checked) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMaxWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Max Width'
												value={sidePanelProps.dimensions.maxWidth}
												min={400}
												max={1200}
												step={10}
												disabled={!sidePanelProps.dimensions.useMaxWidth}
												onChange={(value) =>
													setSidePanelProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, maxWidth: value },
													}))
												}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>

					<TabsContent value='caption' className='space-y-4'>
						<div className='p-4 bg-gray-50 rounded-lg'>
							<h3 className='font-semibold mb-2'>Caption Mode Configuration</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
								{/* Basic Props */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Basic Properties</h4>
									<div className='space-y-2'>
										<Label className='text-xs'>CSS Class Name</Label>
										<Input
											value={captionProps.className}
											onChange={(e) =>
												setCaptionProps((prev) => ({
													...prev,
													className: e.target.value,
												}))
											}
											className='text-xs'
										/>
									</div>
								</div>

								{/* Dimensions */}
								<div className='space-y-3'>
									<h4 className='font-medium text-sm'>Dimensions</h4>
									<div className='space-y-3'>
										<div>
											<CheckboxControl
												label='Set Width'
												checked={captionProps.dimensions.useWidth}
												onChange={(checked) =>
													setCaptionProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Width'
												value={captionProps.dimensions.width}
												min={300}
												max={1000}
												step={10}
												disabled={!captionProps.dimensions.useWidth}
												onChange={(value) =>
													setCaptionProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, width: value },
													}))
												}
											/>
										</div>
										<div>
											<CheckboxControl
												label='Set Max Width'
												checked={captionProps.dimensions.useMaxWidth}
												onChange={(checked) =>
													setCaptionProps((prev) => ({
														...prev,
														dimensions: {
															...prev.dimensions,
															useMaxWidth: checked,
														},
													}))
												}
											/>
											<SliderControl
												label='Max Width'
												value={captionProps.dimensions.maxWidth}
												min={400}
												max={1200}
												step={10}
												disabled={!captionProps.dimensions.useMaxWidth}
												onChange={(value) =>
													setCaptionProps((prev) => ({
														...prev,
														dimensions: { ...prev.dimensions, maxWidth: value },
													}))
												}
											/>
										</div>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</Card>

			{/* Floating Chat */}
			{activeTab === 'floating' && (
				<FloatingCedarChat
					side={floatingProps.side}
					title={floatingProps.title}
					collapsedLabel={floatingProps.collapsedLabel}
					dimensions={getFloatingDimensions()}
					resizable={floatingProps.resizable}
				/>
			)}

			{/* Caption Chat */}
			{activeTab === 'caption' && (
				<CedarCaptionChat
					dimensions={getCaptionDimensions()}
					className={captionProps.className}
				/>
			)}
		</>
	);
}

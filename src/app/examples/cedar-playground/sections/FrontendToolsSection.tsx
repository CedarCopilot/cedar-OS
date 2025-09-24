'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
// Using regular textarea as UI component doesn't exist
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { useRegisterFrontendTool, useTools } from 'cedar-os';
import {
	Bell,
	CheckCircle,
	Copy,
	Download,
	Eye,
	EyeOff,
	Hash,
	Palette,
	RefreshCw,
	Settings,
	Trash2,
	Upload,
	Wrench,
	XCircle,
	Zap,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { z } from 'zod';

// Define schemas for different tool types
const notificationSchema = z.object({
	message: z.string().describe('The notification message to display'),
	type: z
		.enum(['success', 'error', 'info', 'warning'])
		.describe('Type of notification'),
	duration: z
		.number()
		.optional()
		.describe('Duration in milliseconds (optional)'),
});

const colorChangeSchema = z.object({
	color: z.string().describe('CSS color value (hex, rgb, or named color)'),
	element: z
		.enum(['background', 'text', 'border'])
		.describe('Which element to change'),
});

const counterSchema = z.object({
	amount: z.number().describe('Amount to increment/decrement by'),
	operation: z
		.enum(['increment', 'decrement', 'set'])
		.describe('Operation to perform'),
});

const fileOperationSchema = z.object({
	fileName: z.string().describe('Name of the file'),
	content: z.string().optional().describe('File content (for uploads)'),
	operation: z
		.enum(['upload', 'download', 'delete'])
		.describe('File operation to perform'),
});

const settingsSchema = z.object({
	setting: z.string().describe('Setting name'),
	value: z
		.union([z.string(), z.number(), z.boolean()])
		.describe('Setting value'),
});

const dataProcessingSchema = z.object({
	data: z.array(z.unknown()).describe('Array of data to process'),
	operation: z
		.enum(['sort', 'filter', 'map', 'reduce'])
		.describe('Processing operation'),
	criteria: z.string().optional().describe('Processing criteria (optional)'),
});

type NotificationArgs = z.infer<typeof notificationSchema>;
type ColorChangeArgs = z.infer<typeof colorChangeSchema>;
type CounterArgs = z.infer<typeof counterSchema>;
type FileOperationArgs = z.infer<typeof fileOperationSchema>;
type DataProcessingArgs = z.infer<typeof dataProcessingSchema>;

export function FrontendToolsSection() {
	// State for various tool demonstrations
	const [notifications, setNotifications] = useState<
		Array<{
			id: string;
			message: string;
			type: string;
			timestamp: Date;
		}>
	>([]);
	const [counter, setCounter] = useState(0);
	const [backgroundColor, setBackgroundColor] = useState('#ffffff');
	const [textColor, setTextColor] = useState('#000000');
	const [borderColor, setBorderColor] = useState('#e5e7eb');
	const [files, setFiles] = useState<
		Array<{
			name: string;
			content: string;
			timestamp: Date;
		}>
	>([]);
	const [settings, setSettings] = useState<Record<string, unknown>>({
		theme: 'light',
		autoSave: true,
		notifications: true,
	});
	const [processedData, setProcessedData] = useState<unknown[]>([]);
	console.log(processedData);
	const [toolExecutions, setToolExecutions] = useState<
		Array<{
			id: string;
			toolName: string;
			args: unknown;
			timestamp: Date;
			success: boolean;
			result?: unknown;
		}>
	>([]);

	// Manual test inputs
	const [testToolName, setTestToolName] = useState('showNotification');
	const [testArgs, setTestArgs] = useState(
		'{"message": "Hello from manual test!", "type": "info"}'
	);

	// Get tools functionality
	const { executeTool, getRegisteredTools, clearTools } = useTools();

	// Utility function to add execution log
	const addExecutionLog = useCallback(
		(toolName: string, args: unknown, success: boolean, result?: unknown) => {
			setToolExecutions((prev) =>
				[
					{
						id: Date.now().toString(),
						toolName,
						args,
						timestamp: new Date(),
						success,
						result,
					},
					...prev,
				].slice(0, 10)
			); // Keep only last 10 executions
		},
		[]
	);

	// Register notification tool
	useRegisterFrontendTool<NotificationArgs>({
		name: 'showNotification',
		execute: ({ message, type, duration = 3000 }) => {
			const notification = {
				id: Date.now().toString(),
				message,
				type,
				timestamp: new Date(),
			};
			setNotifications((prev) => [notification, ...prev].slice(0, 5));
			addExecutionLog(
				'showNotification',
				{ message, type, duration },
				true,
				notification
			);

			// Auto-remove after duration
			setTimeout(() => {
				setNotifications((prev) =>
					prev.filter((n) => n.id !== notification.id)
				);
			}, duration);
		},
		argsSchema: notificationSchema,
		description:
			'Show a notification message to the user with different types and durations',
	});

	// Register color change tool
	useRegisterFrontendTool<ColorChangeArgs>({
		name: 'changeColor',
		execute: ({ color, element }) => {
			switch (element) {
				case 'background':
					setBackgroundColor(color);
					break;
				case 'text':
					setTextColor(color);
					break;
				case 'border':
					setBorderColor(color);
					break;
			}
			addExecutionLog('changeColor', { color, element }, true, {
				element,
				newColor: color,
			});
		},
		argsSchema: colorChangeSchema,
		description:
			'Change the color of UI elements (background, text, or border)',
	});

	// Register counter tool
	useRegisterFrontendTool<CounterArgs>({
		name: 'updateCounter',
		execute: ({ amount, operation }) => {
			let newValue: number;
			switch (operation) {
				case 'increment':
					newValue = counter + amount;
					break;
				case 'decrement':
					newValue = counter - amount;
					break;
				case 'set':
					newValue = amount;
					break;
			}
			setCounter(newValue);
			addExecutionLog('updateCounter', { amount, operation }, true, {
				oldValue: counter,
				newValue,
			});
		},
		argsSchema: counterSchema,
		description:
			'Update a counter value with increment, decrement, or set operations',
	});

	// Register file operations tool
	useRegisterFrontendTool<FileOperationArgs>({
		name: 'fileOperation',
		execute: ({ fileName, content, operation }) => {
			switch (operation) {
				case 'upload':
					if (content) {
						const file = { name: fileName, content, timestamp: new Date() };
						setFiles((prev) => [file, ...prev].slice(0, 10));
						addExecutionLog(
							'fileOperation',
							{ fileName, operation },
							true,
							file
						);
					}
					break;
				case 'download':
					const fileToDownload = files.find((f) => f.name === fileName);
					if (fileToDownload) {
						// Simulate download
						const blob = new Blob([fileToDownload.content], {
							type: 'text/plain',
						});
						const url = URL.createObjectURL(blob);
						const a = document.createElement('a');
						a.href = url;
						a.download = fileName;
						a.click();
						URL.revokeObjectURL(url);
						addExecutionLog(
							'fileOperation',
							{ fileName, operation },
							true,
							fileToDownload
						);
					}
					break;
				case 'delete':
					setFiles((prev) => prev.filter((f) => f.name !== fileName));
					addExecutionLog('fileOperation', { fileName, operation }, true, {
						deleted: fileName,
					});
					break;
			}
		},
		argsSchema: fileOperationSchema,
		description: 'Perform file operations: upload, download, or delete files',
	});

	// Register settings tool
	useRegisterFrontendTool({
		name: 'updateSetting',
		execute: ({ setting, value }) => {
			setSettings((prev) => ({ ...prev, [setting]: value }));
			addExecutionLog('updateSetting', { setting, value }, true, {
				setting,
				oldValue: settings[setting],
				newValue: value,
			});
		},
		argsSchema: settingsSchema,
		description: 'Update application settings with key-value pairs',
	});

	// Register data processing tool
	useRegisterFrontendTool<DataProcessingArgs>({
		name: 'processData',
		execute: ({ data, operation, criteria }) => {
			let result;
			switch (operation) {
				case 'sort':
					result = [...data].sort();
					break;
				case 'filter':
					result = criteria
						? data.filter((item) =>
								JSON.stringify(item)
									.toLowerCase()
									.includes(criteria.toLowerCase())
						  )
						: data;
					break;
				case 'map':
					result = data.map((item, index: number) => ({
						index,
						item,
						processed: true,
					}));
					break;
				case 'reduce':
					result = [
						data.reduce((acc, item) => {
							if (typeof item === 'number') return (acc as number) + item;
							if (typeof item === 'string')
								return (acc as number) + item.length;
							return (acc as number) + 1;
						}, 0),
					];
					break;
				default:
					result = data;
			}
			setProcessedData(result);
			addExecutionLog('processData', { data, operation, criteria }, true, {
				inputLength: data.length,
				outputLength: result.length,
			});
		},
		argsSchema: dataProcessingSchema,
		description:
			'Process arrays of data with sort, filter, map, or reduce operations',
	});

	// Manual tool execution
	const handleManualExecution = async () => {
		try {
			const args = JSON.parse(testArgs);
			await executeTool(testToolName, args);
			addExecutionLog(testToolName, args, true, 'Manual execution completed');
		} catch (error) {
			console.error('Manual execution failed:', error);
			addExecutionLog(testToolName, testArgs, false, error);
		}
	};

	// Get tool info for display
	const toolsInfo = getRegisteredTools();

	// Clear all notifications
	const clearNotifications = () => setNotifications([]);

	// Reset all demo state
	const resetAllState = () => {
		setNotifications([]);
		setCounter(0);
		setBackgroundColor('#ffffff');
		setTextColor('#000000');
		setBorderColor('#e5e7eb');
		setFiles([]);
		setSettings({ theme: 'light', autoSave: true, notifications: true });
		setProcessedData([]);
		setToolExecutions([]);
	};

	return (
		<div className='py-16 px-8'>
			<div className='max-w-7xl mx-auto'>
				<div className='text-center mb-12'>
					<h2 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white'>
						Frontend Tools Testing
					</h2>
					<p className='text-lg mb-6 leading-relaxed text-gray-600 dark:text-gray-300'>
						Test and demonstrate Cedar-OS frontend tools system. Tools are
						automatically registered and can be called by agents or manually for
						testing.
					</p>
				</div>

				<Tabs defaultValue='tools-overview' className='w-full'>
					<TabsList className='grid w-full grid-cols-4'>
						<TabsTrigger value='tools-overview'>Tools Overview</TabsTrigger>
						<TabsTrigger value='live-demo'>Live Demo</TabsTrigger>
						<TabsTrigger value='manual-testing'>Manual Testing</TabsTrigger>
						<TabsTrigger value='execution-logs'>Execution Logs</TabsTrigger>
					</TabsList>

					<TabsContent value='tools-overview' className='space-y-6'>
						<GlassyPaneContainer className='p-6'>
							<div className='flex items-center justify-between mb-4'>
								<h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
									<Wrench className='w-5 h-5' />
									Registered Tools ({toolsInfo.size})
								</h3>
								<Button onClick={clearTools} variant='outline' size='sm'>
									<Trash2 className='w-4 h-4 mr-2' />
									Clear All Tools
								</Button>
							</div>

							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
								{Array.from(toolsInfo).map(([name, tool]) => (
									<div
										key={name}
										className='p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'>
										<div className='flex items-start justify-between mb-2'>
											<h4 className='font-semibold text-gray-900 dark:text-white'>
												{name}
											</h4>
											<Zap className='w-4 h-4 text-blue-500' />
										</div>
										<p className='text-sm text-gray-600 dark:text-gray-300 mb-3'>
											{tool.description || 'No description provided'}
										</p>
										<div className='text-xs'>
											<p className='font-medium text-gray-700 dark:text-gray-300 mb-1'>
												Schema:
											</p>
											<pre className='bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs overflow-auto'>
												{JSON.stringify(tool.argsSchema, null, 2)}
											</pre>
										</div>
									</div>
								))}
							</div>

							{toolsInfo.size === 0 && (
								<div className='text-center py-8'>
									<p className='text-gray-500 dark:text-gray-400'>
										No tools registered yet. Tools are registered when their
										components mount.
									</p>
								</div>
							)}
						</GlassyPaneContainer>
					</TabsContent>

					<TabsContent value='live-demo' className='space-y-6'>
						{/* Notifications Demo */}
						<GlassyPaneContainer className='p-6'>
							<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
								<Bell className='w-5 h-5' />
								Notifications Tool Demo
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
										The agent can call{' '}
										<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
											showNotification
										</code>
										to display messages to users.
									</p>
									<div className='space-y-2'>
										<Button
											onClick={() =>
												executeTool('showNotification', {
													message: 'Success message!',
													type: 'success',
												})
											}
											className='w-full'
											variant='default'>
											Test Success Notification
										</Button>
										<Button
											onClick={() =>
												executeTool('showNotification', {
													message: 'Error occurred!',
													type: 'error',
												})
											}
											className='w-full'
											variant='destructive'>
											Test Error Notification
										</Button>
									</div>
								</div>
								<div>
									<div className='flex items-center justify-between mb-2'>
										<h4 className='font-medium text-gray-900 dark:text-white'>
											Active Notifications
										</h4>
										<Button
											onClick={clearNotifications}
											size='sm'
											variant='outline'>
											Clear All
										</Button>
									</div>
									<div className='space-y-2 max-h-40 overflow-y-auto'>
										{notifications.map((notification) => (
											<div
												key={notification.id}
												className={`p-3 rounded-lg border ${
													notification.type === 'success'
														? 'bg-green-50 border-green-200 text-green-800'
														: notification.type === 'error'
														? 'bg-red-50 border-red-200 text-red-800'
														: notification.type === 'warning'
														? 'bg-yellow-50 border-yellow-200 text-yellow-800'
														: 'bg-blue-50 border-blue-200 text-blue-800'
												}`}>
												<p className='text-sm font-medium'>
													{notification.message}
												</p>
												<p className='text-xs opacity-75'>
													{notification.timestamp.toLocaleTimeString()}
												</p>
											</div>
										))}
										{notifications.length === 0 && (
											<p className='text-sm text-gray-500 text-center py-4'>
												No active notifications
											</p>
										)}
									</div>
								</div>
							</div>
						</GlassyPaneContainer>

						{/* Color Change Demo */}
						<GlassyPaneContainer
							className='p-6 transition-all duration-300'
							style={{
								backgroundColor: backgroundColor,
								color: textColor,
								borderColor: borderColor,
							}}>
							<h3 className='text-lg font-semibold mb-4 flex items-center gap-2'>
								<Palette className='w-5 h-5' />
								Color Change Tool Demo
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<p className='text-sm mb-4 opacity-80'>
										The agent can call{' '}
										<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
											changeColor
										</code>
										to modify UI colors dynamically.
									</p>
									<div className='space-y-2'>
										<Button
											onClick={() =>
												executeTool('changeColor', {
													color: '#fee2e2',
													element: 'background',
												})
											}
											size='sm'>
											Light Red Background
										</Button>
										<Button
											onClick={() =>
												executeTool('changeColor', {
													color: '#1f2937',
													element: 'text',
												})
											}
											size='sm'>
											Dark Text
										</Button>
										<Button
											onClick={() =>
												executeTool('changeColor', {
													color: '#3b82f6',
													element: 'border',
												})
											}
											size='sm'>
											Blue Border
										</Button>
									</div>
								</div>
								<div>
									<h4 className='font-medium mb-2'>Current Colors</h4>
									<div className='space-y-2 text-sm'>
										<div className='flex items-center gap-2'>
											<div
												className='w-4 h-4 rounded border'
												style={{ backgroundColor: backgroundColor }}
											/>
											<span>Background: {backgroundColor}</span>
										</div>
										<div className='flex items-center gap-2'>
											<div
												className='w-4 h-4 rounded border'
												style={{ backgroundColor: textColor }}
											/>
											<span>Text: {textColor}</span>
										</div>
										<div className='flex items-center gap-2'>
											<div
												className='w-4 h-4 rounded'
												style={{ backgroundColor: borderColor }}
											/>
											<span>Border: {borderColor}</span>
										</div>
									</div>
								</div>
							</div>
						</GlassyPaneContainer>

						{/* Counter Demo */}
						<GlassyPaneContainer className='p-6'>
							<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
								<Hash className='w-5 h-5' />
								Counter Tool Demo
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
										The agent can call{' '}
										<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
											updateCounter
										</code>
										to modify numeric values.
									</p>
									<div className='space-y-2'>
										<Button
											onClick={() =>
												executeTool('updateCounter', {
													amount: 5,
													operation: 'increment',
												})
											}
											size='sm'
											className='w-full'>
											+5
										</Button>
										<Button
											onClick={() =>
												executeTool('updateCounter', {
													amount: 10,
													operation: 'decrement',
												})
											}
											size='sm'
											variant='outline'
											className='w-full'>
											-10
										</Button>
										<Button
											onClick={() =>
												executeTool('updateCounter', {
													amount: 100,
													operation: 'set',
												})
											}
											size='sm'
											variant='secondary'
											className='w-full'>
											Set to 100
										</Button>
									</div>
								</div>
								<div className='flex items-center justify-center'>
									<div className='text-center'>
										<div className='text-6xl font-bold text-blue-600 dark:text-blue-400 mb-2'>
											{counter}
										</div>
										<p className='text-sm text-gray-500'>
											Current Counter Value
										</p>
									</div>
								</div>
							</div>
						</GlassyPaneContainer>

						{/* File Operations Demo */}
						<GlassyPaneContainer className='p-6'>
							<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
								<Upload className='w-5 h-5' />
								File Operations Tool Demo
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
										The agent can call{' '}
										<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
											fileOperation
										</code>
										to manage files.
									</p>
									<div className='space-y-2'>
										<Button
											onClick={() =>
												executeTool('fileOperation', {
													fileName: `test-${Date.now()}.txt`,
													content: `Generated content at ${new Date().toLocaleString()}`,
													operation: 'upload',
												})
											}
											size='sm'
											className='w-full'>
											<Upload className='w-4 h-4 mr-2' />
											Upload Test File
										</Button>
									</div>
								</div>
								<div>
									<h4 className='font-medium mb-2 text-gray-900 dark:text-white'>
										Files ({files.length})
									</h4>
									<div className='space-y-2 max-h-32 overflow-y-auto'>
										{files.map((file) => (
											<div
												key={file.name}
												className='flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded'>
												<div>
													<p className='text-sm font-medium text-gray-900 dark:text-white'>
														{file.name}
													</p>
													<p className='text-xs text-gray-500'>
														{file.timestamp.toLocaleTimeString()}
													</p>
												</div>
												<div className='flex gap-1'>
													<Button
														onClick={() =>
															executeTool('fileOperation', {
																fileName: file.name,
																operation: 'download',
															})
														}
														size='sm'
														variant='outline'>
														<Download className='w-3 h-3' />
													</Button>
													<Button
														onClick={() =>
															executeTool('fileOperation', {
																fileName: file.name,
																operation: 'delete',
															})
														}
														size='sm'
														variant='destructive'>
														<Trash2 className='w-3 h-3' />
													</Button>
												</div>
											</div>
										))}
										{files.length === 0 && (
											<p className='text-sm text-gray-500 text-center py-4'>
												No files uploaded yet
											</p>
										)}
									</div>
								</div>
							</div>
						</GlassyPaneContainer>
					</TabsContent>

					<TabsContent value='manual-testing' className='space-y-6'>
						<GlassyPaneContainer className='p-6'>
							<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
								<Settings className='w-5 h-5' />
								Manual Tool Testing
							</h3>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div className='space-y-4'>
									<div>
										<Label htmlFor='tool-name'>Tool Name</Label>
										<Input
											id='tool-name'
											value={testToolName}
											onChange={(e) => setTestToolName(e.target.value)}
											placeholder='e.g., showNotification'
										/>
									</div>
									<div>
										<Label htmlFor='tool-args'>Arguments (JSON)</Label>
										<Textarea
											id='tool-args'
											value={testArgs}
											onChange={(e) => setTestArgs(e.target.value)}
											placeholder='{"message": "Hello!", "type": "info"}'
											className='font-mono text-sm'
											rows={6}
										/>
									</div>
									<Button onClick={handleManualExecution} className='w-full'>
										<Zap className='w-4 h-4 mr-2' />
										Execute Tool
									</Button>
								</div>
								<div>
									<h4 className='font-medium mb-2 text-gray-900 dark:text-white'>
										Quick Test Examples
									</h4>
									<div className='space-y-2'>
										{[
											{
												name: 'showNotification',
												args: '{"message": "Test notification", "type": "success"}',
												label: 'Show Success Notification',
											},
											{
												name: 'changeColor',
												args: '{"color": "#f3f4f6", "element": "background"}',
												label: 'Change Background Color',
											},
											{
												name: 'updateCounter',
												args: '{"amount": 42, "operation": "set"}',
												label: 'Set Counter to 42',
											},
											{
												name: 'updateSetting',
												args: '{"setting": "theme", "value": "dark"}',
												label: 'Set Theme to Dark',
											},
											{
												name: 'processData',
												args: '{"data": [3, 1, 4, 1, 5], "operation": "sort"}',
												label: 'Sort Number Array',
											},
										].map((example) => (
											<Button
												key={example.name + example.label}
												onClick={() => {
													setTestToolName(example.name);
													setTestArgs(example.args);
												}}
												variant='outline'
												size='sm'
												className='w-full text-left justify-start'>
												<Copy className='w-3 h-3 mr-2' />
												{example.label}
											</Button>
										))}
									</div>
								</div>
							</div>
						</GlassyPaneContainer>
					</TabsContent>

					<TabsContent value='execution-logs' className='space-y-6'>
						<GlassyPaneContainer className='p-6'>
							<div className='flex items-center justify-between mb-4'>
								<h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
									<Eye className='w-5 h-5' />
									Tool Execution Logs
								</h3>
								<Button
									onClick={() => setToolExecutions([])}
									variant='outline'
									size='sm'>
									<Trash2 className='w-4 h-4 mr-2' />
									Clear Logs
								</Button>
							</div>

							<div className='space-y-3 max-h-96 overflow-y-auto'>
								{toolExecutions.map((execution) => (
									<div
										key={execution.id}
										className={`p-4 rounded-lg border ${
											execution.success
												? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
												: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
										}`}>
										<div className='flex items-center justify-between mb-2'>
											<div className='flex items-center gap-2'>
												{execution.success ? (
													<CheckCircle className='w-4 h-4 text-green-600' />
												) : (
													<XCircle className='w-4 h-4 text-red-600' />
												)}
												<span className='font-medium text-gray-900 dark:text-white'>
													{execution.toolName}
												</span>
											</div>
											<span className='text-xs text-gray-500'>
												{execution.timestamp.toLocaleTimeString()}
											</span>
										</div>
										<div className='text-sm space-y-2'>
											<div>
												<p className='font-medium text-gray-700 dark:text-gray-300'>
													Arguments:
												</p>
												<pre className='bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto'>
													{JSON.stringify(execution.args, null, 2)}
												</pre>
											</div>
										</div>
									</div>
								))}
								{toolExecutions.length === 0 && (
									<div className='text-center py-8'>
										<p className='text-gray-500 dark:text-gray-400'>
											No tool executions yet. Execute some tools to see logs
											here.
										</p>
									</div>
								)}
							</div>
						</GlassyPaneContainer>

						{/* Quick Actions */}
						<GlassyPaneContainer className='p-6'>
							<h3 className='text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
								<RefreshCw className='w-5 h-5' />
								Quick Actions
							</h3>
							<div className='flex flex-wrap gap-2'>
								<Button onClick={resetAllState} variant='outline'>
									<RefreshCw className='w-4 h-4 mr-2' />
									Reset All Demo State
								</Button>
								<Button onClick={() => setToolExecutions([])} variant='outline'>
									<EyeOff className='w-4 h-4 mr-2' />
									Clear Execution Logs
								</Button>
								<Button onClick={clearNotifications} variant='outline'>
									<Bell className='w-4 h-4 mr-2' />
									Clear Notifications
								</Button>
							</div>
						</GlassyPaneContainer>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

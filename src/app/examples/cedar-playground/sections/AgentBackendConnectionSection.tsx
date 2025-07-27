import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { useCedarStore } from '@/store/CedarStore';
import {
	AlertCircle,
	Check,
	CheckCircle,
	ExternalLink,
	Loader2,
	Plug,
	Save,
	XCircle,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

// Define types locally to avoid import issues
type ProviderConfig =
	| { provider: 'openai'; apiKey: string }
	| { provider: 'anthropic'; apiKey: string }
	| { provider: 'mastra'; apiKey?: string; baseURL: string }
	| { provider: 'ai-sdk'; providers: Record<string, { apiKey: string }> }
	| { provider: 'custom'; config: Record<string, unknown> };

type ProviderType = 'openai' | 'anthropic' | 'mastra' | 'ai-sdk' | 'custom';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface FormState {
	openai: { apiKey: string };
	anthropic: { apiKey: string };
	mastra: { apiKey: string; baseURL: string };
	'ai-sdk': {
		openai: { apiKey: string };
		anthropic: { apiKey: string };
		google: { apiKey: string };
		mistral: { apiKey: string };
		groq: { apiKey: string };
		selectedModel: string;
	};
	custom: { config: Record<string, string> };
}

interface DebugLogEntry {
	id: string;
	timestamp: Date;
	type:
		| 'request'
		| 'response'
		| 'error'
		| 'stream-start'
		| 'stream-chunk'
		| 'stream-end';
	provider?: string;
	data: {
		params?: Record<string, unknown>;
		response?: Record<string, unknown>;
		error?: Error;
		chunk?: string;
	};
	duration?: number;
}

interface TestParams {
	prompt: string;
	temperature: number;
	maxTokens: number;
	model?: string;
	route?: string;
}

export function AgentBackendConnectionSection() {
	const store = useCedarStore();
	const { providerConfig, setProviderConfig, callLLM, connect, disconnect } =
		store;
	// Access debugger functions directly from store with proper typing
	const agentConnectionLogs = ((
		store as unknown as { agentConnectionLogs?: DebugLogEntry[] }
	).agentConnectionLogs || []) as DebugLogEntry[];
	const clearDebugLogs = ((store as unknown as { clearDebugLogs?: () => void })
		.clearDebugLogs || (() => {})) as () => void;

	const [activeTab, setActiveTab] = useState<ProviderType>('openai');
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>('disconnected');
	const [verificationError, setVerificationError] = useState<string | null>(
		null
	);
	const [saved, setSaved] = useState<Record<ProviderType, boolean>>({
		openai: false,
		anthropic: false,
		mastra: false,
		'ai-sdk': false,
		custom: false,
	});

	const [formState, setFormState] = useState<FormState>({
		openai: { apiKey: '' },
		anthropic: { apiKey: '' },
		mastra: { apiKey: '', baseURL: '' },
		'ai-sdk': {
			openai: { apiKey: '' },
			anthropic: { apiKey: '' },
			google: { apiKey: '' },
			mistral: { apiKey: '' },
			groq: { apiKey: '' },
			selectedModel: 'openai/gpt-3.5-turbo',
		},
		custom: { config: {} },
	});

	// Ref for auto-scrolling
	const logsContainerRef = useRef<HTMLDivElement>(null);

	// Check initial connection status on mount
	useEffect(() => {
		if (providerConfig) {
			// If there's already a provider configured, we should be connected
			setConnectionStatus('connected');
			// Set the active tab to the current provider
			setActiveTab(providerConfig.provider as ProviderType);
		}
	}, []);

	// Auto-scroll to bottom when new logs are added
	useEffect(() => {
		if (logsContainerRef.current) {
			logsContainerRef.current.scrollTop =
				logsContainerRef.current.scrollHeight;
		}
	}, [agentConnectionLogs.length]);

	const verifyConnection = async (config: ProviderConfig) => {
		setConnectionStatus('connecting');
		setVerificationError(null);

		try {
			// Build test params based on provider type
			const testParams: TestParams = {
				prompt: 'Hello, please respond with "Connection successful"',
				temperature: 0.1,
				maxTokens: 50,
			};

			switch (config.provider) {
				case 'openai':
					testParams.model = 'gpt-3.5-turbo';
					break;
				case 'anthropic':
					testParams.model = 'claude-3-haiku-20240307';
					break;
				case 'mastra':
					testParams.route = '/chat/completions';
					break;
				case 'ai-sdk':
					// Use the selected model from form state
					testParams.model = formState['ai-sdk'].selectedModel;
					break;
			}

			// Make the test call - use proper type assertion
			await callLLM(testParams as Parameters<typeof callLLM>[0]);

			// If successful, connect
			await connect();
			setConnectionStatus('connected');
		} catch (error) {
			setConnectionStatus('error');
			setVerificationError(
				error instanceof Error
					? error.message
					: 'Connection verification failed'
			);
			// Disconnect on error
			disconnect();
		}
	};

	const handleSave = async (provider: ProviderType) => {
		let config: ProviderConfig;

		switch (provider) {
			case 'openai':
				config = {
					provider: 'openai',
					apiKey: formState.openai.apiKey,
				};
				break;
			case 'anthropic':
				config = {
					provider: 'anthropic',
					apiKey: formState.anthropic.apiKey,
				};
				break;
			case 'mastra':
				config = {
					provider: 'mastra',
					apiKey: formState.mastra.apiKey || undefined,
					baseURL: formState.mastra.baseURL,
				};
				break;
			case 'ai-sdk':
				const providers: Record<string, { apiKey: string }> = {};
				if (formState['ai-sdk'].openai.apiKey) {
					providers.openai = { apiKey: formState['ai-sdk'].openai.apiKey };
				}
				if (formState['ai-sdk'].anthropic.apiKey) {
					providers.anthropic = {
						apiKey: formState['ai-sdk'].anthropic.apiKey,
					};
				}
				if (formState['ai-sdk'].google.apiKey) {
					providers.google = { apiKey: formState['ai-sdk'].google.apiKey };
				}
				if (formState['ai-sdk'].mistral.apiKey) {
					providers.mistral = { apiKey: formState['ai-sdk'].mistral.apiKey };
				}
				if (formState['ai-sdk'].groq.apiKey) {
					providers.groq = { apiKey: formState['ai-sdk'].groq.apiKey };
				}
				config = {
					provider: 'ai-sdk',
					providers,
				};
				break;
			case 'custom':
				config = {
					provider: 'custom',
					config: formState.custom.config,
				};
				break;
			default:
				return;
		}

		setProviderConfig(config);

		// Verify the connection
		await verifyConnection(config);

		setSaved({ ...saved, [provider]: true });

		// Reset saved status after 2 seconds
		setTimeout(() => {
			setSaved((prev) => ({ ...prev, [provider]: false }));
		}, 2000);
	};

	const updateFormField = (
		provider: ProviderType,
		field: string,
		value: string,
		subField?: string
	) => {
		setFormState((prev) => {
			if (subField && provider === 'ai-sdk') {
				// Handle nested field updates for ai-sdk provider specifically
				const currentProvider = prev[provider];
				const currentField =
					currentProvider[field as keyof typeof currentProvider];

				if (typeof currentField === 'object' && currentField !== null) {
					return {
						...prev,
						[provider]: {
							...currentProvider,
							[field]: {
								...currentField,
								[subField]: value,
							},
						},
					};
				}
			}

			// Handle simple field updates
			return {
				...prev,
				[provider]: {
					...prev[provider],
					[field]: value,
				},
			};
		});
	};

	const getConnectionStatusColor = () => {
		switch (connectionStatus) {
			case 'connected':
				return 'bg-green-500';
			case 'connecting':
				return 'bg-yellow-500 animate-pulse';
			case 'error':
				return 'bg-red-500';
			default:
				return 'bg-gray-400';
		}
	};

	const getConnectionStatusIcon = () => {
		switch (connectionStatus) {
			case 'connected':
				return <CheckCircle className='w-4 h-4' />;
			case 'connecting':
				return <Loader2 className='w-4 h-4 animate-spin' />;
			case 'error':
				return <XCircle className='w-4 h-4' />;
			default:
				return <AlertCircle className='w-4 h-4' />;
		}
	};

	const formatLogEntry = (log: DebugLogEntry) => {
		const time = new Date(log.timestamp).toLocaleTimeString();

		switch (log.type) {
			case 'request':
				return (
					<div className='p-2 bg-blue-50 rounded text-xs'>
						<div className='flex items-center gap-2 font-semibold text-blue-700'>
							<span>{time}</span>
							<span>→ Request ({log.provider})</span>
						</div>
						<pre className='mt-1 text-gray-600 overflow-x-auto'>
							{JSON.stringify(log.data.params, null, 2)}
						</pre>
					</div>
				);
			case 'response':
				return (
					<div className='p-2 bg-green-50 rounded text-xs'>
						<div className='flex items-center gap-2 font-semibold text-green-700'>
							<span>{time}</span>
							<span>
								← Response {log.duration ? `(${log.duration}ms)` : ''}
							</span>
						</div>
						<pre className='mt-1 text-gray-600 overflow-x-auto'>
							{JSON.stringify(log.data.response, null, 2)}
						</pre>
					</div>
				);
			case 'error':
				return (
					<div className='p-2 bg-red-50 rounded text-xs'>
						<div className='flex items-center gap-2 font-semibold text-red-700'>
							<span>{time}</span>
							<span>✕ Error {log.duration ? `(${log.duration}ms)` : ''}</span>
						</div>
						<div className='mt-1 space-y-1'>
							<div className='font-medium text-red-600'>
								{log.data.error?.name || 'Error'}
							</div>
							<div className='text-gray-600'>
								{log.data.error?.message || 'Unknown error'}
							</div>
							{log.data.error?.stack && (
								<details className='mt-2'>
									<summary className='cursor-pointer text-xs text-gray-500 hover:text-gray-700'>
										Stack trace
									</summary>
									<pre className='mt-1 text-xs text-gray-500 overflow-x-auto'>
										{log.data.error.stack}
									</pre>
								</details>
							)}
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	// Group logs by request ID to show request/response/error together
	const groupedLogs = React.useMemo(() => {
		const groups: Map<string, DebugLogEntry[]> = new Map();

		agentConnectionLogs.forEach((log) => {
			// Extract base request ID from log ID
			let baseId = log.id;
			if (log.id.startsWith('res_')) {
				baseId = log.id.substring(4);
			} else if (log.id.startsWith('err_')) {
				baseId = log.id.substring(4);
			}

			if (!groups.has(baseId)) {
				groups.set(baseId, []);
			}
			groups.get(baseId)!.push(log);
		});

		// Sort groups by oldest first, and within each group, sort by timestamp (request first, then response/error)
		return Array.from(groups.entries())
			.sort((a, b) => {
				const aTime = Math.min(...a[1].map((log) => log.timestamp.getTime()));
				const bTime = Math.min(...b[1].map((log) => log.timestamp.getTime()));
				return aTime - bTime;
			})
			.map(
				([groupId, logs]) =>
					[
						groupId,
						logs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
					] as [string, DebugLogEntry[]]
			);
	}, [agentConnectionLogs]);

	// Get available models for AI SDK based on configured providers
	const getAvailableAISDKModels = () => {
		const models: { value: string; label: string }[] = [];

		if (formState['ai-sdk'].openai.apiKey) {
			models.push(
				{ value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
				{ value: 'openai/gpt-4o-mini', label: 'OpenAI GPT-4o Mini' },
				{ value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' }
			);
		}

		if (formState['ai-sdk'].anthropic.apiKey) {
			models.push(
				{
					value: 'anthropic/claude-3-5-sonnet-20241022',
					label: 'Claude 3.5 Sonnet',
				},
				{ value: 'anthropic/claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
			);
		}

		if (formState['ai-sdk'].google.apiKey) {
			models.push(
				{ value: 'google/gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
				{ value: 'google/gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
			);
		}

		if (formState['ai-sdk'].mistral.apiKey) {
			models.push(
				{ value: 'mistral/mistral-large-latest', label: 'Mistral Large' },
				{ value: 'mistral/mistral-small-latest', label: 'Mistral Small' }
			);
		}

		if (formState['ai-sdk'].groq.apiKey) {
			models.push(
				{ value: 'groq/llama-3.1-70b-versatile', label: 'Groq Llama 3.1 70B' },
				{ value: 'groq/mixtral-8x7b-32768', label: 'Groq Mixtral 8x7B' }
			);
		}

		return models;
	};

	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
				Agent Backend Connection
			</h3>
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{/* Left Column - Configuration */}
				<div>
					<div className='flex items-center gap-2 mb-4'>
						<Plug className='w-5 h-5' />
						<span className='text-sm font-medium'>Connection Status</span>
						<div
							className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`}
						/>
						{getConnectionStatusIcon()}
						<span className='text-xs text-gray-500'>
							{connectionStatus === 'connecting' && 'Verifying connection...'}
							{connectionStatus === 'connected' &&
								providerConfig &&
								`Connected to ${providerConfig.provider}`}
							{connectionStatus === 'error' && 'Connection failed'}
							{connectionStatus === 'disconnected' && 'Not configured'}
						</span>
					</div>

					{verificationError && (
						<div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-md'>
							<p className='text-sm text-red-700'>{verificationError}</p>
						</div>
					)}

					<Tabs
						value={activeTab}
						onValueChange={(value) => setActiveTab(value as ProviderType)}>
						<TabsList className='grid w-full grid-cols-5'>
							<TabsTrigger value='openai'>OpenAI</TabsTrigger>
							<TabsTrigger value='anthropic'>Anthropic</TabsTrigger>
							<TabsTrigger value='mastra'>Mastra</TabsTrigger>
							<TabsTrigger value='ai-sdk'>AI SDK</TabsTrigger>
							<TabsTrigger value='custom'>Custom</TabsTrigger>
						</TabsList>

						<TabsContent value='openai' className='space-y-4'>
							<div className='flex items-center gap-2 mb-2 '>
								<h3 className='font-medium'>OpenAI Configuration</h3>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='openai-key'>API Key</Label>
								<Input
									id='openai-key'
									type='password'
									placeholder='sk-...'
									value={formState.openai.apiKey}
									onChange={(e) =>
										updateFormField('openai', 'apiKey', e.target.value)
									}
								/>
							</div>
							<Button
								onClick={() => handleSave('openai')}
								className='w-full'
								disabled={
									!formState.openai.apiKey || connectionStatus === 'connecting'
								}>
								{connectionStatus === 'connecting' ? (
									<>
										<Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
										Verifying...
									</>
								) : saved.openai ? (
									<>
										<Check className='w-4 h-4 mr-2' /> Saved!
									</>
								) : (
									<>
										<Save className='w-4 h-4 mr-2' /> Save & Verify
									</>
								)}
							</Button>
							<p className='text-xs text-gray-500'>
								Note: API keys are not saved permanently for security reasons.
							</p>
						</TabsContent>

						<TabsContent value='anthropic' className='space-y-4'>
							<div className='flex items-center gap-2 mb-2'>
								<h3 className='font-medium'>Anthropic Configuration</h3>
								<a
									href='https://github.com/CedarCopilot/cedar'
									target='_blank'
									rel='noopener noreferrer'
									className='text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1'>
									<ExternalLink className='w-3 h-3' />
									Open Source
								</a>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='anthropic-key'>API Key</Label>
								<Input
									id='anthropic-key'
									type='password'
									placeholder='sk-ant-...'
									value={formState.anthropic.apiKey}
									onChange={(e) =>
										updateFormField('anthropic', 'apiKey', e.target.value)
									}
								/>
							</div>
							<Button
								onClick={() => handleSave('anthropic')}
								className='w-full'
								disabled={
									!formState.anthropic.apiKey ||
									connectionStatus === 'connecting'
								}>
								{connectionStatus === 'connecting' ? (
									<>
										<Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
										Verifying...
									</>
								) : saved.anthropic ? (
									<>
										<Check className='w-4 h-4 mr-2' /> Saved!
									</>
								) : (
									<>
										<Save className='w-4 h-4 mr-2' /> Save & Verify
									</>
								)}
							</Button>
							<p className='text-xs text-gray-500'>
								Note: API keys are not saved permanently for security reasons.
							</p>
						</TabsContent>

						<TabsContent value='mastra' className='space-y-4'>
							<div className='flex items-center gap-2 mb-2'>
								<h3 className='font-medium'>Mastra Configuration</h3>
								<a
									href='https://github.com/CedarCopilot/cedar'
									target='_blank'
									rel='noopener noreferrer'
									className='text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1'>
									<ExternalLink className='w-3 h-3' />
									Open Source
								</a>
							</div>
							<div className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='mastra-url'>Base URL</Label>
									<Input
										id='mastra-url'
										type='url'
										placeholder='https://your-mastra-instance.com'
										value={formState.mastra.baseURL}
										onChange={(e) =>
											updateFormField('mastra', 'baseURL', e.target.value)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='mastra-key'>API Key (Optional)</Label>
									<Input
										id='mastra-key'
										type='password'
										placeholder='Optional API key for authentication'
										value={formState.mastra.apiKey}
										onChange={(e) =>
											updateFormField('mastra', 'apiKey', e.target.value)
										}
									/>
								</div>
							</div>
							<Button
								onClick={() => handleSave('mastra')}
								className='w-full'
								disabled={
									!formState.mastra.baseURL || connectionStatus === 'connecting'
								}>
								{connectionStatus === 'connecting' ? (
									<>
										<Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
										Verifying...
									</>
								) : saved.mastra ? (
									<>
										<Check className='w-4 h-4 mr-2' /> Saved!
									</>
								) : (
									<>
										<Save className='w-4 h-4 mr-2' /> Save & Verify
									</>
								)}
							</Button>
							<p className='text-xs text-gray-500'>
								Configure your Mastra instance endpoint. API key is optional for
								public instances.
							</p>
						</TabsContent>

						<TabsContent value='ai-sdk' className='space-y-4'>
							<div className='flex items-center gap-2 mb-2'>
								<h3 className='font-medium'>AI SDK Configuration</h3>
								<a
									href='https://github.com/CedarCopilot/cedar'
									target='_blank'
									rel='noopener noreferrer'
									className='text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1'>
									<ExternalLink className='w-3 h-3' />
									Open Source
								</a>
							</div>
							<div className='space-y-4'>
								<div className='space-y-2'>
									<Label htmlFor='aisdk-openai'>OpenAI API Key</Label>
									<Input
										id='aisdk-openai'
										type='password'
										placeholder='sk-...'
										value={formState['ai-sdk'].openai.apiKey}
										onChange={(e) =>
											updateFormField(
												'ai-sdk',
												'openai',
												e.target.value,
												'apiKey'
											)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='aisdk-anthropic'>Anthropic API Key</Label>
									<Input
										id='aisdk-anthropic'
										type='password'
										placeholder='sk-ant-...'
										value={formState['ai-sdk'].anthropic.apiKey}
										onChange={(e) =>
											updateFormField(
												'ai-sdk',
												'anthropic',
												e.target.value,
												'apiKey'
											)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='aisdk-google'>Google API Key</Label>
									<Input
										id='aisdk-google'
										type='password'
										placeholder='Google Generative AI API key'
										value={formState['ai-sdk'].google.apiKey}
										onChange={(e) =>
											updateFormField(
												'ai-sdk',
												'google',
												e.target.value,
												'apiKey'
											)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='aisdk-mistral'>Mistral API Key</Label>
									<Input
										id='aisdk-mistral'
										type='password'
										placeholder='Mistral API key'
										value={formState['ai-sdk'].mistral.apiKey}
										onChange={(e) =>
											updateFormField(
												'ai-sdk',
												'mistral',
												e.target.value,
												'apiKey'
											)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='aisdk-groq'>Groq API Key</Label>
									<Input
										id='aisdk-groq'
										type='password'
										placeholder='Groq API key'
										value={formState['ai-sdk'].groq.apiKey}
										onChange={(e) =>
											updateFormField(
												'ai-sdk',
												'groq',
												e.target.value,
												'apiKey'
											)
										}
									/>
								</div>

								{/* Model Selection */}
								{getAvailableAISDKModels().length > 0 && (
									<div className='space-y-2'>
										<Label htmlFor='aisdk-model'>Model for Verification</Label>
										<Select
											value={formState['ai-sdk'].selectedModel}
											onValueChange={(value) =>
												updateFormField('ai-sdk', 'selectedModel', value)
											}>
											<SelectTrigger>
												<SelectValue placeholder='Select a model to test' />
											</SelectTrigger>
											<SelectContent>
												{getAvailableAISDKModels().map((model) => (
													<SelectItem key={model.value} value={model.value}>
														{model.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
							<Button
								onClick={() => handleSave('ai-sdk')}
								className='w-full'
								disabled={
									!Object.values(formState['ai-sdk']).some((provider) =>
										typeof provider === 'object' ? provider.apiKey : false
									) || connectionStatus === 'connecting'
								}>
								{connectionStatus === 'connecting' ? (
									<>
										<Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
										Verifying...
									</>
								) : saved['ai-sdk'] ? (
									<>
										<Check className='w-4 h-4 mr-2' /> Saved!
									</>
								) : (
									<>
										<Save className='w-4 h-4 mr-2' /> Save & Verify
									</>
								)}
							</Button>
							<p className='text-xs text-gray-500'>
								Configure multiple AI providers through the Vercel AI SDK. At
								least one API key is required.
							</p>
						</TabsContent>

						<TabsContent value='custom' className='space-y-4'>
							<div className='flex items-center gap-2 mb-2'>
								<h3 className='font-medium'>Custom Provider Configuration</h3>
								<a
									href='https://github.com/CedarCopilot/cedar'
									target='_blank'
									rel='noopener noreferrer'
									className='text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1'>
									<ExternalLink className='w-3 h-3' />
									Open Source
								</a>
							</div>
							<div className='space-y-2'>
								<Label htmlFor='custom-config'>Configuration JSON</Label>
								<textarea
									id='custom-config'
									className='w-full h-32 p-3 border rounded-md text-sm font-mono'
									placeholder='{"apiKey": "your-key", "baseUrl": "https://api.example.com"}'
									value={JSON.stringify(formState.custom.config, null, 2)}
									onChange={(e) => {
										try {
											const config = JSON.parse(e.target.value);
											setFormState((prev) => ({
												...prev,
												custom: { config },
											}));
										} catch {
											// Invalid JSON, ignore
										}
									}}
								/>
							</div>
							<Button
								onClick={() => handleSave('custom')}
								className='w-full'
								disabled={
									Object.keys(formState.custom.config).length === 0 ||
									connectionStatus === 'connecting'
								}>
								{connectionStatus === 'connecting' ? (
									<>
										<Loader2 className='w-4 h-4 mr-2 animate-spin' />{' '}
										Verifying...
									</>
								) : saved.custom ? (
									<>
										<Check className='w-4 h-4 mr-2' /> Saved!
									</>
								) : (
									<>
										<Save className='w-4 h-4 mr-2' /> Save & Verify
									</>
								)}
							</Button>
							<p className='text-xs text-gray-500'>
								Configure a custom provider with JSON configuration. Uses
								OpenAI-compatible format by default.
							</p>
						</TabsContent>
					</Tabs>
				</div>

				{/* Right Column - Debug Logs */}
				<div className='border-l pl-6 flex flex-col h-full'>
					<div className='flex items-center justify-between mb-4'>
						<h3 className='font-medium'>Request/Response Logs</h3>
						<Button
							variant='outline'
							size='sm'
							onClick={clearDebugLogs}
							disabled={agentConnectionLogs.length === 0}>
							Clear Logs
						</Button>
					</div>

					<div
						ref={logsContainerRef}
						className='flex-1 overflow-y-auto max-h-[600px] space-y-3 pr-2'>
						{groupedLogs.length === 0 ? (
							<p className='text-sm text-gray-500 text-center py-8'>
								No requests yet. Configure and verify a connection to see logs.
							</p>
						) : (
							groupedLogs.map(([groupId, logs]) => (
								<div
									key={groupId}
									className='border border-gray-200 rounded-lg p-3 space-y-2 bg-white shadow-sm'>
									{logs.map((log) => (
										<div key={log.id}>{formatLogEntry(log)}</div>
									))}
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</GlassyPaneContainer>
	);
}

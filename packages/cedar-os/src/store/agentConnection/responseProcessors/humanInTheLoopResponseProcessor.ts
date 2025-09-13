import {
	InferProviderConfig,
	ResponseProcessor,
} from '@/store/agentConnection/AgentConnectionTypes';
import {
	HumanInTheLoopResponse,
	HumanInTheLoopState,
} from './humanInTheLoopTypes';

/**
 * Response processor for human-in-the-loop workflows
 * Handles suspend responses from Mastra backend and creates interactive UI
 */
export const humanInTheLoopResponseProcessor: ResponseProcessor<HumanInTheLoopResponse> =
	{
		type: 'humanInTheLoop',
		namespace: 'default',
		execute: async (obj, store) => {
			const { runId, stepPath, suspendPayload, message, timeoutMs } = obj;

			// Use single state key for all human-in-the-loop data
			const stateKey = 'humanInTheLoop';

			// Get current state or initialize
			const currentState =
				(store.getCedarState(stateKey) as HumanInTheLoopState) || {};

			// Store suspend data for this runId
			const suspendInfo = {
				runId,
				stepPath,
				suspendPayload,
				suspendedAt: new Date().toISOString(),
				state: 'suspended' as const,
				threadId: store.mainThreadId,
				messageId: '', // Will be set after message creation
			};

			// Update the state with new suspend info
			const newState = {
				...currentState,
				[runId]: suspendInfo,
			};

			// Register state if not exists, or update existing
			const existingState = store.getCedarState(stateKey);
			if (!existingState) {
				store.registerState({
					key: stateKey,
					value: newState as HumanInTheLoopState,
					description: 'Human-in-the-loop workflow suspend/resume data',
					stateSetters: {
						resume: {
							name: 'resume',
							description: 'Resume a suspended workflow',
							execute: async (
								current: HumanInTheLoopState,
								...args: unknown[]
							) => {
								const [runId, resumeData] = args as [
									string,
									Record<string, unknown>
								];
								const workflow = current[runId];
								if (!workflow) return current;

								// Update state
								const updatedState = {
									...current,
									[runId]: {
										...workflow,
										state: 'resumed' as const,
										resumeData,
										resumedAt: new Date().toISOString(),
									},
								};

								// Add a new message to show resumed state instead of updating existing
								if (workflow.messageId) {
									const originalMessage = store.getMessageById(
										workflow.messageId
									);
									if (originalMessage) {
										const resumedMessage = {
											...originalMessage,
											id: undefined, // Let addMessage generate new ID
											state: 'resumed' as const,
											resumeData,
											resumedAt: new Date().toISOString(),
											content: `Successfully resumed workflow.`,
										};
										store.addMessage(resumedMessage);
									}
								}

								// Get resumePath from provider config
								const config = store.providerConfig;
								const resumePath =
									config?.provider === 'mastra'
										? (config as InferProviderConfig<'mastra'>).resumePath ||
										  '/chat/resume'
										: '/chat/resume';

								// Send resume request
								await store.sendMessage<
									Record<string, never>,
									{
										runId: string;
										stepPath: [string[], ...string[][]];
										resumeData: Record<string, unknown>;
									}
								>({
									stream: true,
									route: resumePath,
									runId,
									stepPath: workflow.stepPath,
									resumeData,
								});

								return updatedState;
							},
						},
						cancel: {
							name: 'cancel',
							description: 'Cancel a suspended workflow',
							execute: async (
								current: HumanInTheLoopState,
								...args: unknown[]
							) => {
								const [runId] = args as [string];
								const workflow = current[runId];
								if (!workflow) return current;

								const updatedState = {
									...current,
									[runId]: {
										...workflow,
										state: 'cancelled' as const,
										cancelledAt: new Date().toISOString(),
									},
								};

								// Add a new message to show cancelled state instead of updating existing
								if (workflow.messageId) {
									const originalMessage = store.getMessageById(
										workflow.messageId
									);
									if (originalMessage) {
										const cancelledMessage = {
											...originalMessage,
											id: undefined, // Let addMessage generate new ID
											state: 'cancelled' as const,
											cancelledAt: new Date().toISOString(),
											content: `Workflow ${runId} has been cancelled.`,
										};
										store.addMessage(cancelledMessage);
									}
								}

								return updatedState;
							},
						},
					},
				});
			} else {
				store.setCedarState(stateKey, newState);
			}

			// Create typed resume callback
			const resumeCallback = async (resumeData: Record<string, unknown>) => {
				await store.executeCustomSetter({
					key: stateKey,
					setterKey: 'resume',
					args: [runId, resumeData],
				});
			};

			// Create typed cancel callback
			const cancelCallback = async () => {
				await store.executeCustomSetter({
					key: stateKey,
					setterKey: 'cancel',
					args: [runId],
				});
			};

			// Add message to chat with callbacks
			const chatMessage = {
				type: 'humanInTheLoop',
				role: 'assistant',
				content: message || `Workflow ${runId} is waiting for your input...`,
				state: 'suspended',
				runId,
				stepPath,
				suspendPayload,
				resumeCallback,
				cancelCallback,
				metadata: obj.metadata,
			};

			const addedMessage = store.addMessage(chatMessage);

			// Update state with messageId
			const finalState = {
				...newState,
				[runId]: {
					...suspendInfo,
					messageId: addedMessage.id,
				},
			};
			store.setCedarState(stateKey, finalState);

			// Set up timeout if specified
			if (timeoutMs && timeoutMs > 0) {
				setTimeout(() => {
					const currentWorkflowState = store.getCedarState(
						stateKey
					) as HumanInTheLoopState;
					const workflow = currentWorkflowState?.[runId];
					if (workflow?.state === 'suspended') {
						// Add a new timeout message instead of updating existing
						const originalMessage = store.getMessageById(addedMessage.id);
						if (originalMessage) {
							const timeoutMessage = {
								...originalMessage,
								id: undefined, // Let addMessage generate new ID
								state: 'timeout' as const,
								content: `Workflow has timed out and been cancelled.`,
							};
							store.addMessage(timeoutMessage);
						}
						cancelCallback();
					}
				}, timeoutMs);
			}
		},
		validate: (obj): obj is HumanInTheLoopResponse =>
			obj.type === 'humanInTheLoop' &&
			'runId' in obj &&
			'stepPath' in obj &&
			'status' in obj &&
			obj.status === 'suspended',
	};

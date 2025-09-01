import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import {
	getFeaturesTool,
	getFeatureDetailsTool,
	addFeatureTool,
	updateFeatureTool,
	voteFeatureTool,
	addCommentTool,
	getFeatureTreeTool,
} from '../tools/roadmap-tool';
import { mastra } from '../index';

// Dynamic action execution step
const executeActionStep = createStep({
	id: 'execute-action',
	description: 'Executes the requested product roadmap action',
	inputSchema: z.object({
		action: z.enum([
			'get-features',
			'get-feature-details',
			'add-feature',
			'update-feature',
			'vote-feature',
			'add-comment',
			'get-feature-tree',
			'analyze-roadmap',
		]),
		params: z.record(z.any()),
	}),
	outputSchema: z.object({ result: z.any() }),
	execute: async ({ inputData, runtimeContext }) => {
		if (!inputData) {
			throw new Error('Input data is required');
		}
		const { action, params } = inputData;
		let result: unknown;

		switch (action) {
			case 'get-features': {
				// Typed input for get-features
				const { status, priority } = params as {
					status?: 'planned' | 'in-progress' | 'completed' | 'cancelled';
					priority?: 'low' | 'medium' | 'high' | 'critical';
				};
				result = (
					await getFeaturesTool.execute({
						context: { status, priority },
						runtimeContext,
					})
				).features;
				break;
			}

			case 'get-feature-details': {
				// Typed input for get-feature-details
				const { featureId } = params as { featureId: string };
				result = (
					await getFeatureDetailsTool.execute({
						context: { featureId },
						runtimeContext,
					})
				).feature;
				break;
			}

			case 'add-feature': {
				// Typed input for add-feature
				const {
					title,
					description,
					status: st,
					priority: pr,
					parentId,
				} = params as {
					title: string;
					description: string;
					status?: 'planned' | 'in-progress' | 'completed' | 'cancelled';
					priority?: 'low' | 'medium' | 'high' | 'critical';
					parentId?: string;
				};
				// Use defaults if undefined
				const statusValue = (st ?? 'planned') as
					| 'planned'
					| 'in-progress'
					| 'completed'
					| 'cancelled';
				const priorityValue = (pr ?? 'medium') as
					| 'low'
					| 'medium'
					| 'high'
					| 'critical';
				result = await addFeatureTool.execute({
					context: {
						title,
						description,
						status: statusValue,
						priority: priorityValue,
						parentId,
					},
					runtimeContext,
				});
				break;
			}

			case 'update-feature': {
				// Typed input for update-feature
				const {
					featureId: uId,
					title: uTitle,
					description: uDesc,
					status: uStatus,
					priority: uPriority,
				} = params as {
					featureId: string;
					title?: string;
					description?: string;
					status?: 'planned' | 'in-progress' | 'completed' | 'cancelled';
					priority?: 'low' | 'medium' | 'high' | 'critical';
				};
				result = await updateFeatureTool.execute({
					context: {
						featureId: uId,
						title: uTitle,
						description: uDesc,
						status: uStatus,
						priority: uPriority,
					},
					runtimeContext,
				});
				break;
			}

			case 'vote-feature': {
				// Typed input for vote-feature
				const { featureId: vId } = params as { featureId: string };
				result = await voteFeatureTool.execute({
					context: { featureId: vId },
					runtimeContext,
				});
				break;
			}

			case 'add-comment': {
				// Typed input for add-comment
				const {
					featureId: cId,
					content,
					author,
				} = params as { featureId: string; content: string; author: string };
				result = await addCommentTool.execute({
					context: { featureId: cId, content, author },
					runtimeContext,
				});
				break;
			}

			case 'get-feature-tree': {
				// No params for get-feature-tree
				result = await getFeatureTreeTool.execute({
					context: {},
					runtimeContext,
				});
				break;
			}

			case 'analyze-roadmap': {
				// Gather feature data
				const allRes = await getFeaturesTool.execute({
					context: {},
					runtimeContext,
				});
				const allFeatures = allRes.features;
				const completedRes = await getFeaturesTool.execute({
					context: { status: 'completed' },
					runtimeContext,
				});
				const completedFeatures = completedRes.features;
				const highRes = await getFeaturesTool.execute({
					context: { priority: 'high' },
					runtimeContext,
				});
				const highPriorityFeatures = highRes.features;
				const criticalRes = await getFeaturesTool.execute({
					context: { priority: 'critical' },
					runtimeContext,
				});
				const criticalPriorityFeatures = criticalRes.features;
				const completionPercentage =
					allFeatures.length > 0
						? (completedFeatures.length / allFeatures.length) * 100
						: 0;
				const topPriorityFeatures = [
					...highPriorityFeatures,
					...criticalPriorityFeatures,
				]
					.filter((f) => f.status !== 'completed' && f.status !== 'cancelled')
					.sort((a, b) => b.votes - a.votes)
					.slice(0, 5);

				// Generate insights using the agent
				const agent = mastra.getAgent('productRoadmapAgent');
				if (!agent) {
					throw new Error('Product Roadmap Agent not found');
				}
				const prompt = `Based on the following roadmap data, provide insights about the current state of the project:
Total features: ${allFeatures.length}
Completed features: ${completedFeatures.length}
Completion percentage: ${completionPercentage.toFixed(2)}%
High priority features: ${highPriorityFeatures.length}
Critical priority features: ${criticalPriorityFeatures.length}

Top voted features that are not completed:
${topPriorityFeatures
	.map(
		(f) =>
			`- ${f.title} (${f.votes} votes, ${f.priority} priority, ${f.status})`
	)
	.join('\n')}

Please provide a concise analysis of the roadmap, focusing on:
1. Overall project progress
2. Key areas that need attention
3. Recommendations for next steps

Keep your response under 300 words.`;
				const response = await agent.generate([
					{ role: 'user', content: prompt },
				]);
				result = {
					insights: response.text,
					completionPercentage,
					topPriorityFeatures,
				};
				break;
			}

			default:
				throw new Error(`Unknown action: ${action}`);
		}

		return { result };
	},
});

const productRoadmapWorkflow = createWorkflow({
	id: 'product-roadmap-workflow',
	inputSchema: z.object({
		action: z.enum([
			'get-features',
			'get-feature-details',
			'add-feature',
			'update-feature',
			'vote-feature',
			'add-comment',
			'get-feature-tree',
			'analyze-roadmap',
		]),
		params: z.record(z.any()),
	}),
	outputSchema: z.object({ result: z.any() }),
}).then(executeActionStep);

productRoadmapWorkflow.commit();

export { productRoadmapWorkflow };

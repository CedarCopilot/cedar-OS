'use client';

import GlassyPaneContainer from '@/containers/GlassyPaneContainer';
import { useCedarState, useSubscribeStateToAgentContext } from 'cedar-os';
import { SlidersHorizontal, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const parametersSchema = z
	.array(
		z.object({
			name: z.string().describe('Name of the parameter'),
			value: z
				.union([z.string(), z.number(), z.boolean(), z.date()])
				.describe('Value of the parameter'),
		})
	)
	.describe(
		'Parameters displayed on the dashboard that the agent can set values for'
	);

export type Parameters = z.infer<typeof parametersSchema>;

export function SubscribedStatesSection() {
	const [parameters, setParameters] = useCedarState<Parameters>({
		key: 'parameters',
		initialValue: [
			{ value: 0, name: 'temperature' },
			{ value: 0.9, name: 'opacity' },
		] as Parameters,
		description:
			'A tool to set values for a specific parameter on the dashboard',
		stateSetters: {}, // No custom setters for this example
		schema: parametersSchema,
	});
	const [newParamName, setNewParamName] = useState('');
	const [newParamValue, setNewParamValue] = useState('');

	// Subscribe state to input context
	useSubscribeStateToAgentContext(
		'parameters',
		(parametersState: Parameters) => ({
			parameters: parametersState,
		}),
		{
			icon: <SlidersHorizontal />,
			color: '#2ECC40',
			labelField: (parameters) => `${parameters.name}: ${parameters.value}`,
			order: 1,
		}
	);

	const addParameter = () => {
		if (newParamName.trim() && newParamValue.trim()) {
			const newParam = {
				name: newParamName.trim(),
				value: isNaN(Number(newParamValue))
					? newParamValue
					: Number(newParamValue),
			};
			setParameters([...parameters, newParam]);
			setNewParamName('');
			setNewParamValue('');
		}
	};

	const removeParameter = (index: number) => {
		const updatedParams = parameters.filter((_, i) => i !== index);
		setParameters(updatedParams);
	};

	const updateParameter = (
		index: number,
		field: 'name' | 'value',
		newValue: string
	) => {
		const updatedParams = [...parameters];
		if (field === 'value') {
			updatedParams[index] = {
				...updatedParams[index],
				[field]: isNaN(Number(newValue)) ? newValue : Number(newValue),
			};
		} else {
			updatedParams[index] = {
				...updatedParams[index],
				[field]: newValue,
			};
		}
		setParameters(updatedParams);
	};

	return (
		<div className='py-16 px-8'>
			<div className='max-w-6xl mx-auto'>
				<div className='text-center mb-12'>
					<h2 className='text-3xl font-bold mb-6 text-gray-900 dark:text-white'>
						Subscribed States Testing
					</h2>
					<p className='text-lg mb-6 leading-relaxed text-gray-600 dark:text-gray-300'>
						Test how Cedar-OS subscribes state to agent input context.
						Parameters added here will be available to the agent as context.
					</p>
				</div>

				<GlassyPaneContainer className='p-6'>
					<div className='space-y-6'>
						<div className='flex items-center gap-2 mb-4'>
							<SlidersHorizontal className='w-5 h-5 text-green-500' />
							<h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
								Parameters Dashboard
							</h3>
						</div>

						{/* Add new parameter form */}
						<div className='flex gap-3 items-end'>
							<div className='flex-1'>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
									Parameter Name
								</label>
								<Input
									type='text'
									placeholder='e.g., temperature'
									value={newParamName}
									onChange={(e) => setNewParamName(e.target.value)}
								/>
							</div>
							<div className='flex-1'>
								<label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
									Parameter Value
								</label>
								<Input
									type='text'
									placeholder='e.g., 0.7 or "high"'
									value={newParamValue}
									onChange={(e) => setNewParamValue(e.target.value)}
								/>
							</div>
							<Button
								onClick={addParameter}
								disabled={!newParamName.trim() || !newParamValue.trim()}
								className='flex items-center gap-2'>
								<Plus className='w-4 h-4' />
								Add
							</Button>
						</div>

						{/* Parameters list */}
						<div className='space-y-3'>
							{parameters.length === 0 ? (
								<p className='text-sm text-gray-500 dark:text-gray-400 text-center py-8'>
									No parameters added yet. Add some parameters above to see them
									appear in the agent&apos;s context.
								</p>
							) : (
								parameters.map((param, index) => (
									<div
										key={index}
										className='flex gap-3 items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'>
										<div className='flex-1'>
											<Input
												type='text'
												value={param.name}
												onChange={(e) =>
													updateParameter(index, 'name', e.target.value)
												}
												className='bg-white dark:bg-gray-700'
											/>
										</div>
										<div className='flex-1'>
											<Input
												type='text'
												value={String(param.value)}
												onChange={(e) =>
													updateParameter(index, 'value', e.target.value)
												}
												className='bg-white dark:bg-gray-700'
											/>
										</div>
										<Button
											onClick={() => removeParameter(index)}
											variant='destructive'
											size='sm'
											className='flex items-center gap-1'>
											<Trash2 className='w-4 h-4' />
										</Button>
									</div>
								))
							)}
						</div>

						{/* Debug information */}
						<div className='mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg'>
							<h4 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2'>
								Debug Info:
							</h4>
							<pre className='text-xs text-gray-600 dark:text-gray-400 overflow-auto'>
								{JSON.stringify(parameters, null, 2)}
							</pre>
						</div>

						<div className='text-sm text-gray-500 dark:text-gray-400'>
							<p className='mb-2'>
								<strong>How it works:</strong>
							</p>
							<ul className='list-disc list-inside space-y-1'>
								<li>
									Parameters are registered using{' '}
									<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
										useCedarState
									</code>
								</li>
								<li>
									State is subscribed to input context using{' '}
									<code className='bg-gray-200 dark:bg-gray-700 px-1 rounded'>
										useSubscribeStateToAgentContext
									</code>
								</li>
								<li>
									The agent can see these parameters as context when you chat
								</li>
								<li>
									Check the browser console to see debug logs from the
									labelField function
								</li>
							</ul>
						</div>
					</div>
				</GlassyPaneContainer>
			</div>
		</div>
	);
}

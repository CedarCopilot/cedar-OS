'use client';

import React, { useState, useCallback } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { SurveyQuestion } from '@/store/actionsSlice';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/ui/dialog';
import { getSupabaseClient } from '@/utils/supabase';
import { useConfig, useStyling, useActions } from '@/store/CedarStore';
import { v4 as uuidv4 } from 'uuid';

interface SurveyDialogProps {
	title?: string;
	description?: string;
	questions: SurveyQuestion[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	submitButtonText?: string;
	cancelButtonText?: string;
	onSubmit?: (responses: Record<string, string | number | boolean>) => void;
	blocking?: boolean;
	trigger_id?: string;
	viewOnly?: boolean;
	initialResponses?: Record<string, string | number | boolean>;
}

const SurveyDialog: React.FC<SurveyDialogProps> = ({
	title = 'Share Your Feedback',
	description = 'We would love to hear your thoughts to improve our service.',
	questions,
	open,
	onOpenChange,
	submitButtonText = 'Submit',
	cancelButtonText = 'Cancel',
	onSubmit,
	blocking = false,
	trigger_id,
	viewOnly = false,
	initialResponses = {},
}) => {
	const { currentAction, setCurrentAction } = useActions();
	const [responses, setResponses] = useState<
		Record<string, string | number | boolean>
	>(() => {
		// Initialize with initialResponses
		const initial = { ...initialResponses };

		// Add any slider default values that aren't already set
		questions.forEach((question) => {
			if (
				question.type === 'slider' &&
				'defaultValue' in question &&
				question.defaultValue !== undefined &&
				initial[question.id] === undefined
			) {
				initial[question.id] = question.defaultValue;
			}
		});

		return initial;
	});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [isSaving, setIsSaving] = useState(false);
	const [hoverValue, setHoverValue] = useState<Record<string, number | null>>(
		{}
	);
	const { productId, validateOrCreateProductUser, userId } = useConfig();
	const { styling } = useStyling();

	const updateQuestionValue = useCallback(
		(id: string, value: string | number | boolean) => {
			if (currentAction?.type === 'SURVEY') {
				const updatedQuestions = currentAction.questions.map((q) =>
					q.id === id ? { ...q, value } : q
				);
				setCurrentAction({
					...currentAction,
					questions: updatedQuestions,
				});
			}
		},
		[currentAction, setCurrentAction]
	);

	const handleTextChange = (id: string, value: string) => {
		setResponses((prev) => ({ ...prev, [id]: value }));
		updateQuestionValue(id, value);
		if (errors[id]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[id];
				return newErrors;
			});
		}
	};

	const handleNumberChange = (id: string, value: string) => {
		const numValue = value === '' ? '' : Number(value);
		setResponses((prev) => ({ ...prev, [id]: numValue }));
		updateQuestionValue(id, numValue);
		if (errors[id]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[id];
				return newErrors;
			});
		}
	};

	const handleSliderChange = (id: string, value: number) => {
		setResponses((prev) => ({ ...prev, [id]: value }));
		updateQuestionValue(id, value);
		if (errors[id]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[id];
				return newErrors;
			});
		}
	};

	const handleNpsChange = (id: string, value: number) => {
		setResponses((prev) => ({ ...prev, [id]: value }));
		updateQuestionValue(id, value);
		if (errors[id]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[id];
				return newErrors;
			});
		}
	};

	const handleThumbsChange = (id: string, value: boolean) => {
		setResponses((prev) => ({ ...prev, [id]: value }));
		updateQuestionValue(id, value);
	};

	const handleNpsHover = (id: string, value: number | null) => {
		setHoverValue((prev) => ({ ...prev, [id]: value }));
	};

	const validateResponses = () => {
		const newErrors: Record<string, string> = {};
		let isValid = true;

		questions.forEach((question) => {
			// Handle required fields
			if (
				question.required &&
				(responses[question.id] === undefined || responses[question.id] === '')
			) {
				newErrors[question.id] = 'This field is required';
				isValid = false;
			}

			// Special case for NPS - must explicitly select a value if required
			if (
				question.type === 'nps' &&
				question.required &&
				responses[question.id] === undefined
			) {
				newErrors[question.id] = 'Please select a rating';
				isValid = false;
			}

			if (
				(question.type === 'number' ||
					question.type === 'slider' ||
					question.type === 'nps') &&
				responses[question.id] !== undefined &&
				responses[question.id] !== '' &&
				typeof responses[question.id] === 'number' &&
				'min' in question &&
				'max' in question
			) {
				const value = responses[question.id] as number;
				if (question.min !== undefined && value < question.min) {
					newErrors[question.id] = `Value must be at least ${question.min}`;
					isValid = false;
				}
				if (question.max !== undefined && value > question.max) {
					newErrors[question.id] = `Value must be at most ${question.max}`;
					isValid = false;
				}
			}
		});

		setErrors(newErrors);
		return isValid;
	};

	const saveFeedbackToSupabase = async () => {
		try {
			setIsSaving(true);
			const supabase = getSupabaseClient();

			const { success, error } = await validateOrCreateProductUser();

			if (!success) {
				console.error('Error validating product user:', error);
				return false;
			}

			// Create a new feedback entry
			const feedbackId = uuidv4();

			const { error: feedbackError } = await supabase.from('feedback').insert({
				id: feedbackId,
				product_id: productId || null,
				product_user_id: userId || null,
				trigger_id: trigger_id || null,
				link: null,
			});

			if (feedbackError) {
				console.error('Error saving feedback:', feedbackError);
				return false;
			}

			// Create response entries for each question
			const responseEntries = questions.map((question) => {
				const answer = responses[question.id];
				return {
					id: uuidv4(),
					feedback_id: feedbackId,
					question: question.question,
					answer: answer !== undefined ? String(answer) : null,
					type: question.type,
					product_id: productId || undefined,
				};
			});

			const { error: responsesError } = await supabase
				.from('feedback_responses')
				.insert(responseEntries);

			if (responsesError) {
				console.error('Error saving responses:', responsesError);
				return false;
			}

			return true;
		} catch (error) {
			console.error('Unexpected error saving feedback:', error);
			return false;
		} finally {
			setIsSaving(false);
		}
	};

	const handleSubmit = async () => {
		if (validateResponses()) {
			// Save to Supabase
			const saveSuccessful = await saveFeedbackToSupabase();
			// Only close if not blocking and save was successful
			if (saveSuccessful) {
				onSubmit?.(responses);
				onOpenChange(false);
			}
		}
	};

	const handleCancel = () => {
		if (!blocking) {
			onOpenChange(false);
		}
	};

	const renderQuestion = (question: SurveyQuestion) => {
		switch (question.type) {
			case 'shortText':
				return (
					<div key={question.id} className='mb-4'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>
						<input
							type='text'
							className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder={question.placeholder}
							value={(responses[question.id] as string) || ''}
							onChange={(e) => handleTextChange(question.id, e.target.value)}
							disabled={viewOnly}
						/>
						{errors[question.id] && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			case 'longText':
				return (
					<div key={question.id} className='mb-4'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>
						<textarea
							className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]'
							placeholder={question.placeholder}
							value={(responses[question.id] as string) || ''}
							onChange={(e) => handleTextChange(question.id, e.target.value)}
							disabled={viewOnly}
						/>
						{errors[question.id] && !viewOnly && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			case 'number':
				return (
					<div key={question.id} className='mb-4'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>
						<input
							type='number'
							className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder={question.placeholder}
							min={'min' in question ? question.min : undefined}
							max={'max' in question ? question.max : undefined}
							value={
								responses[question.id] === undefined ||
								responses[question.id] === ''
									? ''
									: String(responses[question.id])
							}
							onChange={(e) => handleNumberChange(question.id, e.target.value)}
							disabled={viewOnly}
						/>
						{errors[question.id] && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			case 'slider':
				// We know this is a slider question
				const sliderQuestion = question;
				const min = sliderQuestion.min || 0;
				const max = sliderQuestion.max || 100;
				const step = sliderQuestion.step || 1;
				const sliderValue = (responses[question.id] as number) || min;
				const hasLabels =
					'labels' in sliderQuestion &&
					Array.isArray(sliderQuestion.labels) &&
					sliderQuestion.labels.length > 0;

				return (
					<div key={question.id} className='mb-6'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>

						{/* Display current value */}
						<div className='flex justify-between items-center mb-2'>
							<span className='text-sm text-gray-500'>{min}</span>
							<span className='text-sm font-medium'>{sliderValue}</span>
							<span className='text-sm text-gray-500'>{max}</span>
						</div>

						{/* Slider control */}
						<input
							type='range'
							className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
							min={min}
							max={max}
							step={step}
							value={sliderValue}
							onChange={(e) =>
								handleSliderChange(question.id, Number(e.target.value))
							}
							disabled={viewOnly}
						/>

						{/* Optional labels */}
						{hasLabels && (
							<div className='flex justify-between mt-1'>
								{sliderQuestion.labels?.map((label, index) => (
									<span
										key={`${question.id}-label-${index}`}
										className='text-xs text-gray-500'>
										{label}
									</span>
								))}
							</div>
						)}

						{errors[question.id] && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			case 'nps':
				const npsValue = responses[question.id] as number;
				const currentHoverValue = hoverValue[question.id] || null;
				const primaryColor = styling?.color || '#3B82F6'; // Default blue if no color is set

				// Create muted versions of the primary color for different states
				const mutedColor = `${primaryColor}20`; // 20% opacity version for hover
				const selectedColor = `${primaryColor}40`; // 40% opacity version for selected

				return (
					<div key={question.id} className='mb-4'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>

						{/* NPS blocks */}
						<div>
							<div className='flex flex-col space-y-2'>
								<div className='flex w-full border border-gray-200 rounded-md overflow-hidden'>
									{Array.from({ length: 11 }, (_, i) => (
										<button
											key={i}
											type='button'
											className={`
												relative flex-1 py-2 font-medium text-sm border-r last:border-r-0 border-gray-200 transition-colors focus:outline-none
												${npsValue !== undefined && i <= npsValue ? selectedColor : 'bg-white'}
												${npsValue !== undefined && i <= npsValue ? 'text-gray-800' : 'text-gray-600'}
												${i <= (currentHoverValue !== null ? currentHoverValue : -1) && (npsValue === undefined || i > npsValue) ? mutedColor : ''}
											`}
											style={{
												...(npsValue !== undefined && i <= npsValue
													? { backgroundColor: selectedColor }
													: {}),
												...(i <=
													(currentHoverValue !== null
														? currentHoverValue
														: -1) &&
												(npsValue === undefined || i > npsValue)
													? { backgroundColor: mutedColor }
													: {}),
											}}
											onClick={() => handleNpsChange(question.id, i)}
											onMouseEnter={() => handleNpsHover(question.id, i)}
											onMouseLeave={() => handleNpsHover(question.id, null)}
											aria-label={`Rate ${i} out of 10`}
											tabIndex={0}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													handleNpsChange(question.id, i);
													e.preventDefault();
												}
											}}>
											{i}
										</button>
									))}
								</div>
								{/* Labels */}
								<div className='flex justify-between text-gray-500 text-sm'>
									<span>Not at all likely</span>
									<span>Extremely likely</span>
								</div>
							</div>
						</div>

						{errors[question.id] && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			case 'thumbs':
				return (
					<div key={question.id} className='mb-4'>
						<label className='block text-sm font-medium mb-1'>
							{question.question}{' '}
							{question.required && <span className='text-red-500'>*</span>}
						</label>
						<div className='flex space-x-4 mt-2'>
							<button
								type='button'
								className={`flex items-center space-x-2 px-4 py-2 border rounded-md ${
									responses[question.id] === true
										? 'bg-green-100 border-green-500'
										: 'bg-white'
								}`}
								onClick={() => handleThumbsChange(question.id, true)}>
								<ThumbsUp className='h-5 w-5 text-green-600' />
								<span>Yes</span>
							</button>
							<button
								type='button'
								className={`flex items-center space-x-2 px-4 py-2 border rounded-md ${
									responses[question.id] === false
										? 'bg-red-100 border-red-500'
										: 'bg-white'
								}`}
								onClick={() => handleThumbsChange(question.id, false)}>
								<ThumbsDown className='h-5 w-5 text-red-600' />
								<span>No</span>
							</button>
						</div>
						{errors[question.id] && (
							<p className='mt-1 text-sm text-red-500'>{errors[question.id]}</p>
						)}
					</div>
				);

			default:
				return null;
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				closeable={!blocking}
				onClose={!blocking ? handleCancel : undefined}>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className='pt-4'>{questions.map(renderQuestion)}</div>

				<DialogFooter>
					{!blocking && (
						<button
							className='px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50'
							onClick={handleCancel}>
							{cancelButtonText}
						</button>
					)}
					{!viewOnly && (
						<button
							className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ml-2'
							onClick={handleSubmit}
							disabled={isSaving}>
							{isSaving ? 'Saving...' : submitButtonText}
						</button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default SurveyDialog;

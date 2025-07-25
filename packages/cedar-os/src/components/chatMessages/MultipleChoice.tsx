import React, { useState } from 'react';
import { MultipleChoiceMessage } from '@/store/messages/types';
import Flat3dButton from '@/components/containers/Flat3dButton';
import { useCedarStore } from '@/store/CedarStore';
import { cn } from '@/styles/stylingUtils';

interface MultipleChoiceProps {
	message: MultipleChoiceMessage;
}

const MultipleChoice: React.FC<MultipleChoiceProps> = ({ message }) => {
	const { content, choices, multiselect, onChoice } = message;
	const [selected, setSelected] = useState<string[]>([]);
	const store = useCedarStore((state) => state);

	const handleClick = (choice: string) => {
		if (multiselect) {
			setSelected((prev) =>
				prev.includes(choice)
					? prev.filter((c) => c !== choice)
					: [...prev, choice]
			);
		} else {
			setSelected([choice]);
		}
		if (onChoice) onChoice(choice, store);
	};

	if (!choices || choices.length === 0) return null;

	return (
		<>
			{content && <p className='mb-2 text-sm'>{content}</p>}
			<div className='flex flex-col space-y-2'>
				{choices.map((choice) => {
					const isSelected = selected.includes(choice);
					return (
						<Flat3dButton
							key={choice}
							onClick={() => handleClick(choice)}
							className={cn(
								'rounded-md px-3 py-2',
								isSelected
									? 'bg-green-100 border border-green-200 text-gray-800'
									: 'bg-white border border-gray-200 text-gray-800'
							)}>
							{choice}
						</Flat3dButton>
					);
				})}
			</div>
		</>
	);
};

export default MultipleChoice;

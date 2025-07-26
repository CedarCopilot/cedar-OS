import React, { useState } from 'react';
import {
	DialogueOptionsMessage,
	DialogueOptionChoice,
} from '@/store/messages/types';
import Flat3dButton from '@/components/containers/Flat3dButton';
import { useCedarStore } from '@/store/CedarStore';
import { cn } from '@/styles/stylingUtils';

interface DialogueOptionsProps {
	message: DialogueOptionsMessage;
}

const DialogueOptions: React.FC<DialogueOptionsProps> = ({ message }) => {
	const { content, options, onChoice } = message;
	const [selected, setSelected] = useState<string | null>(null);
	const store = useCedarStore((state) => state);

	if (!options || options.length === 0) return null;

	return (
		<>
			{content && <p className='mb-2 text-sm'>{content}</p>}
			<div className='flex flex-col space-y-2'>
				{options.map((opt: DialogueOptionChoice) => {
					const isSelected = selected === opt.title;
					return (
						<Flat3dButton
							key={opt.title}
							onClick={() => {
								setSelected(opt.title);
								if (onChoice) onChoice(opt, store);
							}}
							className={cn(
								'rounded-md px-3 py-2 flex items-start',
								isSelected
									? 'bg-green-100 border border-green-200'
									: 'bg-white border border-gray-200'
							)}>
							{opt.icon &&
								(typeof opt.icon === 'string' ? (
									<img
										src={opt.icon}
										alt={opt.title}
										width={24}
										height={24}
										className='w-6 h-6 mr-2 flex-shrink-0'
									/>
								) : (
									<span className='w-6 h-6 mr-2 flex-shrink-0'>{opt.icon}</span>
								))}
							<div className='text-left'>
								<div className='font-medium'>{opt.title}</div>
								{opt.description && (
									<div className='text-sm text-gray-500'>{opt.description}</div>
								)}
							</div>
						</Flat3dButton>
					);
				})}
			</div>
		</>
	);
};

export default DialogueOptions;

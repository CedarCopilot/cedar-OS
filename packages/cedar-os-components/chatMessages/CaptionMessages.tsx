import { CornerDownLeft as EnterIcon } from 'lucide-react';
import { Ticker } from 'motion-plus-react';
import React from 'react';
import {
	useCedarStore,
	useMessages,
	TickerMessage,
	DialogueOptionsMessage,
	MultipleChoiceMessage,
	SliderMessage,
} from 'cedar-os';
import Flat3dButton from '@/containers/Flat3dButton';
import Flat3dContainer from '@/containers/Flat3dContainer';
import { ShimmerText } from '@/text/ShimmerText';
import { TypewriterText } from '@/text/TypewriterText';
import KeyboardShortcut from '@/ui/KeyboardShortcut';
import Slider from '@/ui/Slider3D';

interface CaptionMessagesProps {
	showThinking?: boolean;
}

const CaptionMessages: React.FC<CaptionMessagesProps> = ({
	showThinking = true,
}) => {
	const { messages } = useMessages();

	const { isProcessing } = useMessages();

	const store = useCedarStore((state) => state);
	const styling = useCedarStore((state) => state.styling);

	// Get the appropriate message based on showThinking prop
	const latestMessage = React.useMemo(() => {
		if (showThinking) {
			// Show the latest message regardless of role
			return messages[messages.length - 1];
		} else {
			// Find the last non-user message
			for (let i = messages.length - 1; i >= 0; i--) {
				if (messages[i].role !== 'user') {
					return messages[i];
				}
			}
			return null;
		}
	}, [messages, showThinking]);

	if (!latestMessage) return null;

	// Render based on message type
	switch (latestMessage.type) {
		case 'text':
			return (
				<div className='font-semibold text-lg'>
					{isProcessing && latestMessage.role === 'user' ? (
						<ShimmerText text='Thinking...' state='thinking' />
					) : (
						<>
							<span style={{ color: styling.accentColor }}>Cedar: </span>
							<TypewriterText
								text={latestMessage.content}
								className='break-words'
							/>
						</>
					)}
				</div>
			);

		case 'dialogue_options':
			const dialogueMsg = latestMessage as DialogueOptionsMessage;
			return (
				<div className='flex flex-col space-y-3'>
					{dialogueMsg.options.map((opt, idx) => (
						<Flat3dButton
							key={idx}
							id={`dialogue-option-btn-${idx}`}
							className='rounded-md px-1 py-1 flex items-center text-md'
							onClick={() => dialogueMsg.onChoice?.(opt, store)}
							whileHover={{ scale: 1.01 }}>
							<div className='flex items-center'>
								{opt.icon && <span className='mr-2'>{opt.icon}</span>}
								<div className='text-left'>
									<div className='font-semibold'>{opt.title}</div>
									{opt.description && (
										<div className='text-xs text-gray-600'>
											{opt.description}
										</div>
									)}
								</div>
							</div>
						</Flat3dButton>
					))}
				</div>
			);

		case 'ticker':
			const tickerMsg = latestMessage as TickerMessage;
			const mask =
				'linear-gradient(to right, transparent 5%, black 15%, black 85%, transparent 95%)';
			return (
				<div className='w-full'>
					<div className='mb-2'>
						<Ticker
							hoverFactor={0}
							items={tickerMsg.buttons.map((button, bidx) => (
								<Flat3dContainer
									key={bidx}
									whileHover={{ scale: 1.05 }}
									className='max-w-64 w-fit my-3 flex flex-col items-center justify-start p-3'
									style={
										button.colour
											? {
													backgroundColor: button.colour,
													willChange: 'transform',
											  }
											: undefined
									}>
									<div className='flex flex-row items-center justify-center'>
										{button.icon && (
											<div className='mr-4 text-2xl'>{button.icon}</div>
										)}
										<div>
											<p className='text-sm font-medium text-left truncate'>
												{button.title}
											</p>
											<p className='mt-1 text-xs'>{button.description}</p>
										</div>
									</div>
								</Flat3dContainer>
							))}
							style={{ maskImage: mask }}
						/>
					</div>
					<Flat3dButton
						className='flex items-center w-full justify-center py-1'
						onClick={() => tickerMsg.onChoice?.(store)}>
						<KeyboardShortcut className='mr-2'>
							Enter
							<EnterIcon className='w-4 h-4 ml-2' />
						</KeyboardShortcut>
						Next Step
					</Flat3dButton>
				</div>
			);

		case 'multiple_choice':
			const multipleChoiceMsg = latestMessage as MultipleChoiceMessage;
			return (
				<div className='w-full'>
					<div className='flex space-x-2 w-full'>
						{multipleChoiceMsg.choices.map((choice, idx) => (
							<Flat3dButton
								key={idx}
								id={`multiple-choice-btn-${idx}`}
								className='flex-1'
								onClick={() => {
									if (multipleChoiceMsg.onChoice) {
										multipleChoiceMsg.onChoice(choice, store);
									} else {
										store.addMessage({
											role: 'user',
											type: 'text',
											content: choice,
										});
									}
								}}>
								{idx === 0 ? (
									<>
										<KeyboardShortcut className='mr-2'>
											Enter
											<EnterIcon className='w-4 h-4 ml-1' />
										</KeyboardShortcut>
									</>
								) : (
									<KeyboardShortcut shortcut={`${idx + 1}`} className='mr-2' />
								)}
								<span className='truncate'>{choice}</span>
							</Flat3dButton>
						))}
					</div>
				</div>
			);

		case 'slider':
			const sliderMsg = latestMessage as SliderMessage;
			return (
				<div className='w-full flex items-center'>
					<Slider
						min={sliderMsg.min}
						max={sliderMsg.max}
						step={1}
						onComplete={(val) => sliderMsg.onChange?.(val, store)}
					/>
				</div>
			);

		default:
			return null;
	}
};

export default CaptionMessages;

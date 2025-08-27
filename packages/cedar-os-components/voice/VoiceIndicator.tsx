import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Volume2, AlertCircle } from 'lucide-react';
import type { VoiceState } from 'cedar-os';

interface VoiceIndicatorProps {
	voiceState: Pick<
		VoiceState,
		'isListening' | 'isSpeaking' | 'voiceError' | 'voicePermissionStatus'
	>;
}

export const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({
	voiceState,
}) => {
	const { isListening, isSpeaking, voiceError } = voiceState;

	// Don't show indicator if voice is not active
	if (!isListening && !isSpeaking && !voiceError) {
		return null;
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: 10 }}>
				<div className='flex items-center gap-2 justify-center'>
					{isListening && (
						<>
							<Mic className='w-4 h-4 text-red-500' />
							<span className='text-sm font-medium'>Listening...</span>
							<motion.div
								className='flex gap-1'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}>
								{[0, 1, 2].map((i) => (
									<motion.div
										key={i}
										className='w-1 h-3 bg-red-500 rounded-full'
										animate={{
											scaleY: [1, 1.5, 1],
										}}
										transition={{
											duration: 0.5,
											repeat: Infinity,
											delay: i * 0.1,
										}}
									/>
								))}
							</motion.div>
						</>
					)}

					{isSpeaking && (
						<>
							<Volume2 className='w-4 h-4 text-green-500' />
							<span className='text-sm font-medium'>Speaking...</span>
							<motion.div
								className='w-4 h-4'
								animate={{
									scale: [1, 1.2, 1],
								}}
								transition={{
									duration: 0.8,
									repeat: Infinity,
								}}>
								<div className='w-full h-full bg-green-500 rounded-full opacity-30' />
							</motion.div>
						</>
					)}

					{voiceError && (
						<>
							<AlertCircle className='w-4 h-4 text-red-500' />
							<span className='text-sm text-red-500'>{voiceError}</span>
						</>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	);
};

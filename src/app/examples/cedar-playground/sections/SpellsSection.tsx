import React, { useState } from 'react';
import { GlassyPaneContainer } from 'cedar-os';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function SpellsSection() {
	const [spellActive, setSpellActive] = useState(false);

	const handleToggleSpell = () => {
		setSpellActive(!spellActive);
	};

	return (
		<GlassyPaneContainer className='p-6'>
			<h3 className='text-lg font-semibold mb-4 transition-colors duration-300 text-gray-900 dark:text-white'>
				Spells
			</h3>
			<div className='space-y-3'>
				<div className='flex items-center gap-2 mb-3'>
					<Sparkles className='w-5 h-5 dark:text-gray-300' />
					<span className='text-sm font-medium dark:text-gray-200'>
						Spell: {spellActive ? 'Active' : 'Inactive'}
					</span>
				</div>
				<Button onClick={handleToggleSpell} className='w-full'>
					{spellActive ? 'Deactivate Spell' : 'Activate Spell'}
				</Button>
				<p className='text-xs text-gray-500 dark:text-gray-400'>
					Enable magical UI interactions with radial menus
				</p>
			</div>
		</GlassyPaneContainer>
	);
}

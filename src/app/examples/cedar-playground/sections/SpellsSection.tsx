import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '../components/Card';
import { Wand2 } from 'lucide-react';

export function SpellsSection() {
	const handleCastSpell = () => {
		alert(
			'Spells feature coming soon! This will include radial menus, gestures, and more.'
		);
	};

	return (
		<Card title='Spells'>
			<div className='flex items-center gap-2 mb-3'>
				<Wand2 className='w-5 h-5' />
				<span className='text-sm font-medium'>Magic Interactions</span>
			</div>
			<Button onClick={handleCastSpell} variant='outline' className='w-full'>
				Cast Spell
			</Button>
			<p className='text-xs text-gray-500'>
				Intuitive interfaces for controlling AI without text input
			</p>
		</Card>
	);
}

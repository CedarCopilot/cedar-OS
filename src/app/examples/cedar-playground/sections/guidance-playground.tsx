import type { GuidanceInput } from 'cedar-os';
import { lazyFindElement, useGuidance, useSpells } from 'cedar-os';
import {
	Bell,
	Circle,
	Clock,
	Hand,
	MessageCircle,
	MessageSquare,
	MousePointerClick,
	ShieldQuestion,
} from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

// Placeholder component interfaces
interface ContainerProps {
	children: React.ReactNode;
	className?: string;
}

// Placeholder components - should be replaced with proper cedar-os-components imports
const GlassyPaneContainer = ({
	children,
	className,
	...props
}: ContainerProps) => (
	<div
		className={`bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg ${className}`}
		{...props}>
		{children}
	</div>
);

// Guidance Buttons component
const GuidanceButtons: React.FC = () => {
	const { addGuidancesToStart } = useGuidance();
	const { spells, deactivateSpell } = useSpells();

	// Ensure Questioning spell off by default
	useEffect(() => {
		if (spells && spells['cursor']?.isActive) {
			deactivateSpell('cursor');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Add guidances to the FRONT of the queue so users can instantly preview them
	const pushExampleGuidance = (guidance: GuidanceInput) =>
		addGuidancesToStart(guidance);

	const buttons = [
		{
			label: 'Virtual Click',
			Icon: MousePointerClick,
			description: 'Guide a virtual click.',
			getGuidance: (): GuidanceInput => ({
				type: 'VIRTUAL_CLICK',
				endPosition: lazyFindElement('#guidance-btn-dialogue'),
				tooltipText: 'Guide user to next guidance',
				tooltipPosition: 'top',
				advanceMode: 'auto',
			}),
		},
		{
			label: 'Dialogue',
			Icon: MessageCircle,
			description: 'Create a dialogue box to tell the user something.',
			getGuidance: (): GuidanceInput => ({
				type: 'DIALOGUE',
				text: 'Hello from Cedar! 👋',
				advanceMode: 'auto',
			}),
		},
		{
			label: 'Cursor Takeover',
			Icon: Circle,
			description: 'Take over the user cursor and give it a task.',
			getGuidance: (): GuidanceInput => ({
				type: 'CURSOR_TAKEOVER',
				isRedirected: false,
				messages: ["Let's take a quick tour!"],
			}),
		},

		{
			label: 'Virtual Drag',
			Icon: Hand,
			description: 'Guide a drag guidance.',
			getGuidance: (): GuidanceInput => ({
				type: 'VIRTUAL_DRAG',
				endPosition: {
					x: window.innerWidth / 2 + 100,
					y: window.innerHeight / 2,
				},
				startPosition: {
					x: window.innerWidth / 2 - 100,
					y: window.innerHeight / 2,
				},
				tooltipText: 'Sample drag',
				tooltipPosition: 'bottom',
			}),
		},
		{
			label: 'Chat Tooltip',
			Icon: MessageSquare,
			description: 'Create a chat tooltip to tell the user something.',
			getGuidance: (): GuidanceInput => ({
				type: 'CHAT_TOOLTIP',
				content: 'Try asking Cedar about onboarding.',
				duration: 4000,
			}),
		},
		{
			label: 'Idle',
			Icon: Clock,
			description: 'Guide an idle pause.',
			getGuidance: (): GuidanceInput => ({
				type: 'IDLE',
				duration: 2000,
			}),
		},
		{
			label: 'Toast',
			Icon: Bell,
			description: 'Open a toast',
			getGuidance: (): GuidanceInput => ({
				type: 'TOAST',
				title: 'Saved!',
				description: 'Your preferences have been updated.',
				variant: 'success',
			}),
		},
	] as const;

	return (
		<div>
			<div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3'>
				{buttons.map(({ label, Icon, description, getGuidance }) => {
					// Generate an id so other components (e.g., Question Cursor demo) can target this button reliably
					const btnId = `guidance-btn-${label
						.toLowerCase()
						.replace(/\s+/g, '-')}`;
					return (
						<Button
							id={btnId}
							key={label}
							data-question={description}
							variant='outline'
							size='default'
							className='w-full items-center justify-center'
							onClick={() => pushExampleGuidance(getGuidance())}>
							<Icon className='w-5 h-5' />
						</Button>
					);
				})}
			</div>
		</div>
	);
};

// Buttons for toggling example spells (radial menu + questioning cursor)
const ExampleSpellsButtons: React.FC = () => {
	const { spells, toggleSpell, registerSpell } = useSpells();
	const { addGuidancesToStart } = useGuidance();

	const spellConfigs = [
		{
			label: 'Radial Menu',
			Icon: MousePointerClick,
			spellId: 'radial-menu',
			description:
				'Enable/disable the radial menu spell (triggered on right-click).',
			id: 'radial-menu-spell',
		},
		{
			label: 'Question Cursor',
			Icon: ShieldQuestion,
			spellId: 'questioning-cursor',
			description: 'Toggle the animated questioning cursor spell.',
			id: 'questioning-spell',
		},
	];

	return (
		<div className='flex flex-col gap-3'>
			{spellConfigs.map(({ label, Icon, spellId, description, id }) => {
				const spell = spells && spells[spellId];
				const isActive = spell?.isActive ?? false;

				const handleClick = () => {
					if (!spell) {
						// Register the spell if it doesn't exist
						// This is a simplified version - in a real app you'd have proper spell configurations
						registerSpell({
							id: spellId,
							activationConditions: {
								// Add proper activation conditions here
								events: [], // Empty events array for now
							},
							onActivate: () => {
								if (spellId === 'questioning-cursor') {
									// Sample guidance for Question Cursor activation
									addGuidancesToStart([
										{
											type: 'DIALOGUE',
											text: 'The Question Cursor spell lets you hover over elements to get an explanation of what it does. Try hovering over different buttons and elements to see it in action!',
											advanceMode: 'auto',
										},
										{
											type: 'VIRTUAL_CLICK',
											startPosition: 'cursor',
											endPosition: lazyFindElement('#guidance-btn-dialogue'),
											advanceMode: 'auto',
											tooltipText:
												'Try hovering over this button with the questioning cursor',
											tooltipPosition: 'bottom',
										},
									]);
								}
							},
						});
					} else {
						toggleSpell(spellId);
					}
				};

				return (
					<div key={label} className='flex flex-col w-full'>
						<Button
							data-question={description}
							id={id}
							variant={isActive ? 'default' : 'outline'}
							size='default'
							className='w-full items-center justify-center rounded-lg'
							onClick={handleClick}>
							<div className='flex items-center justify-center gap-2'>
								<Icon className='w-5 h-5' />
								<span className='font-semibold'>{label}</span>
							</div>
						</Button>
					</div>
				);
			})}
		</div>
	);
};

export const GuidancePlayground = () => {
	return (
		<div className='relative flex flex-col items-center justify-start w-full'>
			{/* Cedar Interfaces Playground */}
			<GlassyPaneContainer className='flex flex-col w-full p-6 text-left'>
				<h4 className='font-semibold text-lg mb-4'>Guidance Playground</h4>

				{(() => {
					const sections = [
						{
							title: 'Copilot Guidance',
							desc: 'Cedar doesn\u2019t just respond with text \u2014 it guides users.',
							controls: <GuidanceButtons />,
						},
						{
							title: 'Example Spells 🪄',
							desc: 'Spells let users interact with the copilot beyond chat.',
							controls: <ExampleSpellsButtons />,
						},
					];

					return (
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							{sections.map((s) => (
								<div
									key={s.title}
									className='grid grid-rows-[auto_auto_1fr] items-start gap-2'>
									<h5 className='font-semibold'>{s.title}</h5>
									<p className='text-sm'>{s.desc}</p>
									{s.controls}
								</div>
							))}
						</div>
					);
				})()}
			</GlassyPaneContainer>
		</div>
	);
};

export default GuidancePlayground;

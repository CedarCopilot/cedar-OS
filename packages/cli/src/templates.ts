import pc from 'picocolors';
import { detectPackageManager } from './utils/detectPackageManager';

// Template interface for extensible project templates
export interface Template {
	name: string;
	description: string;
	url: string;
	includesCedar: boolean; // If true, skip runCedarAdd
	getNextSteps: (projectName: string, manager: string) => string[];
}

// Helper functions for generating next steps
const getBlankProjectNextSteps = (
	projectName: string,
	manager: string
): string[] => {
	return [
		`Navigate to your project: ${pc.cyan(`cd ${projectName}`)}`,
		`Install dependencies: ${pc.cyan(`${manager} install`)}`,
		`Add OpenAI API key: ${pc.cyan(
			'echo "NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here" > .env'
		)}`,
		`Start development: ${pc.cyan(
			manager === 'npm' ? 'npm run dev' : `${manager} dev`
		)}`,
		pc.green(
			'\n🎉 Cedar chat should work! This uses the OpenAI API directly. It can be configured to talk to any backend.'
		),
	];
};

const getMastraProjectNextSteps = (
	projectName: string,
	manager: string
): string[] => {
	return [
		`Navigate to your project: ${pc.cyan(`cd ${projectName}`)}`,
		`Install dependencies: ${pc.cyan(
			`${manager} install && cd src/backend && ${manager} install && cd ../..`
		)}`,
		`Create .env file: ${pc.cyan(
			'echo "OPENAI_API_KEY=your-api-key-here" > .env'
		)}`,
		`Start development: ${pc.cyan(
			'npm run dev'
		)} (starts both Next.js and Mastra backend)`,
		pc.green(
			'\n🎉 Cedar chat should magically work! Try chatting with your AI assistant.'
		),
	];
};

const getMastraReferenceNextSteps = (
	projectName: string,
	manager: string
): string[] => {
	const baseSteps = getMastraProjectNextSteps(projectName, manager);
	return [
		...baseSteps,
		pc.green(
			'\n🤓 To learn about the features implemented in this template, global search [STEP X] comments and follow them in order.'
		),
	];
};

// Template registry - easily extensible for new templates
export const TEMPLATES: Record<string, Template> = {
	blank: {
		name: 'Blank Cedar project',
		description: 'Next.js app with Cedar (no backend)',
		url: 'https://github.com/CedarCopilot/cedar-blank',
		includesCedar: true,
		getNextSteps: getBlankProjectNextSteps,
	},
	'mastra-blank': {
		name: 'Cedar + Mastra',
		description: 'Next.js app with Mastra backend as monorepo',
		url: 'https://github.com/CedarCopilot/cedar-mastra-blank',
		includesCedar: true,
		getNextSteps: getMastraProjectNextSteps,
	},
	mastra: {
		name: 'Cedar + Mastra hackathon starter',
		description: 'Quick-start repo with basic Cedar and Mastra features',
		url: 'https://github.com/CedarCopilot/cedar-hackathon-starter',
		includesCedar: true,
		getNextSteps: getMastraReferenceNextSteps,
	},
};

// Helper function to show template-specific next steps
export function showNextSteps(template: Template | null, projectName: string) {
	const { manager } = detectPackageManager();

	console.log('\n' + pc.bold('🎉 Success! Your Cedar project is ready.'));
	console.log('\n' + pc.bold('Next steps:'));

	if (template && template.includesCedar) {
		// Get template-specific next steps
		const steps = template.getNextSteps(projectName, manager);
		steps.forEach((step) => {
			console.log(pc.gray(`• ${step}`));
		});
	} else {
		// Standard Next.js or no template
		console.log(
			pc.gray(`• Navigate to your project: ${pc.cyan(`cd ${projectName}`)}`)
		);
		console.log(
			pc.gray(
				`• Start development: ${pc.cyan(
					`${manager === 'npm' ? 'npm run dev' : `${manager} dev`}`
				)}`
			)
		);
	}

	console.log(
		'\n' +
			pc.gray('📖 Need help or want to learn more? ') +
			pc.cyan('https://docs.cedarcopilot.com/getting-started/getting-started')
	);
}

// Helper function to show manual installation fallback
export function showManualInstallation() {
	console.log('\n' + pc.red('❌ Installation failed.'));
	console.log(pc.yellow('Try these alternatives:'));
	console.log(
		'\n' + pc.bold('1. Create a Next.js project manually and try add-sapling:')
	);
	console.log(pc.gray('   npx create-next-app@latest my-project'));
	console.log(pc.gray('   cd my-project'));
	console.log(pc.gray('   npx cedar-os-cli add-sapling'));
	console.log(
		'\n' + pc.bold('2. If that also fails, use full manual installation:')
	);
	console.log(
		pc.cyan(
			'   https://docs.cedarcopilot.com/getting-started/getting-started#manual-installation-cli-fallback'
		)
	);
}

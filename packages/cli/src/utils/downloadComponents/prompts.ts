// packages/cli/src/utils/downloadComponents/prompts.ts
// --------------------------------------------------
// User interaction and prompting utilities
// Handles all CLI prompts and UI feedback for component installation
// --------------------------------------------------

import * as p from '@clack/prompts';
import { spinner, confirm, select, multiselect, text } from '@clack/prompts';
import pc from 'picocolors';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import type { ComponentInfo } from './registry';
import { getCategories } from './registry';
import { checkDirectoryExists, GITHUB_BASE_URL } from './downloader';

// Prompt user to select components
export async function selectComponents(
	allComponents: ComponentInfo[],
	options: {
		promptMessage?: string;
		skipPrompt?: boolean;
		preselected?: string[];
	} = {}
): Promise<ComponentInfo[]> {
	// Group components by category for better UX
	const categories = await getCategories();
	const componentsByCategory: Record<string, ComponentInfo[]> = {};

	// Initialize empty arrays for each category
	Object.keys(categories).forEach((cat) => {
		componentsByCategory[cat] = [];
	});

	// Group components
	allComponents.forEach((comp) => {
		if (componentsByCategory[comp.category]) {
			componentsByCategory[comp.category].push(comp);
		}
	});

	if (options.skipPrompt) {
		return allComponents;
	}

	const selectionType = await select({
		message:
			options.promptMessage || 'Which components would you like to install?',
		options: [
			{ value: 'all', label: 'All components' },
			{ value: 'select', label: 'Select specific components' },
			{ value: 'none', label: 'None (cancel)' },
		],
	});

	if (p.isCancel(selectionType) || selectionType === 'none') {
		return [];
	}

	if (selectionType === 'all') {
		return allComponents;
	}

	// Multi-select specific components
	const componentOptions = Object.entries(componentsByCategory)
		.filter(([, comps]) => comps.length > 0)
		.flatMap(([category, comps]) => [
			{
				value: `__category_${category}`,
				label: pc.bold(pc.cyan(`── ${categories[category]} ──`)),
				hint: '',
			},
			...comps.map((comp) => ({
				value: comp.name,
				label: `  ${comp.displayName}`,
				hint: comp.description,
			})),
		]);

	const selected = await multiselect({
		message: 'Select components to install:',
		options: componentOptions.filter(
			(opt) => !opt.value.startsWith('__category_')
		),
		initialValues: options.preselected || [],
	});

	if (p.isCancel(selected)) {
		return [];
	}

	return allComponents.filter((comp) =>
		(selected as string[]).includes(comp.name)
	);
}

// Check for existing components and prompt for updates
export async function checkExistingComponents(
	targetDir: string,
	components: ComponentInfo[]
): Promise<{
	newComponents: ComponentInfo[];
	updatedComponents: ComponentInfo[];
}> {
	const dirExists = await checkDirectoryExists(targetDir);
	if (!dirExists) {
		return { newComponents: components, updatedComponents: [] };
	}

	const diffSpin = spinner();
	diffSpin.start('🌱  Checking for component updates...');

	const newComponents: ComponentInfo[] = [];
	const updatedComponents: ComponentInfo[] = [];

	for (const component of components) {
		let hasChanges = false;
		let isMissing = false;

		for (const file of component.files) {
			const localPath = path.join(targetDir, file);
			try {
				const localContent = await fs.promises.readFile(localPath, 'utf-8');
				const remoteUrl = `${GITHUB_BASE_URL}/${file}`;
				const remoteRes = await fetch(remoteUrl);
				const remoteContent = await remoteRes.text();

				if (localContent !== remoteContent) {
					hasChanges = true;
				}
			} catch {
				isMissing = true;
			}
		}

		if (isMissing) {
			newComponents.push(component);
		} else if (hasChanges) {
			updatedComponents.push(component);
		}
	}

	diffSpin.stop('✅ Update check complete');

	return { newComponents, updatedComponents };
}

// Prompt for installation directory
export async function promptForDirectory(
	defaultDir: string = 'src/cedar/components',
	skipPrompt: boolean = false
): Promise<string | null> {
	if (skipPrompt) {
		return defaultDir;
	}

	const useDefault = await confirm({
		message: `Install components to ${pc.cyan(defaultDir)}?`,
		initialValue: true,
	});

	if (p.isCancel(useDefault)) {
		return null;
	}

	if (useDefault) {
		return defaultDir;
	}

	const customDir = await text({
		message: 'Enter installation directory:',
		placeholder: defaultDir,
		initialValue: defaultDir,
	});

	if (p.isCancel(customDir)) {
		return null;
	}

	return customDir || defaultDir;
}

// Show component installation summary
export function showInstallationSummary(
	newComponents: ComponentInfo[],
	updatedComponents: ComponentInfo[],
	dependencies: string[]
) {
	if (newComponents.length > 0) {
		console.log(pc.green(`\n✨ New components to install:`));
		newComponents.forEach((comp) => {
			console.log(pc.gray(`  • ${comp.displayName} (${comp.name})`));
		});
	}

	if (updatedComponents.length > 0) {
		console.log(pc.yellow(`\n🔄 Components to update:`));
		updatedComponents.forEach((comp) => {
			console.log(pc.gray(`  • ${comp.displayName} (${comp.name})`));
		});
	}

	if (dependencies.length > 0) {
		console.log(pc.blue(`\n📦 Dependencies to install:`));
		console.log(pc.gray(`  ${dependencies.join(', ')}`));
	}
}

// Show next steps for local imports
export function showLocalImportSteps(
	components: ComponentInfo[],
	targetDir: string
) {
	console.log('\n' + pc.bold('✨ Components installed successfully!'));
	console.log('\n' + pc.bold('Next steps:'));
	console.log(pc.gray('• Import your components from their local paths:'));

	// Show a few example imports
	const examples = components.slice(0, 3);
	examples.forEach((comp) => {
		const importPath = `@/${targetDir.replace('src/', '')}/${comp.category}/${
			comp.importName
		}`;
		console.log(
			pc.cyan(`  import { ${comp.importName} } from '${importPath}';`)
		);
	});

	if (components.length > 3) {
		console.log(pc.gray('  ...and more'));
	}

	console.log(
		'\n' +
			pc.gray('📖 Learn more: ') +
			pc.cyan('https://docs.cedarcopilot.com/getting-started/getting-started')
	);
}

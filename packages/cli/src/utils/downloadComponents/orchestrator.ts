// packages/cli/src/utils/downloadComponents/orchestrator.ts
// --------------------------------------------------
// Main orchestrator for component download workflow
// Handles the complete flow that's shared between add-sapling and pluck-component
// --------------------------------------------------

import * as p from '@clack/prompts';
import { spinner, confirm } from '@clack/prompts';
import pc from 'picocolors';
import {
	getAllComponents,
	collectDependencies,
	resolveComponentDependencies,
} from './registry';
import { downloadMultipleComponents, createDirectory } from './downloader';
import {
	selectComponents,
	checkExistingComponents,
	promptForDirectory,
	showInstallationSummary,
} from './prompts';
import { detectPackageManager } from '../detectPackageManager';
import { runCommand } from '../runCommand';
import { ComponentInfo } from './registry';

export interface ComponentDownloadOptions {
	dir?: string;
	components?: string[];
	all?: boolean;
	yes?: boolean;
}

export interface DownloadResult {
	componentsInstalled: ComponentInfo[];
	targetDirectory: string;
	npmDependencies: string[];
}

// Main orchestrator function that handles the complete component download flow
export async function downloadComponentsFlow(
	options: ComponentDownloadOptions,
	config: {
		promptMessage?: string;
		skipDependencyInstall?: boolean;
		filterDependencies?: (deps: string[]) => string[];
	} = {}
): Promise<DownloadResult> {
	// ==========================================================================
	// STEP 1: DETERMINE TARGET DIRECTORY
	// ==========================================================================
	const targetDir = await promptForDirectory(
		options.dir || 'src/cedar/components',
		options.yes || false
	);
	if (!targetDir) {
		p.cancel('Operation cancelled.');
		process.exit(0);
	}

	// ==========================================================================
	// STEP 2: SELECT COMPONENTS
	// ==========================================================================
	const allComponents = await getAllComponents();
	let selectedComponents = allComponents;

	// Handle component selection based on options
	if (options.all) {
		selectedComponents = allComponents;
	} else if (options.components && options.components.length > 0) {
		// Map user-provided identifiers (may be importName, displayName, or registry name)
		const normalize = (str: string) =>
			str.toLowerCase().replace(/[^a-z0-9]/g, '');
		const requested = options.components!.map(normalize);
		selectedComponents = allComponents.filter((comp: ComponentInfo) => {
			const candidates = [comp.name, comp.importName, comp.displayName].filter(
				Boolean
			);
			return candidates.some((c) => requested.includes(normalize(c)));
		});
	} else if (!options.yes) {
		// Interactive selection
		selectedComponents = await selectComponents(allComponents, {
			promptMessage:
				config.promptMessage || 'Which components would you like to install?',
		});

		if (selectedComponents.length === 0) {
			p.cancel('No components selected.');
			process.exit(0);
		}
	}

	// ==========================================================================
	// STEP 3: CHECK FOR EXISTING COMPONENTS
	// ==========================================================================
	const { newComponents, updatedComponents } = await checkExistingComponents(
		targetDir,
		selectedComponents
	);

	// Handle update prompts
	let componentsToInstall = [...newComponents];

	if (updatedComponents.length > 0 && !options.yes) {
		const decision = await p.select({
			message: `There are ${updatedComponents.length} components that would be overwritten. How would you like to proceed?`,
			options: [
				{ value: 'all', label: 'Yes, overwrite all' },
				{ value: 'none', label: 'No, skip overwriting' },
				{ value: 'each', label: 'Decide one by one' },
			],
		});

		if (p.isCancel(decision)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}

		if (decision === 'all') {
			componentsToInstall = [...componentsToInstall, ...updatedComponents];
		} else if (decision === 'each') {
			for (const comp of updatedComponents) {
				const shouldOverwrite = await confirm({
					message: `Overwrite ${comp.displayName}? (y/N)`,
					initialValue: true,
				});

				if (p.isCancel(shouldOverwrite)) {
					p.cancel('Operation cancelled.');
					process.exit(0);
				}

				if (shouldOverwrite) {
					componentsToInstall.push(comp);
				}
			}
		}
	} else if (options.yes) {
		componentsToInstall = [...componentsToInstall, ...updatedComponents];
	}

	if (componentsToInstall.length === 0) {
		p.outro(pc.green("No new components to install. You're all set :)"));
		process.exit(0);
	}

	// ==========================================================================
	// STEP 4: RESOLVE ALL DEPENDENCIES
	// ==========================================================================
	const componentNames = componentsToInstall.map((c) => c.name);
	const allComponentNames = await resolveComponentDependencies(componentNames);

	// Get all components including dependencies
	const allComponentsWithDeps = await Promise.all(
		allComponentNames.map((name: string) =>
			getAllComponents().then((comps: ComponentInfo[]) =>
				comps.find((c: ComponentInfo) => c.name === name)
			)
		)
	);
	const originalCount = componentsToInstall.length;
	componentsToInstall = allComponentsWithDeps.filter(
		Boolean
	) as typeof componentsToInstall;

	// Show dependency info if new components were added
	if (componentsToInstall.length > originalCount) {
		console.log(
			pc.blue(
				`\n📦 Added ${
					componentsToInstall.length - originalCount
				} component dependencies`
			)
		);
	}

	// ==========================================================================
	// STEP 5: COLLECT NPM DEPENDENCIES
	// ==========================================================================
	const componentDeps = await collectDependencies(allComponentNames);
	const uniqueDeps = [...new Set(componentDeps)] as string[];
	const allDeps: string[] = config.filterDependencies
		? config.filterDependencies(componentDeps)
		: uniqueDeps.filter(
				(dep: string) =>
					dep !== 'react' && dep !== 'cedar-os' && dep !== 'cedar-os-components'
		  );

	// Show installation summary
	showInstallationSummary(newComponents, updatedComponents, allDeps);

	// ==========================================================================
	// STEP 6: OPTIONAL NPM DEPENDENCY INSTALLATION
	// ==========================================================================
	if (!config.skipDependencyInstall && allDeps.length > 0) {
		await handleNpmDependencies(allDeps, options.yes || false);
	}

	// ==========================================================================
	// STEP 7: CREATE DIRECTORY AND DOWNLOAD COMPONENTS
	// ==========================================================================
	await createDirectory(targetDir);

	const s = spinner();
	s.start('🌿 Downloading components...');

	try {
		await downloadMultipleComponents(componentsToInstall, targetDir);
		s.stop(
			pc.green(
				`✅ Successfully downloaded ${
					componentsToInstall.length
				} components to ${pc.cyan(targetDir)}`
			)
		);
	} catch (error) {
		s.stop('Failed to download components.');
		p.cancel(
			`Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
		process.exit(1);
	}

	return {
		componentsInstalled: componentsToInstall,
		targetDirectory: targetDir,
		npmDependencies: allDeps,
	};
}

// Handle NPM dependency installation with prompts
async function handleNpmDependencies(
	deps: string[],
	autoConfirm: boolean = false
): Promise<void> {
	const { manager, installCmd } = detectPackageManager();

	if (!autoConfirm) {
		const depsDisplay =
			deps.length <= 3
				? deps.map((dep) => pc.cyan(dep)).join(', ')
				: `${deps
						.slice(0, 2)
						.map((dep) => pc.cyan(dep))
						.join(', ')} and ${pc.cyan(`${deps.length - 2} more`)}`;

		const installDeps = await confirm({
			message: `Cedar components require ${depsDisplay}. Install these dependencies using ${manager}?`,
			initialValue: true,
		});

		if (p.isCancel(installDeps)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}

		if (!installDeps) {
			console.log(pc.yellow('⚠️  Skipping dependency installation.'));
			console.log(pc.gray('Remember to install these manually:'));
			console.log(
				pc.cyan(`  ${manager} ${installCmd.join(' ')} ${deps.join(' ')}`)
			);
			return;
		}
	}

	const depInstallSpin = spinner();
	depInstallSpin.start(
		`📦 Installing component dependencies using ${manager}...`
	);

	try {
		await runCommand(manager, [...installCmd, ...deps], {
			stdio: 'ignore',
		});
		depInstallSpin.stop('✅ Component dependencies installed successfully!');
	} catch {
		depInstallSpin.stop('❌ Failed to install component dependencies.');
		console.log(
			pc.yellow(
				'\nWarning: Failed to install component dependencies automatically.'
			)
		);
		console.log(pc.gray('You can install them manually by running:'));
		console.log(
			pc.cyan(`  ${manager} ${installCmd.join(' ')} ${deps.join(' ')}`)
		);
		console.log(
			pc.gray('Components may not work properly without these dependencies.')
		);
	}
}

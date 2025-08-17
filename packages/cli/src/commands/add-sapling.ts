// packages/cli/src/commands/add-sapling.ts
// --------------------------------------------------
// ADD-SAPLING COMMAND IMPLEMENTATION
// Installs Cedar-OS components and package to existing projects
// --------------------------------------------------
//
// This command provides granular control over Cedar installation:
// 1. Prompts for component selection (or uses --all flag)
// 2. Installs required dependencies
// 3. Downloads component source files from remote registry
// 4. Installs cedar-os package
// 5. Shows next steps for configuration
//
// Used by both:
// - Direct add-sapling command invocation
// - plant-seed command for existing Next.js projects
// --------------------------------------------------

import * as p from '@clack/prompts';
import { intro, outro, spinner } from '@clack/prompts';
import pc from 'picocolors';
import {
	downloadComponentsFlow,
	showLocalImportSteps,
	checkDirectoryExists,
	type ComponentDownloadOptions,
} from '../utils/downloadComponents';
import { detectPackageManager } from '../utils/detectPackageManager';
import { runCommand } from '../utils/runCommand';
import { ensureTailwindSetup } from '../utils/tailwindSetup';

// -----------------------------
export interface AddSaplingOptions {
	dir?: string;
	components?: string[];
	all?: boolean;
	yes?: boolean;
}

// =============================================================================
// MAIN ADD-SAPLING COMMAND FUNCTION
// =============================================================================
// This function handles the complete flow for adding Cedar components to
// an existing project. It's designed to be called both directly via the
// add-sapling command and indirectly from the plant-seed command.
export async function addSaplingCommand(options: AddSaplingOptions) {
	intro(pc.bgCyan(pc.black(' cedar add-sapling ')));
	console.log(pc.green("Welcome to Cedar-OS, let's get you set up!"));

	try {
		// STEP 1: INSTALLATION MODE (LOCAL ONLY)
		// ==========================================================================
		// The CLI previously allowed installing cedar-os-components from npm directly.
		// We now enforce local source downloads only, so we skip the old prompt/branch.

		// Otherwise continue with local installation
		console.log(
			pc.cyan(
				'🌱 Adding saplings to your Cedar forest (downloading components)...'
			)
		);

		// Check if directory already exists for confirmation prompt
		const targetDir = options.dir || 'src/cedar/components';
		const dirExists = await checkDirectoryExists(targetDir);
		if (dirExists && !options.yes) {
			const shouldContinue = await p.confirm({
				message: `Directory ${pc.cyan(targetDir)} already exists. Continue?`,
				initialValue: false,
			});

			if (p.isCancel(shouldContinue) || !shouldContinue) {
				p.cancel('Operation cancelled.');
				process.exit(0);
			}
		}

		// ==========================================================================
		// STEP 2: ENSURE TAILWIND CSS IS SET UP
		// ==========================================================================
		await ensureTailwindSetup(targetDir);

		// ==========================================================================
		// STEP 3: USE DOWNLOAD COMPONENTS FLOW
		// ==========================================================================
		// Always include these core dependencies for Cedar components
		const coreDeps = ['lucide-react', 'motion', 'motion-plus-react'];

		const result = await downloadComponentsFlow(
			options as ComponentDownloadOptions,
			{
				promptMessage: 'Which components would you like to install?',
				filterDependencies: (deps) => {
					return [...new Set([...coreDeps, ...deps])].filter(
						(dep) => dep !== 'react'
					);
				},
			}
		);

		// ==========================================================================
		// STEP 4: INSTALL CEDAR-OS PACKAGE
		// ==========================================================================
		const { manager, installCmd } = detectPackageManager();
		const depSpin = spinner();
		depSpin.start(
			`📦  Installing cedar-os and its dependencies using ${manager}...`
		);

		try {
			await runCommand(manager, [...installCmd, 'cedar-os'], {
				stdio: 'ignore',
			});
			depSpin.stop('✅ Dependencies installed successfully!');
		} catch {
			depSpin.stop('❌ Failed to install dependencies.');
			console.log(
				pc.yellow(
					'\nWarning: Failed to install cedar-os package automatically.'
				)
			);
			console.log(pc.gray('You can install it manually by running:'));
			console.log(pc.cyan(`  ${manager} ${installCmd.join(' ')} cedar-os`));
			console.log(pc.gray("This won't affect the component installation."));
		}

		// ==========================================================================
		// STEP 5: SHOW NEXT STEPS
		// ==========================================================================
		showLocalImportSteps(result.componentsInstalled, result.targetDirectory);
		outro(pc.green('Happy coding! 🚀'));
	} catch (err) {
		p.cancel(
			`Something went wrong${err instanceof Error ? ': ' + err.message : ''}`
		);
		process.exit(1);
	}
}

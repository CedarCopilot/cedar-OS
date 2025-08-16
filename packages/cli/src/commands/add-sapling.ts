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
import { intro, outro, spinner, select } from '@clack/prompts';
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

// Handle npm-based installation
async function handleNpmInstallation() {
	const depSpin = spinner();
	depSpin.start('Installing cedar-os-components from npm...');

	const { manager } = detectPackageManager();
	const installCmd = manager === 'npm' ? 'install' : 'add';

	try {
		await runCommand(manager, [installCmd, 'cedar-os-components@latest'], {
			stdio: 'ignore',
		});
		depSpin.stop('✅ cedar-os-components installed successfully!');
	} catch (error) {
		depSpin.stop('❌ Failed to install cedar-os-components');
		console.error(pc.red('Error installing package:'), error);
		process.exit(1);
	}

	// Also ensure cedar-os is installed
	const cedarSpin = spinner();
	cedarSpin.start('Ensuring cedar-os is installed...');
	try {
		await runCommand(manager, [installCmd, 'cedar-os@latest'], {
			stdio: 'ignore',
		});
		cedarSpin.stop('✅ cedar-os installed successfully!');
	} catch (error) {
		cedarSpin.stop('❌ Failed to install cedar-os');
		console.error(pc.red('Error installing package:'), error);
		process.exit(1);
	}

	// Show next steps for npm installation
	console.log('\n' + pc.bold('✨ Cedar components installed successfully!'));
	console.log('\n' + pc.bold('Next steps:'));
	console.log(pc.gray('• Import components directly from the package:'));
	console.log(
		pc.cyan(
			'  import { FloatingCedarChat } from "cedar-os-components/chatComponents";'
		)
	);
	console.log(
		pc.cyan('  import { ChatInput } from "cedar-os-components/chatInput";')
	);
	console.log(
		pc.cyan('  import { Container3D } from "cedar-os-components/containers";')
	);
	console.log(pc.gray('  ...and more'));
	console.log(
		'\n' +
			pc.gray('📖 Learn more: ') +
			pc.cyan('https://docs.cedarcopilot.com/getting-started/getting-started')
	);
	outro(pc.green('Happy coding! 🚀'));
}

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
		// ==========================================================================
		// STEP 1: PROMPT FOR INSTALLATION TYPE
		// ==========================================================================
		let installationType: 'local' | 'npm' = 'local';

		if (!options.yes) {
			const installChoice = await select({
				message: 'How would you like to install Cedar components?',
				options: [
					{
						value: 'local',
						label: 'Download components locally (shadcn style)',
						hint: 'Full control and customization',
					},
					{
						value: 'npm',
						label: 'Install cedar-os-components from npm',
						hint: 'Easier updates, no local files',
					},
				],
				initialValue: 'local',
			});

			if (p.isCancel(installChoice)) {
				p.cancel('Operation cancelled.');
				process.exit(0);
			}

			installationType = installChoice as 'local' | 'npm';
		}

		// If npm installation, handle it separately
		if (installationType === 'npm') {
			return await handleNpmInstallation();
		}

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

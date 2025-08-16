// packages/cli/src/commands/create.ts
// --------------------------------------------------
// PLANT-SEED COMMAND IMPLEMENTATION
// The smart command that auto-detects your setup and does the right thing:
//
// 1. EXISTING NEXT.JS PROJECT → Runs add-sapling to install Cedar components
// 2. NEW PROJECT → Template selection → Project creation → Cedar installation
// 3. NON-NEXT.JS → Guides user to create Next.js project first
//
// This is the recommended command for most users.
// --------------------------------------------------

import {
	intro,
	outro,
	text,
	confirm,
	select,
	cancel,
	isCancel,
} from '@clack/prompts';
import pc from 'picocolors';
import path from 'path';

import { isNextProject, isReactProject, runCedarAdd } from '../cli-helpers';
import {
	showManualInstallation,
	showNextSteps,
	Template,
	TEMPLATES,
} from '../templates';
import { runCommand } from '../utils/runCommand';

export interface PlantSeedOptions {
	projectName?: string;
	template?: string;
	yes?: boolean;
}

// =============================================================================
// MAIN PLANT-SEED COMMAND FUNCTION
// =============================================================================
// This function implements the core logic for the plant-seed command.
// It follows a step-by-step approach to detect the user's environment
// and take the appropriate action.
export async function plantSeedCommand(opts: PlantSeedOptions) {
	try {
		intro(pc.bgGreen(pc.black(' cedar plant-seed ')));

		const cwd = process.cwd();

		// ==========================================================================
		// STEP 1: DETECT EXISTING PROJECT TYPE
		// ==========================================================================
		// Check what kind of project we're in and handle accordingly
		const inNext = isNextProject(cwd);
		const inReact = isReactProject(cwd);

		if (inNext) {
			// =======================================================================
			// SCENARIO A: EXISTING NEXT.JS PROJECT
			// =======================================================================
			// User is in an existing Next.js project
			// Offer to add Cedar components directly to this project
			let shouldAddToExisting = true;

			// If not using --yes flag, ask for confirmation
			if (!opts.yes) {
				const addToExisting = await confirm({
					message:
						'Looks like you have an existing Next.js project. Add Cedar to existing project?',
					initialValue: true,
				});

				if (isCancel(addToExisting)) {
					cancel('Operation cancelled.');
					process.exit(0);
				}

				shouldAddToExisting = addToExisting;
			}

			if (shouldAddToExisting) {
				// Run the add-sapling command to install Cedar components
				console.log(
					pc.gray('Adding Cedar components to existing Next.js project...')
				);
				await runCedarAdd({ yes: opts.yes });
				outro(pc.green('Cedar components added successfully!'));
				return;
			} else {
				// User declined to add Cedar to existing project
				outro(pc.yellow('Operation cancelled. No changes made.'));
				return;
			}
		} else if (inReact) {
			// =======================================================================
			// SCENARIO B: EXISTING REACT PROJECT (NON-NEXT.JS)
			// =======================================================================
			// User is in a React project but not Next.js
			// Cedar works best with Next.js but can work with other React frameworks
			let shouldAddToExisting = true;

			// If not using --yes flag, ask for confirmation with warning
			if (!opts.yes) {
				const addToExisting = await confirm({
					message:
						'Detected React project. Cedar works best with Next.js, but you can add components to this project. Continue?',
					initialValue: true,
				});

				if (isCancel(addToExisting)) {
					cancel('Operation cancelled.');
					process.exit(0);
				}

				shouldAddToExisting = addToExisting;
			}

			if (shouldAddToExisting) {
				// Run the add-sapling command to install Cedar components
				console.log(
					pc.gray('Adding Cedar components to existing React project...')
				);
				console.log(
					pc.yellow(
						'⚠️  Note: Cedar works best with Next.js. You may need additional configuration.'
					)
				);
				await runCedarAdd({ yes: opts.yes });
				outro(pc.green('Cedar components added successfully!'));
				return;
			} else {
				// User declined to add Cedar to existing project
				outro(pc.yellow('Operation cancelled. No changes made.'));
				return;
			}
		}

		// ==========================================================================
		// STEP 2: NOT IN EXISTING PROJECT - COLLECT PROJECT NAME
		// ==========================================================================
		// User is not in a Next.js or React project, so we need to create a new one
		// First, get the project name from user or use defaults
		let projectName = opts.projectName;
		if (!projectName) {
			if (opts.yes) {
				// Use default name when --yes flag is used
				projectName = 'cedar-app';
			} else {
				// Prompt user for project name
				const nameInput = await text({
					message: 'Project name:',
					placeholder: 'cedar-app',
					initialValue: 'cedar-app',
				});

				if (isCancel(nameInput)) {
					cancel('Operation cancelled.');
					process.exit(0);
				}

				projectName = nameInput || 'cedar-app';
			}
		}

		// ==========================================================================
		// STEP 3: TEMPLATE SELECTION
		// ==========================================================================
		// Allow user to choose from available project templates
		// Templates include pre-configured setups (like Mastra) or standard Next.js
		let selectedTemplate: Template | null = null;

		if (!opts.yes) {
			// Build list of available templates plus "none" option
			const templateOptions = [
				...Object.entries(TEMPLATES).map(([key, template]) => ({
					value: key,
					label: `${template.name} - ${template.description}`,
				})),
				{
					value: 'none',
					label: 'None (Standard Next.js app)',
				},
			];

			// Present template selection to user
			const templateChoice = await select({
				message: 'Choose a project template:',
				options: templateOptions,
				initialValue: 'mastra', // Default to Mastra (recommended)
			});

			if (isCancel(templateChoice)) {
				cancel('Operation cancelled.');
				process.exit(0);
			}

			// Set selected template (null means standard Next.js)
			if (templateChoice !== 'none') {
				selectedTemplate = TEMPLATES[templateChoice];
			}
		} else {
			// When using --yes flag, default to Mastra template (recommended)
			selectedTemplate = TEMPLATES['mastra'];
		}

		// ==========================================================================
		// STEP 4: CREATE PROJECT
		// ==========================================================================
		// Based on template selection, either clone a template or create standard Next.js
		console.log(
			pc.gray(
				`Creating ${
					selectedTemplate ? selectedTemplate.name : 'standard Next.js'
				} project...`
			)
		);

		try {
			if (selectedTemplate) {
				// =======================================================================
				// SCENARIO B1: TEMPLATE-BASED PROJECT CREATION
				// =======================================================================
				// Clone the selected template repository
				await runCommand('git', ['clone', selectedTemplate.url, projectName], {
					cwd,
				});

				// Clean up the git history to start fresh
				const projectDir = path.resolve(cwd, projectName);
				await runCommand('rm', ['-rf', '.git'], { cwd: projectDir });

				// Initialize a new git repository for the user's project
				await runCommand('git', ['init'], { cwd: projectDir });

				console.log(
					pc.green(`✅ ${selectedTemplate.name} template cloned successfully!`)
				);
			} else {
				// =======================================================================
				// SCENARIO B2: STANDARD NEXT.JS PROJECT CREATION
				// =======================================================================
				// Create a standard Next.js app using create-next-app
				// Let Next.js handle all the prompting (TypeScript, Tailwind, etc.)
				await runCommand('npx', ['create-next-app@latest', projectName], {
					cwd,
				});
				console.log(pc.green('✅ Next.js app created successfully!'));
			}
		} catch (error) {
			// Project creation failed - show manual installation options
			console.error(pc.red('Failed to create Next.js project:'), error);
			showManualInstallation();
			process.exit(1);
		}

		// ==========================================================================
		// STEP 5: NAVIGATE TO PROJECT DIRECTORY
		// ==========================================================================
		// Change into the newly created project directory for Cedar installation
		const projectDir = path.resolve(cwd, projectName);
		process.chdir(projectDir);

		// ==========================================================================
		// STEP 6: INSTALL CEDAR COMPONENTS (CONDITIONAL)
		// ==========================================================================
		// Only install Cedar if the template doesn't already include it
		// Templates like Mastra already have Cedar pre-installed
		if (!selectedTemplate || !selectedTemplate.includesCedar) {
			console.log(pc.gray('Installing Cedar components...'));

			try {
				// Run the add-sapling command to install Cedar components
				await runCedarAdd({ yes: opts.yes });
			} catch (error) {
				console.error(pc.red('Failed to install Cedar components:'), error);
				showManualInstallation();
				process.exit(1);
			}
		} else {
			// Template already includes Cedar - no additional installation needed
			console.log(
				pc.green('✅ Cedar components already included in template!')
			);
		}

		// ==========================================================================
		// STEP 7: COMPLETION
		// ==========================================================================
		// Show appropriate next steps based on template selection
		// Note: runCedarAdd already shows next steps, so we only show them for
		// templates that include Cedar (since they skip the runCedarAdd step)
		if (selectedTemplate && selectedTemplate.includesCedar) {
			showNextSteps(selectedTemplate, projectName);
		}
		outro(pc.green('Happy coding! 🚀'));
	} catch (err) {
		console.error(pc.red('Something went wrong:'), err);
		showManualInstallation();
		process.exit(1);
	}
}

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
import { spawn } from 'cross-spawn';
import { spawnSync } from 'child_process';
import fs from 'fs';
import { isNextProject, runCedarAdd } from '../cli-helpers';

export interface CreateOptions {
	projectName?: string;
	template?: string;
	yes?: boolean;
}

// Template interface for extensible project templates
interface Template {
	name: string;
	description: string;
	url: string;
	includesCedar: boolean; // If true, skip runCedarAdd
}

// Template registry - easily extensible for new templates
const TEMPLATES: Record<string, Template> = {
	mastra: {
		name: 'Mastra + Cedar',
		description:
			'Full-stack template with Mastra framework and Cedar components',
		url: 'https://github.com/CedarCopilot/cedar-mastra-starter',
		includesCedar: true,
	},
};

// Helper function to run shell commands
function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; stdio?: 'inherit' | 'pipe' | 'ignore' } = {}
): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: options.stdio || 'inherit',
			cwd: options.cwd || process.cwd(),
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(
					new Error(
						`Command "${command} ${args.join(
							' '
						)}" failed with exit code ${code}`
					)
				);
			} else {
				resolve();
			}
		});

		child.on('error', (error) => {
			reject(error);
		});
	});
}

// Helper function to detect package manager
function detectPackageManager(): { manager: string; installCmd: string[] } {
	const cwd = process.cwd();

	// Check for lock files to determine package manager
	if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) {
		return { manager: 'pnpm', installCmd: ['install'] };
	}

	if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
		return { manager: 'yarn', installCmd: ['install'] };
	}

	if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
		return { manager: 'bun', installCmd: ['install'] };
	}

	// Check if package managers are available in PATH
	try {
		spawnSync('pnpm', ['--version'], { stdio: 'ignore' });
		return { manager: 'pnpm', installCmd: ['install'] };
	} catch {}

	try {
		spawnSync('yarn', ['--version'], { stdio: 'ignore' });
		return { manager: 'yarn', installCmd: ['install'] };
	} catch {}

	try {
		spawnSync('bun', ['--version'], { stdio: 'ignore' });
		return { manager: 'bun', installCmd: ['install'] };
	} catch {}

	// Default to npm
	return { manager: 'npm', installCmd: ['install'] };
}

// Helper function to show template-specific next steps
function showNextSteps(template: Template | null, projectName: string) {
	const { manager } = detectPackageManager();

	console.log('\n' + pc.bold('🎉 Success! Your Cedar project is ready.'));
	console.log('\n' + pc.bold('Next steps:'));
	console.log(
		pc.gray(`• Navigate to your project: ${pc.cyan(`cd ${projectName}`)}`)
	);

	if (template && template.includesCedar) {
		// Template includes Cedar (like Mastra) - different flow
		console.log(
			pc.gray(
				`• Install dependencies: ${pc.cyan(
					`${manager} install && cd src/backend && ${manager} install && cd ../..`
				)}`
			)
		);
		console.log(
			pc.gray(
				`• Start development: ${pc.cyan(
					'npm run dev'
				)} (starts both Next.js and Mastra backend)`
			)
		);
	} else {
		// Standard Next.js or no template
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
			pc.gray('📖 Resume the quickstart guide: ') +
			pc.cyan('https://docs.cedarcopilot.com/getting-started/getting-started')
	);
}

// Helper function to show manual installation fallback
function showManualInstallation() {
	console.log('\n' + pc.red('❌ Installation failed.'));
	console.log(pc.yellow('Please try manual installation instead:'));
	console.log(
		pc.cyan(
			'https://docs.cedarcopilot.com/getting-started/getting-started#install-manually'
		)
	);
	console.log(
		'\n' +
			pc.gray('Need help? ') +
			pc.cyan(
				'https://docs.cedarcopilot.com/getting-started/getting-started#troubleshooting'
			)
	);
}

// Main entry for the `plant-seed` command
export async function createCommand(opts: CreateOptions) {
	try {
		intro(pc.bgGreen(pc.black(' cedar plant-seed ')));

		const cwd = process.cwd();

		// -------------- STEP 1: Check for existing Next.js project --------------
		const inNext = isNextProject(cwd);

		if (inNext) {
			let shouldAddToExisting = true;

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
				console.log(
					pc.gray('Adding Cedar components to existing Next.js project...')
				);
				await runCedarAdd({ yes: opts.yes });
				outro(pc.green('Cedar components added successfully!'));
				return;
			} else {
				outro(pc.yellow('Operation cancelled. No changes made.'));
				return;
			}
		}

		// -------------- STEP 2: Ask for project name ----------
		let projectName = opts.projectName;
		if (!projectName) {
			if (opts.yes) {
				projectName = 'cedar-app';
			} else {
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

		// -------------- STEP 3: Template selection ----------
		let selectedTemplate: Template | null = null;

		if (!opts.yes) {
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

			const templateChoice = await select({
				message: 'Choose a project template:',
				options: templateOptions,
				initialValue: 'mastra',
			});

			if (isCancel(templateChoice)) {
				cancel('Operation cancelled.');
				process.exit(0);
			}

			if (templateChoice !== 'none') {
				selectedTemplate = TEMPLATES[templateChoice];
			}
		} else {
			// Default to Mastra template when using --yes flag
			selectedTemplate = TEMPLATES['mastra'];
		}

		// -------------- STEP 4: Create Next.js app ---------------------------
		console.log(
			pc.gray(
				`Creating ${
					selectedTemplate ? selectedTemplate.name : 'standard Next.js'
				} project...`
			)
		);

		try {
			if (selectedTemplate) {
				// Clone the selected template
				await runCommand('git', ['clone', selectedTemplate.url, projectName], {
					cwd,
				});

				// Remove .git directory to start fresh
				const projectDir = path.resolve(cwd, projectName);
				await runCommand('rm', ['-rf', '.git'], { cwd: projectDir });

				// Initialize new git repo
				await runCommand('git', ['init'], { cwd: projectDir });

				console.log(
					pc.green(`✅ ${selectedTemplate.name} template cloned successfully!`)
				);
			} else {
				// Create standard Next.js app - let Next.js handle all prompting
				await runCommand('npx', ['create-next-app@latest', projectName], {
					cwd,
				});
				console.log(pc.green('✅ Next.js app created successfully!'));
			}
		} catch (error) {
			console.error(pc.red('Failed to create Next.js project:'), error);
			showManualInstallation();
			process.exit(1);
		}

		// -------------- STEP 5: Change to project directory ----------
		const projectDir = path.resolve(cwd, projectName);
		process.chdir(projectDir);

		// -------------- STEP 6: Install Cedar components (if needed) --------------------
		if (!selectedTemplate || !selectedTemplate.includesCedar) {
			console.log(pc.gray('Installing Cedar components...'));

			try {
				await runCedarAdd({ yes: opts.yes });
			} catch (error) {
				console.error(pc.red('Failed to install Cedar components:'), error);
				showManualInstallation();
				process.exit(1);
			}
		} else {
			console.log(
				pc.green('✅ Cedar components already included in template!')
			);
		}

		// -------------- DONE -------------------------------------------------
		// Note: runCedarAdd already shows next steps, so we only show them for templates that include Cedar
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

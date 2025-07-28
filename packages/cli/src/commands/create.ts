import { intro, outro, text, confirm, cancel, isCancel } from '@clack/prompts';
import pc from 'picocolors';
import path from 'path';
import { spawn } from 'cross-spawn';
import { isNextProject, runCedarAdd } from '../cli-helpers';

export interface CreateOptions {
	projectName?: string;
	template?: string;
	yes?: boolean;
}

// Helper function to run shell commands
function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string } = {}
): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'inherit',
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

// Helper function to show manual installation fallback
function showManualInstallation() {
	console.log('\n' + pc.red('❌ Installation failed.'));
	console.log(pc.yellow('Please try manual installation instead:'));
	console.log(
		pc.cyan(
			'https://docs.cedarcopilot.com/getting-started/getting-started#install-manually'
		)
	);
}

// Main entry for the `create` command
export async function createCommand(opts: CreateOptions) {
	try {
		intro(pc.bgGreen(pc.black(' create-cedar ')));

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

		// -------------- STEP 3: Ask about Mastra template ----------
		let useMastra = true;

		if (!opts.yes) {
			const mastraChoice = await confirm({
				message: 'Start with a Mastra template (recommended)?',
				initialValue: true,
			});

			if (isCancel(mastraChoice)) {
				cancel('Operation cancelled.');
				process.exit(0);
			}

			useMastra = mastraChoice;
		}

		// -------------- STEP 4: Create Next.js app ---------------------------
		console.log(
			pc.gray(
				`Creating ${useMastra ? 'Mastra-based' : 'standard'} Next.js project...`
			)
		);

		try {
			if (useMastra) {
				// Clone the Mastra starter template
				await runCommand(
					'git',
					[
						'clone',
						'https://github.com/CedarCopilot/cedar-mastra-starter',
						projectName,
					],
					{ cwd }
				);

				// Remove .git directory to start fresh
				const projectDir = path.resolve(cwd, projectName);
				await runCommand('rm', ['-rf', '.git'], { cwd: projectDir });

				// Initialize new git repo
				await runCommand('git', ['init'], { cwd: projectDir });

				console.log(pc.green('✅ Mastra template cloned successfully!'));
			} else {
				// Create standard Next.js app
				await runCommand(
					'npx',
					[
						'create-next-app@latest',
						projectName,
						'--typescript',
						'--tailwind',
						'--eslint',
						'--app',
						'--src-dir',
						'--import-alias',
						'@/*',
					],
					{ cwd }
				);
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

		// -------------- STEP 6: Install Cedar components --------------------
		console.log(pc.gray('Installing Cedar components...'));

		try {
			await runCedarAdd({ yes: opts.yes });
		} catch (error) {
			console.error(pc.red('Failed to install Cedar components:'), error);
			showManualInstallation();
			process.exit(1);
		}

		// -------------- DONE -------------------------------------------------
		console.log('\n' + pc.bold('🎉 Success! Your Cedar project is ready.'));
		console.log('\n' + pc.bold('Next steps:'));
		console.log(
			pc.gray(`• Navigate to your project: ${pc.cyan(`cd ${projectName}`)}`)
		);
		console.log(
			pc.gray('• Add your API key: ') +
				pc.cyan(
					'https://docs.cedarcopilot.com/getting-started/getting-started#set-up-your-api-key'
				)
		);
		console.log(
			pc.gray(`• Start development server: ${pc.cyan('npm run dev')}`)
		);

		outro(pc.green('Happy coding! 🚀'));
	} catch (err) {
		console.error(pc.red('Something went wrong:'), err);
		showManualInstallation();
		process.exit(1);
	}
}

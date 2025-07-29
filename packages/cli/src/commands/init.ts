// ------------------------------------------------------------
// cedar-os init
// Installs/updates Cedar component files inside a project.
// ------------------------------------------------------------
// This file intentionally keeps ALL logic in one place so the
// create command can just call `initCommand`.  The only changes
// below are structural: helper functions + banner comments to
// make the flow easier to follow.
// ------------------------------------------------------------

import * as p from '@clack/prompts';
import { intro, outro, spinner, confirm, select, text } from '@clack/prompts';
import pc from 'picocolors';
import fetch from 'node-fetch';
import path from 'path';
import { spawn } from 'cross-spawn';
import fs from 'fs';
import { getAllComponents } from '../registry';
import {
	downloadMultipleComponents,
	createDirectory,
	checkDirectoryExists,
	GITHUB_BASE_URL,
} from '../utils/download';
import { spawnSync } from 'child_process';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Helper function to run shell commands
function runCommand(
	command: string,
	args: string[],
	options: { cwd?: string; silent?: boolean } = {}
): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: options.silent ? 'pipe' : 'inherit',
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
		return { manager: 'pnpm', installCmd: ['add'] };
	}

	if (fs.existsSync(path.join(cwd, 'yarn.lock'))) {
		return { manager: 'yarn', installCmd: ['add'] };
	}

	if (fs.existsSync(path.join(cwd, 'bun.lockb'))) {
		return { manager: 'bun', installCmd: ['add'] };
	}

	// Check if package managers are available in PATH
	try {
		spawnSync('pnpm', ['--version'], { stdio: 'ignore' });
		return { manager: 'pnpm', installCmd: ['add'] };
	} catch {}

	try {
		spawnSync('yarn', ['--version'], { stdio: 'ignore' });
		return { manager: 'yarn', installCmd: ['add'] };
	} catch {}

	try {
		spawnSync('bun', ['--version'], { stdio: 'ignore' });
		return { manager: 'bun', installCmd: ['add'] };
	} catch {}

	// Default to npm
	return { manager: 'npm', installCmd: ['install'] };
}

// -----------------------------
// Helper: print "next steps" link
// -----------------------------
function printNextSteps() {
	console.log('\n' + pc.bold('Next steps:'));
	console.log(
		pc.gray('• Resume the setup where you left off by adding your API key:')
	);
	console.log(
		pc.cyan(
			'https://docs.cedarcopilot.com/getting-started/getting-started#set-up-your-api-key'
		)
	);
}

export interface InitOptions {
	dir?: string;
	components?: string[];
	all?: boolean;
	yes?: boolean;
}

export async function initCommand(options: InitOptions) {
	intro(pc.bgCyan(pc.black(' cedar-os init ')));
	console.log(pc.green("Welcome to Cedar-OS, let's get you set up!"));
	console.log(
		pc.cyan('🌲 Planting your Cedar tree (downloading components)...')
	);

	try {
		const defaultDir = 'src/components/cedar-os';
		let targetDir = options.dir;

		// Ask for target directory if none provided
		if (!targetDir) {
			if (options.yes) {
				targetDir = defaultDir;
			} else {
				const useDefault = await confirm({
					message: `No installation directory provided. Use ${pc.cyan(
						defaultDir
					)}?`,
					initialValue: true,
				});

				if (p.isCancel(useDefault)) {
					p.cancel('Operation cancelled.');
					process.exit(0);
				}

				if (useDefault) {
					targetDir = defaultDir;
				} else {
					const customDir = await text({
						message: 'Enter installation directory:',
						placeholder: 'components/cedar-os',
						initialValue: 'components/cedar-os',
					});

					if (p.isCancel(customDir)) {
						p.cancel('Operation cancelled.');
						process.exit(0);
					}

					targetDir = customDir || 'components/cedar-os';
				}
			}
		}

		// Check if directory already exists
		const dirExists = await checkDirectoryExists(targetDir);
		if (dirExists && !options.yes) {
			const shouldContinue = await confirm({
				message: `Directory ${pc.cyan(targetDir)} already exists. Continue?`,
				initialValue: false,
			});

			if (p.isCancel(shouldContinue) || !shouldContinue) {
				p.cancel('Operation cancelled.');
				process.exit(0);
			}
		}

		// GITHUB_BASE_URL imported from utils

		// --------------------------------------------------
		// STEP 1  •  Determine which components to install
		// --------------------------------------------------
		let componentsToInstall = getAllComponents();

		if (dirExists) {
			const diffSpin = spinner();
			diffSpin.start(
				'🌱  Checking the Cedar tree for component updates (this might take a moment)...'
			);
			const freshList: typeof componentsToInstall = [];
			const updatedComponents: typeof componentsToInstall = [];

			for (const component of componentsToInstall) {
				// check if any file differs or missing
				let changed = false;
				let missing = false;
				for (const file of component.files) {
					const localPath = path.join(targetDir, component.category, file);
					try {
						const localContent = await fs.promises.readFile(localPath, 'utf-8');
						const remoteUrl = `${GITHUB_BASE_URL}/${component.category}/${file}`;
						const remoteRes = await fetch(remoteUrl);
						const remoteContent = await remoteRes.text();
						if (localContent !== remoteContent) {
							changed = true; // existing file differs
						}
					} catch {
						missing = true; // file not found locally
					}
				}
				if (changed) {
					updatedComponents.push(component);
				} else if (missing) {
					freshList.push(component);
				}
			}

			// Prompt user about overwrites if any
			diffSpin.stop('Done inspecting components!');
			if (updatedComponents.length > 0 && !options.yes) {
				const decision = await select({
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

				if (decision === 'none') {
					updatedComponents.length = 0;
				} else if (decision === 'each') {
					const chosen: typeof componentsToInstall = [];
					for (const comp of updatedComponents) {
						const ow = await confirm({
							message: `Overwrite ${comp.name}? (y/N)`,
							initialValue: true,
						});

						if (p.isCancel(ow)) {
							p.cancel('Operation cancelled.');
							process.exit(0);
						}
						if (ow) chosen.push(comp);
					}
					updatedComponents.splice(0, updatedComponents.length, ...chosen);
				}
			}

			componentsToInstall = [...freshList, ...updatedComponents];
		}

		if (componentsToInstall.length === 0) {
			outro(pc.green("No new components to install. You're all set :)"));
			return;
		}

		// --------------------------------------------------
		// STEP 2  •  Ask for component dependencies approval
		// --------------------------------------------------
		const { manager, installCmd } = detectPackageManager();
		const componentDeps = ['lucide-react', 'motion-plus-react'];

		if (!options.yes) {
			const installDeps = await confirm({
				message: `Cedar components require ${pc.cyan(
					'lucide-react'
				)} and ${pc.cyan(
					'motion-plus-react'
				)}. Install these dependencies using ${manager}?`,
				initialValue: true,
			});

			if (p.isCancel(installDeps)) {
				p.cancel('Operation cancelled.');
				process.exit(0);
			}

			if (installDeps) {
				const depInstallSpin = spinner();
				depInstallSpin.start(
					`📦 Installing component dependencies using ${manager}...`
				);

				try {
					await runCommand(manager, [...installCmd, ...componentDeps], {
						silent: true,
					});
					depInstallSpin.stop(
						'✅ Component dependencies installed successfully!'
					);
				} catch {
					depInstallSpin.stop('❌ Failed to install component dependencies.');
					console.log(
						pc.yellow(
							'\nWarning: Failed to install component dependencies automatically.'
						)
					);
					console.log(pc.gray('You can install them manually by running:'));
					console.log(
						pc.cyan(
							`  ${manager} ${installCmd.join(' ')} ${componentDeps.join(' ')}`
						)
					);
					console.log(
						pc.gray(
							'Components may not work properly without these dependencies.'
						)
					);
				}
			} else {
				console.log(pc.yellow('⚠️  Skipping dependency installation.'));
				console.log(pc.gray('Remember to install these manually:'));
				console.log(
					pc.cyan(
						`  ${manager} ${installCmd.join(' ')} ${componentDeps.join(' ')}`
					)
				);
			}
		} else {
			// Auto-install dependencies when using --yes flag
			const depInstallSpin = spinner();
			depInstallSpin.start(
				`📦 Installing component dependencies using ${manager}...`
			);

			try {
				await runCommand(manager, [...installCmd, ...componentDeps], {
					silent: true,
				});
				depInstallSpin.stop(
					'✅ Component dependencies installed successfully!'
				);
			} catch {
				depInstallSpin.stop('❌ Failed to install component dependencies.');
				console.log(
					pc.yellow(
						'\nWarning: Failed to install component dependencies automatically.'
					)
				);
				console.log(pc.gray('You can install them manually by running:'));
				console.log(
					pc.cyan(
						`  ${manager} ${installCmd.join(' ')} ${componentDeps.join(' ')}`
					)
				);
			}
		}

		// --------------------------------------------------
		// STEP 3  •  Create directory and download components
		// --------------------------------------------------
		const s = spinner();
		if (!dirExists) {
			s.start('Creating directory...');
			await createDirectory(targetDir);
			await wait(2000);
			s.stop('Directory created.');
		}

		// Download components
		s.start(`Downloading ${componentsToInstall.length} components...`);
		try {
			await downloadMultipleComponents(componentsToInstall, targetDir);
			await wait(2000);
			s.stop('Components downloaded successfully.');

			// Success banner right after download
			console.log(
				pc.green(
					`✅ Successfully installed ${
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

		// --------------------------------------------------
		// STEP 4  •  Install cedar-os package
		// --------------------------------------------------
		const depSpin = spinner();
		depSpin.start(
			`📦  Installing cedar-os and its dependencies using ${manager}...`
		);

		try {
			await runCommand(manager, [...installCmd, 'cedar-os'], { silent: true });
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

		// Final tip
		printNextSteps();
	} catch (err) {
		p.cancel(
			`Something went wrong$${err instanceof Error ? ': ' + err.message : ''}`
		);
	}
}

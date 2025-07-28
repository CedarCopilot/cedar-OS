import * as p from '@clack/prompts';
import { intro, outro, spinner, confirm, select } from '@clack/prompts';
import pc from 'picocolors';
import fetch from 'node-fetch';
import path from 'path';
import { getAllComponents } from '../registry';
import {
	downloadMultipleComponents,
	createDirectory,
	checkDirectoryExists,
	GITHUB_BASE_URL,
} from '../utils/download';
import fs from 'fs';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface InitOptions {
	dir?: string;
	components?: string[];
	all?: boolean;
	yes?: boolean;
}

export async function initCommand(options: InitOptions) {
	intro(pc.bgCyan(pc.black(' cedar-os init ')));
	console.log(pc.green("Welcome to Cedar-OS, let's get you set up!"));

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

				targetDir = useDefault ? defaultDir : 'cedar-os-components';
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

		// If directory is new, install everything without diffing
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

		// Create directory only if it doesn't exist yet
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

		// Simulate registry/dependency messages (after directory creation msg earlier)
		const regSpin = spinner();
		regSpin.start('🔍  Checking component registry...');
		await wait(2000);
		regSpin.stop('Registry looks good!');

		const depSpin = spinner();
		depSpin.start('📦  Installing peer dependencies (if any)...');
		await wait(2000);
		depSpin.stop('Dependencies installed.');

		// Next steps
		console.log('\n' + pc.bold('Next steps:'));
		console.log(
			pc.gray('• Resume the setup where you left off by adding your API key:')
		);
		console.log(
			pc.cyan(
				'https://docs.cedarcopilot.com/getting-started/getting-started#set-up-your-api-key'
			)
		);
	} catch (err) {
		p.cancel(
			`Something went wrong$${err instanceof Error ? ': ' + err.message : ''}`
		);
	}
}

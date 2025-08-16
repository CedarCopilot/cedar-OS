// packages/cli/src/utils/tailwindSetup.ts
// --------------------------------------------------
// Tailwind CSS detection and setup utilities
// --------------------------------------------------

import { promises as fs } from 'fs';
import path from 'path';
import * as p from '@clack/prompts';
import { spinner, confirm } from '@clack/prompts';
import pc from 'picocolors';
import { detectPackageManager } from './detectPackageManager';
import { runCommand } from './runCommand';

interface TailwindConfig {
	hasTailwind: boolean;
	hasConfig: boolean;
	configPath?: string;
}

// Check if Tailwind CSS is installed in the project
export async function detectTailwindCSS(): Promise<TailwindConfig> {
	try {
		// Check package.json for tailwindcss dependency
		const packageJsonPath = path.join(process.cwd(), 'package.json');
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

		const deps = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		const hasTailwind = 'tailwindcss' in deps;

		// Check for Tailwind config file
		const possibleConfigs = [
			'tailwind.config.js',
			'tailwind.config.ts',
			'tailwind.config.mjs',
			'tailwind.config.cjs',
		];

		let configPath: string | undefined;
		for (const configName of possibleConfigs) {
			const fullPath = path.join(process.cwd(), configName);
			try {
				await fs.access(fullPath);
				configPath = configName;
				break;
			} catch {
				// File doesn't exist, continue checking
			}
		}

		return {
			hasTailwind,
			hasConfig: !!configPath,
			configPath,
		};
	} catch (error) {
		// If we can't read package.json, assume no Tailwind
		return {
			hasTailwind: false,
			hasConfig: false,
		};
	}
}

// Install Tailwind CSS and its peer dependencies
export async function installTailwindCSS(): Promise<boolean> {
	const { manager, installCmd } = detectPackageManager();
	const devFlag = manager === 'npm' ? '--save-dev' : '-D';

	const deps = ['tailwindcss', 'postcss', 'autoprefixer'];

	const installSpin = spinner();
	installSpin.start(`Installing Tailwind CSS using ${manager}...`);

	try {
		await runCommand(manager, [...installCmd, devFlag, ...deps], {
			stdio: 'ignore',
		});
		installSpin.stop('✅ Tailwind CSS installed successfully!');
		return true;
	} catch (error) {
		installSpin.stop('❌ Failed to install Tailwind CSS');
		console.error(pc.red('Error installing Tailwind CSS:'), error);
		return false;
	}
}

// Initialize Tailwind configuration
export async function initializeTailwindConfig(): Promise<boolean> {
	const { manager } = detectPackageManager();
	const runCmd = manager === 'npm' ? 'npx' : manager;

	const initSpin = spinner();
	initSpin.start('Initializing Tailwind CSS configuration...');

	try {
		await runCommand(runCmd, ['tailwindcss', 'init', '-p'], {
			stdio: 'ignore',
		});
		initSpin.stop('✅ Tailwind configuration created!');
		return true;
	} catch (error) {
		initSpin.stop('❌ Failed to initialize Tailwind configuration');
		console.error(pc.red('Error initializing Tailwind:'), error);
		return false;
	}
}

// Update Tailwind config to include Cedar component paths
export async function updateTailwindConfig(
	componentDir: string
): Promise<void> {
	const tailwindInfo = await detectTailwindCSS();

	if (!tailwindInfo.configPath) {
		console.log(pc.yellow('⚠️  No Tailwind config file found to update.'));
		return;
	}

	try {
		const configPath = path.join(process.cwd(), tailwindInfo.configPath);
		let configContent = await fs.readFile(configPath, 'utf-8');

		// Add Cedar component paths to content array
		const cedarPaths = `\n    './${componentDir}/**/*.{js,ts,jsx,tsx}',`;

		// Try to find the content array and add our paths
		if (configContent.includes('content:')) {
			// Check if our path is already there
			if (!configContent.includes(componentDir)) {
				// Find content array and add our path
				configContent = configContent.replace(
					/(content:\s*\[)/,
					`$1${cedarPaths}`
				);

				await fs.writeFile(configPath, configContent, 'utf-8');
				console.log(
					pc.green(
						`✅ Updated ${tailwindInfo.configPath} to include Cedar components`
					)
				);
			}
		} else {
			console.log(
				pc.yellow('⚠️  Could not find content array in Tailwind config.')
			);
			console.log(
				pc.gray(`   Please add the following to your content array:`)
			);
			console.log(pc.cyan(`   './${componentDir}/**/*.{js,ts,jsx,tsx}'`));
		}
	} catch (error) {
		console.log(
			pc.yellow('⚠️  Could not update Tailwind config automatically.')
		);
		console.log(
			pc.gray(
				`   Please add the following to your content array in ${tailwindInfo.configPath}:`
			)
		);
		console.log(pc.cyan(`   './${componentDir}/**/*.{js,ts,jsx,tsx}'`));
	}
}

// Main function to handle Tailwind setup
export async function ensureTailwindSetup(componentDir: string): Promise<void> {
	console.log(pc.blue('\n🎨 Checking Tailwind CSS setup...'));

	const tailwindInfo = await detectTailwindCSS();

	if (!tailwindInfo.hasTailwind) {
		console.log(
			pc.yellow('\n⚠️  Tailwind CSS is required for Cedar components.')
		);

		const shouldInstall = await confirm({
			message: 'Would you like to install Tailwind CSS now?',
			initialValue: true,
		});

		if (p.isCancel(shouldInstall)) {
			p.cancel('Operation cancelled.');
			process.exit(0);
		}

		if (!shouldInstall) {
			console.log(
				pc.red('\n❌ Cedar components require Tailwind CSS to work properly.')
			);
			console.log(pc.gray('   Please install it manually:'));
			const { manager } = detectPackageManager();
			const devFlag = manager === 'npm' ? '--save-dev' : '-D';
			console.log(
				pc.cyan(
					`   ${manager} ${
						manager === 'npm' ? 'install' : 'add'
					} ${devFlag} tailwindcss postcss autoprefixer`
				)
			);
			console.log(pc.cyan(`   npx tailwindcss init -p`));
			console.log(
				pc.gray(
					'\n   Then add Cedar components to your tailwind.config.js content array:'
				)
			);
			console.log(pc.cyan(`   './${componentDir}/**/*.{js,ts,jsx,tsx}'`));
			process.exit(1);
		}

		// Install Tailwind
		const installed = await installTailwindCSS();
		if (!installed) {
			process.exit(1);
		}

		// Initialize config if it doesn't exist
		if (!tailwindInfo.hasConfig) {
			const initialized = await initializeTailwindConfig();
			if (!initialized) {
				console.log(
					pc.yellow('⚠️  Please run "npx tailwindcss init -p" manually.')
				);
			}
		}

		// Update config to include Cedar paths
		await updateTailwindConfig(componentDir);

		// Show CSS import instructions
		console.log(pc.green('\n✅ Tailwind CSS setup complete!'));
		console.log(
			pc.gray('\n   Make sure to import Tailwind CSS in your global CSS file:')
		);
		console.log(pc.cyan('   @tailwind base;'));
		console.log(pc.cyan('   @tailwind components;'));
		console.log(pc.cyan('   @tailwind utilities;'));
	} else {
		console.log(pc.green('✅ Tailwind CSS detected'));

		// Update config to include Cedar paths
		await updateTailwindConfig(componentDir);
	}
}

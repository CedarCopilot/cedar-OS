// packages/cli/src/cli-helpers.ts
// --------------------------------------------------
// Shared helper utilities for the create-cedar CLI.
// --------------------------------------------------

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { spinner } from '@clack/prompts';
import pc from 'picocolors';
import { initCommand, InitOptions } from './commands/init';
import { spawn } from 'cross-spawn';

// ---------------------------------------------
// Detect if the current directory is a Next.js
// project by looking for next.config.js OR the
// next dependency in package.json.
// ---------------------------------------------
export function isNextProject(cwd: string = process.cwd()): boolean {
	if (existsSync(path.join(cwd, 'next.config.js'))) return true;
	try {
		const pkg = JSON.parse(
			readFileSync(path.join(cwd, 'package.json'), 'utf8')
		);
		return (
			pkg.dependencies?.next !== undefined ||
			pkg.devDependencies?.next !== undefined
		);
	} catch {
		return false;
	}
}

// Detect package manager: pnpm > yarn > npm
function detectPM(cwd: string): 'pnpm' | 'yarn' | 'npm' {
	if (existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
	if (existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
	return 'npm';
}

export async function runCreateNextApp({
	projectName,
	yes,
}: {
	projectName: string;
	yes?: boolean;
}): Promise<void> {
	const pm = detectPM(process.cwd());
	const EXAMPLE_URL = 'https://github.com/CedarCopilot/cedar-mastra-starter';
	const args: string[] = [projectName, '-e', EXAMPLE_URL];

	if (yes) {
		args.push('--typescript', '--eslint');
		if (pm === 'npm') args.push('--use-npm');
	}

	const spin = spinner();
	spin.start('(1/2) Launching create-next-app with Cedar starter…');
	// Stop spinner so user sees CNA progress/questions clearly
	spin.stop(
		'(1/2) Handing control to create-next-app – follow the prompts below:'
	);

	return new Promise<void>((resolve, reject) => {
		const child = spawn(
			'sh',
			['-c', `npx create-next-app@latest ${args.join(' ')}`],
			{
				stdio: 'inherit',
			}
		);

		child.on('error', (error) => {
			console.log(pc.red('✗ Failed to create Cedar starter project.'));
			reject(error);
		});

		child.on('close', (code) => {
			if (code === 0) {
				console.log(pc.green('✓ Cedar starter project created.'));
				resolve();
			} else {
				console.log(
					pc.red(
						`✗ Failed to create Cedar starter project. Process exited with code ${code}`
					)
				);
				reject(new Error(`create-next-app exited with code ${code}`));
			}
		});
	});
}

// ---------------------------------------------
// Run the Cedar component installer (init).
// We call the existing initCommand so the
// logic stays in one place.
// ---------------------------------------------
export async function runCedarAdd(opts: InitOptions): Promise<void> {
	await initCommand(opts);
}

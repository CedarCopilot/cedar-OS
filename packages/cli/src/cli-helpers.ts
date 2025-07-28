// packages/cli/src/cli-helpers.ts
// --------------------------------------------------
// Shared helper utilities for the create-cedar CLI.
// --------------------------------------------------

import { existsSync, promises as fs, readFileSync } from 'fs';
import path from 'path';
import { spinner } from '@clack/prompts';
import pc from 'picocolors';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
import { initCommand, InitOptions } from './commands/init';

const exec = promisify(execCb);

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

// ---------------------------------------------
// Wrapper around `create-next-app`. When `yes`
// is true we pass non-interactive flags so the
// call is completely automated. Otherwise we
// let CNA show its own interactive wizard.
// ---------------------------------------------
export async function runCreateNextApp({
	projectName,
	yes,
}: {
	projectName: string;
	yes?: boolean;
}): Promise<void> {
	const cnaFlags = yes
		? '--ts --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm --no-src --no-color'
		: '';

	const cmd = `npx create-next-app@latest ${projectName} ${cnaFlags}`;
	const spin = spinner();
	spin.start(`(1/3) Creating Next.js project ${pc.cyan(projectName)}…`);
	await exec(cmd);
	spin.stop('Next.js project created.');
}

// ---------------------------------------------
// Copy a template (app/ + mastra/) into the
// target project directory.
// ---------------------------------------------
export async function copyTemplate({
	templateName,
	dest,
}: {
	templateName: string;
	dest: string;
}): Promise<void> {
	const templateRoot = path.resolve(__dirname, '../app/examples', templateName);
	const spin = spinner();
	spin.start(`(2/3) Copying ${templateName} template…`);
	await fs.cp(path.join(templateRoot, 'app'), path.join(dest, 'app'), {
		recursive: true,
	});
	await fs.cp(path.join(templateRoot, 'mastra'), path.join(dest, 'mastra'), {
		recursive: true,
	});
	spin.stop('Template copied.');
}

// ---------------------------------------------
// Run the Cedar component installer (init).
// We call the existing initCommand so the
// logic stays in one place.
// ---------------------------------------------
export async function runCedarAdd(opts: InitOptions): Promise<void> {
	await initCommand(opts);
}

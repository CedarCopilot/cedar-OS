// packages/cli/src/cli-helpers.ts
// --------------------------------------------------
// Shared helper utilities for the create-cedar CLI.
// --------------------------------------------------

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { addSaplingCommand, AddSaplingOptions } from './commands/add-sapling';

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
// Detect if the current directory is a React
// project (non-Next.js) by looking for react
// dependency in package.json.
// ---------------------------------------------
export function isReactProject(cwd: string = process.cwd()): boolean {
	try {
		const pkg = JSON.parse(
			readFileSync(path.join(cwd, 'package.json'), 'utf8')
		);
		return (
			(pkg.dependencies?.react !== undefined ||
				pkg.devDependencies?.react !== undefined) &&
			// Exclude Next.js projects (already handled separately)
			pkg.dependencies?.next === undefined &&
			pkg.devDependencies?.next === undefined
		);
	} catch {
		return false;
	}
}

// ---------------------------------------------
// Run the Cedar component installer (init).
// We call the existing add-sapling so the
// logic stays in one place.
// ---------------------------------------------
export async function runCedarAdd(opts: AddSaplingOptions): Promise<void> {
	await addSaplingCommand(opts);
}

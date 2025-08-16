import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';

// Helper function to detect package manager
export function detectPackageManager(): {
	manager: string;
	installCmd: string[];
} {
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

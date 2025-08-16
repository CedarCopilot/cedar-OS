import { spawn } from 'child_process';

// Helper function to run shell commands
export function runCommand(
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

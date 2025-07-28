import { intro, outro, text } from '@clack/prompts';
import pc from 'picocolors';
import path from 'path';
import { isNextProject, runCreateNextApp, runCedarAdd } from '../cli-helpers';

export interface CreateOptions {
	projectName?: string;
	template?: string;
	yes?: boolean;
}

// Main entry for the `create` command
export async function createCommand(opts: CreateOptions) {
	try {
		intro(pc.bgGreen(pc.black(' create-cedar ')));

		const cwd = process.cwd();

		// -------------- STEP 0: Detect existing Next.js project --------------
		const inNext = isNextProject(cwd);

		if (inNext) {
			console.log(
				pc.gray(
					'Next.js project detected – proceeding to add Cedar components...'
				)
			);
			await runCedarAdd({ yes: opts.yes });
			outro(pc.green('All done!'));
			return;
		}

		// -------------- STEP 1: Ask (or use flag) for project name ----------
		let projectName = opts.projectName;
		if (!projectName) {
			if (opts.yes) projectName = 'cedar-app';
			else {
				projectName = (await text({
					message: 'Project name:',
					placeholder: 'cedar-app',
					initialValue: 'cedar-app',
				})) as string;
				if (!projectName) projectName = 'cedar-app';
			}
		}

		// -------------- STEP 2: Create Next.js app ---------------------------
		await runCreateNextApp({ projectName, yes: opts.yes });

		// change CWD into the new project before further steps
		const projectDir = path.resolve(cwd, projectName);
		process.chdir(projectDir);

		// -------------- STEP 3: Install Cedar components --------------------
		await runCedarAdd({ yes: opts.yes });

		// -------------- DONE -------------------------------------------------
		console.log('\n' + pc.bold('Next steps:'));
		console.log(
			pc.gray('• Resume the setup where you left off by adding your API key:')
		);
		console.log(
			pc.cyan(
				'https://docs.cedarcopilot.com/getting-started/getting-started#set-up-your-api-key'
			)
		);

		outro(pc.green('Cedar project ready!'));
	} catch (err) {
		console.error(pc.red('Something went wrong:'), err);
		process.exit(1);
	}
}

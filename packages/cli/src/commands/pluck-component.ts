// packages/cli/src/commands/pluck-component.ts
// --------------------------------------------------
// PLUCK-COMPONENT COMMAND IMPLEMENTATION
// Downloads specific Cedar components locally from an npm installation
// --------------------------------------------------

import * as p from '@clack/prompts';
import { intro, outro } from '@clack/prompts';
import pc from 'picocolors';
import {
	downloadComponentsFlow,
	showLocalImportSteps,
	type ComponentDownloadOptions,
} from '../utils/downloadComponents';

export interface PluckComponentOptions {
	dir?: string;
	components?: string[];
	all?: boolean;
	yes?: boolean;
}

// Main pluck-component command function
export async function pluckComponentCommand(options: PluckComponentOptions) {
	intro(pc.bgMagenta(pc.black(' cedar pluck-component ')));
	console.log(pc.green('Pluck components from cedar-os-components package!'));
	console.log(
		pc.cyan('🌿 Download specific components locally for full customization...')
	);

	try {
		// Use the shared download components flow
		const result = await downloadComponentsFlow(
			options as ComponentDownloadOptions,
			{
				promptMessage: 'Which components would you like to download locally?',
				skipDependencyInstall: true, // Don't auto-install npm deps for pluck
			}
		);

		// Show next steps
		showLocalImportSteps(result.componentsInstalled, result.targetDirectory);

		if (result.npmDependencies.length > 0) {
			console.log(
				'\n' +
					pc.yellow("⚠️  Don't forget to install the required dependencies:")
			);
			console.log(
				pc.gray('   npm install ' + result.npmDependencies.join(' '))
			);
		}

		outro(pc.green('Happy coding! 🚀'));
	} catch (err) {
		p.cancel(
			`Something went wrong${err instanceof Error ? ': ' + err.message : ''}`
		);
		process.exit(1);
	}
}

// packages/cli/src/index.ts
// --------------------------------------------------
// Main entry point for the Cedar-OS CLI
// Defines all available commands and their options
// --------------------------------------------------

import { Command } from 'commander';
import { addSaplingCommand } from './commands/add-sapling';
import { plantSeedCommand } from './commands/plant-seed';
import { pluckComponentCommand } from './commands/pluck-component';

const program = new Command();

// Configure the main CLI program
program
	.name('cedar')
	.description('Create or add Cedar-OS to a project')
	.version('0.1.0');

// ADD-SAPLING COMMAND
// For adding Cedar components to existing projects
// Use this when you want granular control over component installation
program
	.command('add-sapling')
	.description('Add Cedar-OS components and package to your existing project')
	.option(
		'-d, --dir <path>',
		'Installation directory (default: src/cedar/components)'
	)
	.option(
		'-c, --components <names...>',
		'Specific components to install (interactive selection if not provided)'
	)
	.option('-a, --all', 'Install all available components')
	.option(
		'-y, --yes',
		'Skip confirmation prompts and auto-install dependencies'
	)
	.action(addSaplingCommand);

// PLANT-SEED COMMAND (RECOMMENDED)
// Smart command that detects your setup and does the right thing
// - New project: Offers template selection → Creates project → Adds Cedar
// - Existing Next.js: Automatically adds Cedar components
// - Non-Next.js: Guides you to create Next.js first
program
	.command('plant-seed')
	.description(
		'Create new Cedar-OS project or add Cedar to existing Next.js project (recommended)'
	)
	.option(
		'-p, --project-name <name>',
		'Project directory name (prompts if not provided)'
	)
	.option(
		'-y, --yes',
		'Skip all prompts and use defaults (Mastra template for new projects)'
	)
	.action(plantSeedCommand);

// PLUCK-COMPONENT COMMAND
// For downloading specific components from an npm installation
// Use this when you've installed cedar-os-components from npm but want to customize specific components
program
	.command('pluck-component')
	.description(
		'Download specific Cedar components locally from cedar-os-components package'
	)
	.option(
		'-d, --dir <path>',
		'Installation directory (default: src/cedar/components)'
	)
	.option(
		'-c, --components <names...>',
		'Specific components to download (interactive selection if not provided)'
	)
	.option('-a, --all', 'Download all available components')
	.option('-y, --yes', 'Skip confirmation prompts')
	.action(pluckComponentCommand);

// DEFAULT BEHAVIOR
// If user runs 'cedar' without any subcommand, default to plant-seed
// This makes the CLI user-friendly for new users
if (!process.argv.slice(2).length) {
	plantSeedCommand({});
} else {
	program.parse();
}

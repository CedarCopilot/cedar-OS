import { Command } from 'commander';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';

const program = new Command();

program
	.name('create-cedar')
	.description('Create or add Cedar-OS to a project')
	.version('0.0.1');

program
	.command('init')
	.description('Initialize cedar-os components in your project')
	.option('-d, --dir <path>', 'Installation directory')
	.option('-c, --components <names...>', 'Specific components to install')
	.option('-a, --all', 'Install all components')
	.option('-y, --yes', 'Skip confirmation prompts')
	.action(initCommand);

program
	.command('create')
	.description('Scaffold a new Cedar-OS Next.js project or add to existing')
	.option('-p, --project-name <name>', 'Project directory name')
	.option('-y, --yes', 'Skip all prompts')
	.action(createCommand);

// If user runs without subcommand default to create
if (!process.argv.slice(2).length) {
	createCommand({});
} else {
	program.parse();
}

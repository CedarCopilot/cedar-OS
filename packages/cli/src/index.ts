import { Command } from 'commander';
import { initCommand } from './commands/init';

const program = new Command();

program
	.name('cedar-os')
	.description('CLI for installing cedar-os components')
	.version('0.0.1');

program
	.command('init')
	.description('Initialize cedar-os components in your project')
	.option('-d, --dir <path>', 'Installation directory')
	.option('-c, --components <names...>', 'Specific components to install')
	.option('-a, --all', 'Install all components')
	.option('-y, --yes', 'Skip confirmation prompts')
	.action(initCommand);

program.parse();

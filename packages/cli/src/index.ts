import { Command } from 'commander';
import { initCommand } from './commands/init';
import { createCommand } from './commands/create';

const program = new Command();

program
	.name('cedar')
	.description('Create or add Cedar-OS to a project')
	.version('0.1.0');

program
	.command('add-sapling')
	.description('Add Cedar-OS components and package to your existing project')
	.option('-d, --dir <path>', 'Installation directory')
	.option('-c, --components <names...>', 'Specific components to install')
	.option('-a, --all', 'Install all components')
	.option('-y, --yes', 'Skip confirmation prompts')
	.action(initCommand);

program
	.command('plant-seed')
	.description('Create new Cedar-OS project or add Cedar to existing Next.js project')
	.option('-p, --project-name <name>', 'Project directory name')
	.option('-y, --yes', 'Skip all prompts')
	.action(createCommand);

// If user runs without subcommand default to plant-seed
if (!process.argv.slice(2).length) {
	createCommand({});
} else {
	program.parse();
}

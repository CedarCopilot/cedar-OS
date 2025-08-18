// packages/cli/src/utils/downloadComponents/index.ts
// --------------------------------------------------
// Central export for all component download utilities
// --------------------------------------------------

// Main orchestrator
export {
	downloadComponentsFlow,
	type ComponentDownloadOptions,
	type DownloadResult,
} from './orchestrator';

// Registry and component info
export {
	getAllComponents,
	getComponent,
	getComponentsByCategory,
	collectDependencies,
	getCategories,
	resolveComponentDependencies,
	type ComponentInfo,
	type ComponentRegistryEntry,
} from './registry';

// Download utilities
export {
	downloadComponent,
	downloadMultipleComponents,
	checkDirectoryExists,
	createDirectory,
	GITHUB_BASE_URL,
} from './downloader';

// User interaction utilities
export {
	selectComponents,
	checkExistingComponents,
	promptForDirectory,
	showInstallationSummary,
	showLocalImportSteps,
} from './prompts';

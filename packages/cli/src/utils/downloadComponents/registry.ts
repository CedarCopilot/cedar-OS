// packages/cli/src/utils/downloadComponents/registry.ts
// --------------------------------------------------
// Component registry and dependency management
// Handles fetching component metadata and resolving dependencies
// --------------------------------------------------

import fetch from 'node-fetch';

// Match the registry structure from cedar-os-components
export interface ComponentRegistryEntry {
	name: string;
	type:
		| 'chatComponents'
		| 'chatInput'
		| 'chatMessages'
		| 'containers'
		| 'inputs'
		| 'ornaments'
		| 'structural'
		| 'text'
		| 'ui'
		| 'diffs'
		| 'spells'
		| 'voice'
		| 'threads'
		| 'debugger'
		| 'CommandBar';
	dependencies?: string[];
	registryDependencies?: string[]; // Other cedar components this component depends on
	files: string[];
	meta: {
		importName: string;
		displayName: string;
		description: string;
	};
}

export interface ComponentInfo {
	name: string;
	category: string;
	description: string;
	files: string[];
	dependencies?: string[];
	registryDependencies?: string[]; // Other cedar components this component depends on
	importName: string;
	displayName: string;
}

const REGISTRY_URL =
	'https://raw.githubusercontent.com/CedarCopilot/cedar-OS/main/packages/cedar-os-components/registry.json';

// Cache for registry data
let registryCache: ComponentRegistryEntry[] | null = null;

async function fetchRegistry(): Promise<ComponentRegistryEntry[]> {
	if (registryCache) {
		return registryCache;
	}

	try {
		const response = await fetch(REGISTRY_URL);
		if (!response.ok) {
			throw new Error(`Failed to fetch registry: ${response.statusText}`);
		}

		const registryData = (await response.json()) as {
			components?: ComponentRegistryEntry[];
		};

		// Extract the components array from the JSON structure
		if (!registryData.components || !Array.isArray(registryData.components)) {
			throw new Error('Invalid registry format: missing components array');
		}

		const registryArray = registryData.components;
		registryCache = registryArray;
		return registryArray;
	} catch (error) {
		console.error('Failed to fetch remote registry:', error);
		throw new Error(
			'Could not load component registry. Please check your internet connection.'
		);
	}
}

// Helper function to get file path based on component type
function getFilePath(
	type: ComponentRegistryEntry['type'],
	fileName: string
): string {
	const typeMap: Record<ComponentRegistryEntry['type'], string> = {
		chatComponents: 'chatComponents',
		chatInput: 'chatInput',
		chatMessages: 'chatMessages',
		containers: 'containers',
		inputs: 'inputs',
		ornaments: 'ornaments',
		structural: 'structural',
		text: 'text',
		ui: 'ui',
		diffs: 'diffs',
		spells: 'spells',
		voice: 'voice',
		threads: 'threads',
		debugger: 'debugger',
		CommandBar: 'CommandBar',
	};

	return `${typeMap[type]}/${fileName}`;
}

// Convert registry entry to our ComponentInfo format
function registryEntryToComponentInfo(
	entry: ComponentRegistryEntry
): ComponentInfo {
	return {
		name: entry.name,
		category: entry.type,
		description: entry.meta.description,
		files: entry.files.map((file) => getFilePath(entry.type, file)),
		dependencies: entry.dependencies,
		registryDependencies: entry.registryDependencies,
		importName: entry.meta.importName,
		displayName: entry.meta.displayName,
	};
}

export async function getAllComponents(): Promise<ComponentInfo[]> {
	const registry = await fetchRegistry();
	return registry.map(registryEntryToComponentInfo);
}

export async function getComponent(
	name: string
): Promise<ComponentInfo | undefined> {
	const registry = await fetchRegistry();
	const entry = registry.find((component) => component.name === name);
	return entry ? registryEntryToComponentInfo(entry) : undefined;
}

export async function getComponentsByCategory(
	category: string
): Promise<ComponentInfo[]> {
	const registry = await fetchRegistry();
	return registry
		.filter((entry) => entry.type === category)
		.map(registryEntryToComponentInfo);
}

// Collect all unique dependencies from selected components
export async function collectDependencies(
	componentNames: string[]
): Promise<string[]> {
	const registry = await fetchRegistry();
	const dependencies = new Set<string>();

	for (const name of componentNames) {
		const component = registry.find((c) => c.name === name);
		if (component && component.dependencies) {
			component.dependencies.forEach((dep) => dependencies.add(dep));
		}
	}

	return Array.from(dependencies);
}

// Get all categories with their display names
export async function getCategories(): Promise<Record<string, string>> {
	return {
		chatComponents: 'Chat Components',
		chatInput: 'Chat Input Components',
		chatMessages: 'Chat Message Components',
		containers: 'Container Components',
		inputs: 'Input Components',
		ornaments: 'Ornament Components',
		structural: 'Structural Components',
		text: 'Text Components',
		ui: 'UI Components',
		diffs: 'Diff Components',
		spells: 'Spell Components',
		voice: 'Voice Components',
		threads: 'Thread Components',
		debugger: 'Debugger Components',
		CommandBar: 'Command Bar Components',
	};
}

// Recursively resolve all component dependencies
export async function resolveComponentDependencies(
	componentNames: string[]
): Promise<string[]> {
	const registry = await fetchRegistry();
	const resolved = new Set<string>();
	const toResolve = [...componentNames];

	while (toResolve.length > 0) {
		const current = toResolve.pop()!;
		if (resolved.has(current)) continue;

		resolved.add(current);

		const component = registry.find((c) => c.name === current);
		if (component?.registryDependencies) {
			for (const dep of component.registryDependencies) {
				if (!resolved.has(dep) && dep !== 'cedar-os') {
					toResolve.push(dep);
				}
			}
		}
	}

	return Array.from(resolved);
}

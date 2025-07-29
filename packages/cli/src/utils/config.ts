import { promises as fs } from 'fs';
import path from 'path';
import { ComponentInfo } from './registry';

// Local copy of ProviderConfig to avoid cross-package imports
export type ProviderConfig =
	| { provider: 'openai'; apiKey: string }
	| { provider: 'anthropic'; apiKey: string }
	| { provider: 'mastra'; apiKey?: string; baseURL: string }
	| { provider: 'ai-sdk'; providers: Record<string, { apiKey: string }> }
	| { provider: 'custom'; config: Record<string, unknown> };

export interface CedarConfig {
	version: string;
	componentsDir: string;
	provider?: ProviderConfig;
	installedComponents: {
		[componentName: string]: {
			version: string;
			installedAt: string;
			files: string[];
		};
	};
}

const CONFIG_FILE_NAME = 'components.json';

export async function createConfig(dir: string): Promise<CedarConfig> {
	const config: CedarConfig = {
		version: '0.0.1',
		componentsDir: dir,
		installedComponents: {},
	};
	await saveConfig(config);
	return config;
}

export async function loadConfig(): Promise<CedarConfig | null> {
	const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
	try {
		const content = await fs.readFile(configPath, 'utf-8');
		const parsed = JSON.parse(content) as Partial<CedarConfig>;
		return {
			version: parsed.version ?? '0.0.1',
			componentsDir: parsed.componentsDir ?? 'src/components/cedar-os',
			provider: parsed.provider,
			installedComponents: parsed.installedComponents ?? {},
		};
	} catch {
		return null;
	}
}

export async function saveConfig(config: CedarConfig): Promise<void> {
	const configPath = path.join(process.cwd(), CONFIG_FILE_NAME);
	await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export async function addComponentToConfig(
	config: CedarConfig,
	component: ComponentInfo
): Promise<void> {
	config.installedComponents[component.name.toLowerCase()] = {
		version: '0.0.1',
		installedAt: new Date().toISOString(),
		files: component.files,
	};
	await saveConfig(config);
}

export async function isComponentInstalled(
	config: CedarConfig,
	componentName: string
): Promise<boolean> {
	return componentName.toLowerCase() in config.installedComponents;
}

export async function removeComponentFromConfig(
	config: CedarConfig,
	componentName: string
): Promise<void> {
	delete config.installedComponents[componentName.toLowerCase()];
	await saveConfig(config);
}

export function getInstalledComponents(config: CedarConfig): string[] {
	return Object.keys(config.installedComponents);
}

export async function setProviderInConfig(
	config: CedarConfig,
	provider: ProviderConfig
): Promise<void> {
	config.provider = provider;
	await saveConfig(config);
}

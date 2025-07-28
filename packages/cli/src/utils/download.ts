import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { ComponentInfo } from '../registry';

// Updated base URL to point to the new cedar-os-components package structure
export const GITHUB_BASE_URL =
	'https://raw.githubusercontent.com/CedarCopilot/cedar-OS/main/packages/cedar-os-components';

export async function downloadComponent(
	component: ComponentInfo,
	targetDir: string
): Promise<void> {
	const componentDir = path.join(targetDir, component.category);

	// Ensure component directory exists
	await fs.mkdir(componentDir, { recursive: true });

	for (const file of component.files) {
		const sourceUrl = `${GITHUB_BASE_URL}/${component.category}/${file}`;
		const targetPath = path.join(componentDir, file);

		try {
			const response = await fetch(sourceUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch ${sourceUrl}: ${response.statusText}`);
			}

			let content = await response.text();

			// Transform imports to use local paths instead of package imports
			content = transformImports(content);

			await fs.writeFile(targetPath, content, 'utf-8');
		} catch (error) {
			throw new Error(
				`Failed to download ${file}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`
			);
		}
	}
}

export async function downloadMultipleComponents(
	components: ComponentInfo[],
	targetDir: string
): Promise<void> {
	const promises = components.map((component) =>
		downloadComponent(component, targetDir)
	);
	await Promise.all(promises);
}

function transformImports(content: string): string {
	// Transform relative imports that reference the cedar-os package
	// This is a basic transformation - you might need to adjust based on your specific imports

	// Transform internal component imports to use local structure
	content = content.replace(/from ['"]\.\.\/\.\.\/(.+?)['"]/, "from '../$1'");

	// Keep bare 'cedar-os' imports intact; only adjust subpath imports if they occur
	content = content.replace(/from ['"]cedar-os\/(.+?)['"]/g, "from '../$1'");

	// Rewrite our internal alias "@/" to consumer-friendly path "@components/cedar-os/"
	content = content.replace(
		/from ['"]@\/([^'\"]+)['"]/g,
		"from '@/components/cedar-os/$1'"
	);

	return content;
}

export async function checkDirectoryExists(dir: string): Promise<boolean> {
	try {
		const stat = await fs.stat(dir);
		return stat.isDirectory();
	} catch {
		return false;
	}
}

export async function createDirectory(dir: string): Promise<void> {
	await fs.mkdir(dir, { recursive: true });
}

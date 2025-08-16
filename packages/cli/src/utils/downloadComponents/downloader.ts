// packages/cli/src/utils/downloadComponents/downloader.ts
// --------------------------------------------------
// File download and transformation utilities
// Handles fetching component files and transforming imports
// --------------------------------------------------

import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import type { ComponentInfo } from './registry';

// Updated base URL to point to the new cedar-os-components package structure
export const GITHUB_BASE_URL =
	'https://raw.githubusercontent.com/CedarCopilot/cedar-OS/main/packages/cedar-os-components';

export async function downloadComponent(
	component: ComponentInfo,
	targetDir: string
): Promise<void> {
	for (const file of component.files) {
		const sourceUrl = `${GITHUB_BASE_URL}/${file}`;
		const targetPath = path.join(targetDir, file);

		// Ensure directory exists for this file
		await fs.mkdir(path.dirname(targetPath), { recursive: true });

		try {
			const response = await fetch(sourceUrl);
			if (!response.ok) {
				throw new Error(`Failed to fetch ${sourceUrl}: ${response.statusText}`);
			}

			let content = await response.text();

			// Transform imports to use local paths instead of package imports
			content = transformImports(content, targetDir);

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

function transformImports(content: string, targetDir: string): string {
	// Transform relative imports that reference the cedar-os package
	// This is a basic transformation - you might need to adjust based on your specific imports

	// Transform internal component imports to use local structure
	content = content.replace(/from ['"]\.\.\/\.\.\/(.+?)['"]/, "from '../$1'");

	// Keep bare 'cedar-os' imports intact; only adjust subpath imports if they occur
	content = content.replace(/from ['"]cedar-os\/(.+?)['"]/g, "from '../$1'");

	// Rewrite our internal alias "@/" to consumer-friendly path based on their chosen directory
	// Extract the relative path from targetDir (e.g., "src/cedar/components" -> "@/cedar/components")
	const pathParts = targetDir.split('/');
	const srcIndex = pathParts.indexOf('src');

	let cedarPath = '@/components/cedar-os/'; // default fallback
	if (srcIndex !== -1 && srcIndex < pathParts.length - 1) {
		// Get everything after 'src/' and construct the alias path
		const relativePath = pathParts.slice(srcIndex + 1).join('/');
		cedarPath = `@/${relativePath}/`;
	}

	content = content.replace(
		/from ['"]@\/([^'\"]+)['"]/g,
		`from '${cedarPath}$1'`
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

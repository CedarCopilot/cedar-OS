#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read main package.json
const mainPackagePath = path.join(__dirname, '../package.json');
const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));

let changed = false;

// Restore workspace:* for local development
if (mainPackage.dependencies['cedar-os'] !== 'workspace:*') {
  mainPackage.dependencies['cedar-os'] = 'workspace:*';
  changed = true;
  console.log(`🔄 Restored cedar to workspace:* for local development`);
} else {
  console.log(`ℹ️  cedar dependency is already set to workspace:*`);
}

// Enable all workspaces for local development
if (mainPackage.workspaces.length === 0 || !mainPackage.workspaces.includes('packages/*')) {
  mainPackage.workspaces = ['packages/*'];
  changed = true;
  console.log(`🔄 Enabled all workspaces for local development`);
} else {
  console.log(`ℹ️  Workspaces are already enabled`);
}

// Write updated package.json if changes were made
if (changed) {
  fs.writeFileSync(mainPackagePath, JSON.stringify(mainPackage, null, '\t') + '\n');
} 
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read cedar package.json to get the version
const cedarUiPackagePath = path.join(__dirname, '../packages/cedar-os/package.json');
const cedarUiPackage = JSON.parse(fs.readFileSync(cedarUiPackagePath, 'utf8'));
const cedarUiVersion = cedarUiPackage.version;

// Read main package.json
const mainPackagePath = path.join(__dirname, '../package.json');
const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));

let changed = false;

// Replace workspace:* with actual version
if (mainPackage.dependencies['cedar-os'] === 'workspace:*') {
  mainPackage.dependencies['cedar-os'] = `^${cedarUiVersion}`;
  changed = true;
  console.log(`✅ Replaced cedar workspace:* with ^${cedarUiVersion} for production build`);
} else {
  console.log(`ℹ️  cedar dependency is already set to: ${mainPackage.dependencies['cedar-os']}`);
}

// Disable all workspaces to use npm registry
if (mainPackage.workspaces.length > 0) {
  mainPackage.workspaces = [];
  changed = true;
  console.log(`✅ Disabled all workspaces for npm registry usage`);
} else {
  console.log(`ℹ️  Workspaces are already disabled`);
}

// Write updated package.json if changes were made
if (changed) {
  fs.writeFileSync(mainPackagePath, JSON.stringify(mainPackage, null, '\t') + '\n');
} 
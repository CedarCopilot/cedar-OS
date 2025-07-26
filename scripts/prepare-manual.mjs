#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get version from command line argument
const version = process.argv[2];

if (!version) {
  console.error('❌ Please specify a version: npm run pm 1.1.42');
  process.exit(1);
}

// Read main package.json
const mainPackagePath = path.join(__dirname, '../package.json');
const mainPackage = JSON.parse(fs.readFileSync(mainPackagePath, 'utf8'));

let changed = false;

// Set specific version
if (mainPackage.dependencies['cedar-os'] !== version) {
  mainPackage.dependencies['cedar-os'] = version;
  changed = true;
  console.log(`✅ Set cedar to ${version} for manual testing`);
} else {
  console.log(`ℹ️  cedar dependency is already set to: ${version}`);
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
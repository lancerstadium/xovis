#!/usr/bin/env node
/**
 * Copy web build output to electron web/dist. Cross-platform (Windows/Unix).
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronPkg = join(__dirname, '..');
const webDist = join(electronPkg, '../web/dist');
const targetDir = join(electronPkg, 'web/dist');

if (!existsSync(webDist)) {
  console.warn('packages/electron/scripts/copy-web-dist.mjs: ../web/dist not found, skipping copy');
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });
cpSync(webDist, targetDir, { recursive: true });
console.log('Copied web/dist to electron/web/dist');

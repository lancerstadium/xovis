#!/usr/bin/env node
/**
 * Generate 512x512 icon.png for Electron from favicon-app.svg.
 * Uses sharp (from vscode-extension) or ImageMagick convert.
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgSrc = join(root, 'packages/web/public/favicon-app.svg');
const outDir = join(root, 'packages/electron/build');
const outPng = join(outDir, 'icon.png');

if (!existsSync(svgSrc)) {
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

async function withSharp() {
  try {
    const sharp = require(join(root, 'packages/vscode-extension/node_modules/sharp'));
    await sharp(svgSrc).resize(512, 512).png().toFile(outPng);
    return true;
  } catch {
    return false;
  }
}

function withConvert() {
  try {
    execSync(`convert -background white -resize 512x512 "${svgSrc}" "${outPng}"`, {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

const ok = (await withSharp()) || withConvert();
if (!ok) {
  console.warn(
    'scripts/generate-electron-icon: run pnpm install and ensure sharp or ImageMagick is available'
  );
}

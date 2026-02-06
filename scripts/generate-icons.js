#!/usr/bin/env node
/**
 * 生成应用图标脚本
 * 从 favicon-app.svg 生成各平台所需的图标格式
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const svgPath = path.join(__dirname, '../packages/web/public/favicon-app.svg');
const electronIconPath = path.join(__dirname, '../packages/electron/build/icon.png');
const vscodeIconPath = path.join(__dirname, '../packages/vscode-extension/icon.png');

// 检查 SVG 文件是否存在
if (!fs.existsSync(svgPath)) {
  console.error(`Error: SVG file not found at ${svgPath}`);
  process.exit(1);
}

console.log('Icon generation script');
console.log('=====================');
console.log(`Source: ${svgPath}`);
console.log(`Electron icon: ${electronIconPath}`);
console.log(`VSCode icon: ${vscodeIconPath}`);
console.log('');
console.log('To generate PNG icons, you can:');
console.log('1. Use online tools: https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert -background white -resize 512x512 favicon-app.svg icon.png');
console.log('3. Use sharp (Node.js): npm install sharp && node -e "require(\'sharp\').default(\'favicon-app.svg\').resize(512,512).png().toFile(\'icon.png\')"');
console.log('');
console.log('For now, copying SVG as placeholder...');

// 确保目录存在
const electronBuildDir = path.dirname(electronIconPath);
const vscodeDir = path.dirname(vscodeIconPath);

if (!fs.existsSync(electronBuildDir)) {
  fs.mkdirSync(electronBuildDir, { recursive: true });
}

// 复制 SVG 作为占位符（实际构建时需要 PNG）
fs.copyFileSync(svgPath, path.join(electronBuildDir, 'icon.svg'));
if (fs.existsSync(vscodeDir)) {
  fs.copyFileSync(svgPath, path.join(vscodeDir, 'icon.svg'));
}

console.log('✓ SVG files copied as placeholders');
console.log('⚠ Please generate PNG files manually before building');

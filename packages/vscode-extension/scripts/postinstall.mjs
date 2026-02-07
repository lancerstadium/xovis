import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const imagesDir = path.join(root, 'images');
const svgSrc = path.join(root, '../web/public/favicon-app.svg');
const iconPng = path.join(imagesDir, 'icon.png');

fs.mkdirSync(imagesDir, { recursive: true });

// Generate icon.png (128x128) from favicon-app.svg for vsce - required for extension icon
if (!fs.existsSync(svgSrc)) process.exit(0);
try {
  const sharp = (await import('sharp')).default;
  await sharp(svgSrc).resize(128, 128).png().toFile(iconPng);
} catch {
  const { execSync } = await import('child_process');
  try {
    execSync(`convert -background white -resize 128x128 "${svgSrc}" "${iconPng}"`, { stdio: 'pipe' });
  } catch {
    console.warn('vscode-extension: Could not generate icon.png (install sharp or ImageMagick for icon support)');
  }
}

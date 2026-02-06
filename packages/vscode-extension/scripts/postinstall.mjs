import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const imagesDir = path.join(root, 'images');
const svgSrc = path.join(root, '../web/public/favicon-app.svg');
const iconSvg = path.join(imagesDir, 'icon.svg');
const iconPng = path.join(imagesDir, 'icon.png');

fs.mkdirSync(imagesDir, { recursive: true });
if (fs.existsSync(svgSrc)) {
  fs.copyFileSync(svgSrc, iconSvg);
}

// Generate icon.png (128x128) for vsce - required for extension icon
try {
  const sharp = (await import('sharp')).default;
  await sharp(iconSvg).resize(128, 128).png().toFile(iconPng);
} catch {
  const { execSync } = await import('child_process');
  try {
    execSync(`convert -background white -resize 128x128 "${iconSvg}" "${iconPng}"`, { stdio: 'pipe' });
  } catch {
    console.warn('vscode-extension: Could not generate icon.png (install sharp or ImageMagick for icon support)');
  }
}

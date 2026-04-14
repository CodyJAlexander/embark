import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgBuffer = readFileSync(resolve(root, 'public', 'icon.svg'));

// Generate a 1024x1024 PNG for the Tauri icon generator
await sharp(svgBuffer, { density: 300 })
  .resize(1024, 1024)
  .png()
  .toFile(resolve(root, 'src-tauri', 'icons', 'app-icon.png'));

console.log('Generated src-tauri/icons/app-icon.png (1024x1024)');

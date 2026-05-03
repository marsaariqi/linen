import { execSync } from 'child_process';
import path from 'path';

const SVG_PATH = 'public/icon.svg';

async function generateIcons() {
  console.log(`Generating all icons using Tauri CLI from ${SVG_PATH}...`);
  
  try {
    // This official Tauri command automatically generates .png, .ico, .icns, 
    // and all required mobile/store assets in the correct formats.
    execSync(`npx tauri icon ${SVG_PATH}`, { stdio: 'inherit' });
    console.log('\nIcons generated successfully!');
  } catch (error) {
    console.error('Failed to generate icons. Make sure Tauri CLI is installed.');
    process.exit(1);
  }
}

generateIcons().catch(console.error);
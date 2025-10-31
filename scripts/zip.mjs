import { zip } from 'zip-a-folder';
import { readFileSync, mkdirSync, existsSync } from 'fs';

// Read manifest.config.ts as a text file
const manifestContent = readFileSync('manifest.config.ts', 'utf-8');

// Extract version using a regular expression
const versionMatch = manifestContent.match(/version:\s*['"]([^'"]+)['"]/);
if (!versionMatch) {
  throw new Error('Version not found in manifest.config.ts');
}
const version = versionMatch[1];

const dir = 'release';
const filename = `huddlellm-extension-v${version}.zip`;
const filepath = `${dir}/${filename}`;

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

await zip('dist', filepath);
console.log(`✅ Extension zipped to ${filepath}`);
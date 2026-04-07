import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const sourceDir = resolve(process.env.RELEASE_INPUT_DIR ?? 'release-artifacts');
const outputDir = resolve(process.env.RELEASE_OUTPUT_DIR ?? 'release-assets');

const listFiles = (directory) => {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listFiles(fullPath);
    }
    return [fullPath];
  });
};

const allowedExtensions = new Set([
  '.exe',
  '.msi',
  '.dmg',
  '.zip',
  '.deb',
  '.rpm',
  '.appimage',
  '.nupkg',
]);

mkdirSync(outputDir, { recursive: true });

const files = listFiles(sourceDir).filter((file) => {
  const lower = file.toLowerCase();
  return (
    allowedExtensions.has(lower.slice(lower.lastIndexOf('.'))) ||
    basename(file) === 'RELEASES'
  );
});

for (const file of files) {
  if (!statSync(file).isFile()) {
    continue;
  }
  copyFileSync(file, join(outputDir, basename(file)));
}

console.log(`Collected ${files.length} release assets into ${outputDir}`);

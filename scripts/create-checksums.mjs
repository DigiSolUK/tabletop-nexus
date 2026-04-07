import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const targetDir = resolve(process.env.RELEASE_ASSETS_DIR ?? 'release-assets');
const outputName = process.env.RELEASE_CHECKSUMS_NAME ?? 'checksums.txt';
const outputPath = resolve(process.env.RELEASE_CHECKSUMS_PATH ?? join(targetDir, outputName));

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

const files = statSync(targetDir).isDirectory()
  ? listFiles(targetDir).filter((file) => basename(file) !== outputName)
  : [];

const lines = files.map((file) => {
  const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
  return `${digest}  ${basename(file)}`;
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

console.log(`Checksums written to ${relative(process.cwd(), outputPath)}`);

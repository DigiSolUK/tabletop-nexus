import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifestPath = resolve('site', 'src', 'data', 'release-manifest.generated.json');

const fail = (message) => {
  console.error(`Release manifest validation failed: ${message}`);
  process.exit(1);
};

let manifest;

try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(error instanceof Error ? error.message : 'manifest could not be parsed');
}

if (!manifest || typeof manifest !== 'object') {
  fail('manifest is not an object');
}

if (typeof manifest.version !== 'string' || !manifest.version) {
  fail('version is missing');
}

if (typeof manifest.releaseDate !== 'string' || !manifest.releaseDate) {
  fail('releaseDate is missing');
}

if (manifest.channel !== 'stable') {
  fail('channel must be stable');
}

if (!manifest.minimumOs || typeof manifest.minimumOs !== 'object') {
  fail('minimumOs is missing');
}

for (const platform of ['windows', 'macos', 'linux']) {
  if (typeof manifest.minimumOs[platform] !== 'string' || !manifest.minimumOs[platform]) {
    fail(`minimumOs.${platform} is missing`);
  }
}

if (!Array.isArray(manifest.notes)) {
  fail('notes must be an array');
}

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  fail('assets must be a non-empty array');
}

for (const asset of manifest.assets) {
  if (!asset || typeof asset !== 'object') {
    fail('asset entry is not an object');
  }

  for (const field of ['platform', 'label', 'arch', 'format', 'url', 'checksumUrl', 'size']) {
    if (typeof asset[field] !== 'string' || !asset[field]) {
      fail(`asset.${field} is missing`);
    }
  }

  if (
    asset.sha256 !== undefined &&
    (typeof asset.sha256 !== 'string' || !/^[a-f0-9]{64}$/i.test(asset.sha256))
  ) {
    fail('asset.sha256 must be a 64-character hex string when present');
  }
}

if (!manifest.links || typeof manifest.links !== 'object') {
  fail('links are missing');
}

for (const field of ['website', 'release']) {
  if (typeof manifest.links[field] !== 'string' || !manifest.links[field]) {
    fail(`links.${field} is missing`);
  }
}

console.log(`Release manifest validated: ${manifest.version}`);

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import packageJson from '../package.json' with { type: 'json' };

const version = process.env.RELEASE_VERSION ?? packageJson.version;
const releaseTag = process.env.RELEASE_TAG ?? `v${version}`;
const releaseDate = process.env.RELEASE_DATE ?? new Date().toISOString().slice(0, 10);
const repoSlug =
  process.env.RELEASE_REPO_SLUG ??
  process.env.GITHUB_REPOSITORY ??
  'DigiSolUK/tabletop-nexus';
const siteUrl = process.env.PUBLIC_SITE_URL ?? process.env.TABLETOP_NEXUS_SITE_URL ?? 'https://tabletopnexus.app';
const baseUrl =
  process.env.RELEASE_BASE_URL ?? `https://github.com/${repoSlug}/releases/download/${releaseTag}`;
const artifactsDir = process.env.RELEASE_ASSETS_DIR
  ? resolve(process.env.RELEASE_ASSETS_DIR)
  : null;
const hasArtifactSnapshot = artifactsDir ? statExists(artifactsDir) : false;

const checksumAssetName = process.env.RELEASE_CHECKSUMS_NAME ?? 'checksums.txt';
const checksumsUrl = process.env.RELEASE_CHECKSUMS_URL ?? `${baseUrl}/${checksumAssetName}`;
const checksumsPath = artifactsDir ? resolve(artifactsDir, checksumAssetName) : null;

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

const formatSize = (bytes) => {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
};

function statExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

const readChecksums = () => {
  if (!checksumsPath || !statExists(checksumsPath)) {
    return new Map();
  }

  return new Map(
    readFileSync(checksumsPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
        return match ? [match[2], match[1].toLowerCase()] : null;
      })
      .filter(Boolean)
  );
};

const checksumMap = readChecksums();

const createAsset = (platform, label, arch, format, filename, size = 'TBD') => ({
  platform,
  label,
  arch,
  format,
  url: `${baseUrl}/${encodeURIComponent(filename)}`,
  checksumUrl: checksumsUrl,
  size,
  sha256: checksumMap.get(filename),
});

const pickArtifact = (files, rules) => {
  for (const rule of rules) {
    const matched = files.find((file) => rule(file));
    if (matched) {
      return matched;
    }
  }
  return null;
};

const inferAssets = () => {
  if (!hasArtifactSnapshot) {
    return [];
  }

  const files = listFiles(artifactsDir);
  const windowsFile =
    pickArtifact(files, [
      (file) => extname(file).toLowerCase() === '.exe' && file.toLowerCase().includes('setup'),
      (file) => extname(file).toLowerCase() === '.msi',
    ]) ?? null;
  const macFile =
    pickArtifact(files, [
      (file) => extname(file).toLowerCase() === '.dmg',
      (file) => extname(file).toLowerCase() === '.zip' && file.toLowerCase().includes('darwin'),
      (file) => extname(file).toLowerCase() === '.zip' && file.toLowerCase().includes('mac'),
    ]) ?? null;
  const linuxFile =
    pickArtifact(files, [
      (file) => extname(file).toLowerCase() === '.deb',
      (file) => extname(file).toLowerCase() === '.rpm',
      (file) => extname(file).toLowerCase() === '.appimage',
    ]) ?? null;

  const assets = [];
  if (windowsFile) {
    assets.push(
      createAsset(
        'windows',
        'Windows Installer',
        inferArch(windowsFile),
        extname(windowsFile).slice(1),
        basename(windowsFile),
        formatSize(statSync(windowsFile).size)
      )
    );
  }
  if (macFile) {
    assets.push(
      createAsset(
        'macos',
        'macOS Build',
        inferArch(macFile),
        extname(macFile).slice(1),
        basename(macFile),
        formatSize(statSync(macFile).size)
      )
    );
  }
  if (linuxFile) {
    assets.push(
      createAsset(
        'linux',
        'Linux Package',
        inferArch(linuxFile),
        extname(linuxFile).slice(1),
        basename(linuxFile),
        formatSize(statSync(linuxFile).size)
      )
    );
  }
  return assets;
};

const inferArch = (file) => {
  const lower = file.toLowerCase();
  if (lower.includes('arm64') || lower.includes('aarch64')) {
    return 'arm64';
  }
  if (lower.includes('universal')) {
    return 'universal';
  }
  return 'x64';
};

const manifest = {
  version,
  releaseDate,
  channel: 'stable',
  minimumOs: {
    windows: process.env.RELEASE_MIN_WINDOWS ?? 'Windows 10',
    macos: process.env.RELEASE_MIN_MACOS ?? 'macOS 12',
    linux: process.env.RELEASE_MIN_LINUX ?? 'Ubuntu 22.04 / equivalent',
  },
  notes: hasArtifactSnapshot
    ? [
        'Stable installers are published through GitHub Releases and mirrored on the TableTop Nexus website through a generated manifest.',
        'Verify the published SHA256 checksum before installing if you want to confirm file integrity.',
      ]
    : [
        'No stable release artifact set has been generated yet, so the website should fall back to the GitHub Releases page.',
        'Once a stable release is built and published, this manifest will be regenerated from the actual uploaded installer names and checksums.',
      ],
  assets: inferAssets(),
  links: {
    website: siteUrl,
    release: hasArtifactSnapshot
      ? `https://github.com/${repoSlug}/releases/tag/${releaseTag}`
      : `https://github.com/${repoSlug}/releases`,
  },
};

const outputPath = resolve('site', 'src', 'data', 'release-manifest.generated.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Release manifest written to ${relative(process.cwd(), outputPath)}`);

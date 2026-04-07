import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import packageJson from '../package.json' with { type: 'json' };

const version = process.env.RELEASE_VERSION ?? packageJson.version;
const releaseTag = process.env.RELEASE_TAG ?? `v${version}`;
const repoSlug =
  process.env.RELEASE_REPO_SLUG ??
  process.env.GITHUB_REPOSITORY ??
  'DigiSolUK/tabletop-nexus';
const siteUrl =
  process.env.PUBLIC_SITE_URL ??
  process.env.TABLETOP_NEXUS_SITE_URL ??
  'https://digisoluk.github.io/tabletop-nexus/';
const baseUrl =
  process.env.RELEASE_BASE_URL ?? `https://github.com/${repoSlug}/releases/download/${releaseTag}`;
const artifactsDir = process.env.RELEASE_ASSETS_DIR
  ? resolve(process.env.RELEASE_ASSETS_DIR)
  : null;
const metadataPath = process.env.RELEASE_METADATA_PATH
  ? resolve(process.env.RELEASE_METADATA_PATH)
  : null;
const checksumAssetName = process.env.RELEASE_CHECKSUMS_NAME ?? 'checksums.txt';

function statExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

const hasArtifactSnapshot = artifactsDir ? statExists(artifactsDir) : false;
const checksumsPath = artifactsDir ? resolve(artifactsDir, checksumAssetName) : null;

const readReleaseMetadata = () => {
  if (!metadataPath || !statExists(metadataPath)) {
    return null;
  }

  try {
    const buffer = readFileSync(metadataPath);
    let raw;

    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      raw = buffer.toString('utf16le').replace(/^\uFEFF/, '');
    } else {
      raw = buffer.toString('utf8').replace(/^\uFEFF/, '');
    }

    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const releaseMetadata = readReleaseMetadata();
const publishedAssets = Array.isArray(releaseMetadata?.assets) ? releaseMetadata.assets : [];
const checksumsAsset = publishedAssets.find((asset) => asset?.name === checksumAssetName) ?? null;
const releaseDate =
  process.env.RELEASE_DATE ??
  releaseMetadata?.publishedAt?.slice(0, 10) ??
  new Date().toISOString().slice(0, 10);
const checksumsUrl =
  process.env.RELEASE_CHECKSUMS_URL ??
  checksumsAsset?.url ??
  `${baseUrl}/${checksumAssetName}`;

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

const inferArch = (filename) => {
  const lower = filename.toLowerCase();
  if (lower.includes('arm64') || lower.includes('aarch64')) {
    return 'arm64';
  }
  if (lower.includes('universal')) {
    return 'universal';
  }
  return 'x64';
};

const classifyAsset = (filename) => {
  const extension = extname(filename).toLowerCase();
  const lower = filename.toLowerCase();

  if (filename === checksumAssetName || filename === 'RELEASES' || extension === '.nupkg') {
    return null;
  }

  if (extension === '.exe' || extension === '.msi') {
    return {
      platform: 'windows',
      label: 'Windows Installer',
      arch: inferArch(filename),
      format: extension.slice(1),
    };
  }

  if (extension === '.dmg' || (extension === '.zip' && (lower.includes('darwin') || lower.includes('mac')))) {
    return {
      platform: 'macos',
      label: 'macOS Build',
      arch: inferArch(filename),
      format: extension.slice(1),
    };
  }

  if (extension === '.deb') {
    return {
      platform: 'linux',
      label: 'Linux DEB Package',
      arch: inferArch(filename),
      format: 'deb',
    };
  }

  if (extension === '.rpm') {
    return {
      platform: 'linux',
      label: 'Linux RPM Package',
      arch: inferArch(filename),
      format: 'rpm',
    };
  }

  if (extension === '.appimage') {
    return {
      platform: 'linux',
      label: 'Linux AppImage',
      arch: inferArch(filename),
      format: 'appimage',
    };
  }

  return null;
};

const sortAssets = (assets) => {
  const order = {
    'windows:exe': 0,
    'windows:msi': 1,
    'macos:dmg': 2,
    'macos:zip': 3,
    'linux:deb': 4,
    'linux:rpm': 5,
    'linux:appimage': 6,
  };

  return assets.sort((left, right) => {
    const leftKey = `${left.platform}:${left.format}`;
    const rightKey = `${right.platform}:${right.format}`;
    return (order[leftKey] ?? 99) - (order[rightKey] ?? 99);
  });
};

const createDirectoryAsset = (platform, label, arch, format, filename, size = 'TBD') => ({
  platform,
  label,
  arch,
  format,
  url: `${baseUrl}/${encodeURIComponent(filename)}`,
  checksumUrl: checksumsUrl,
  size,
  sha256: checksumMap.get(filename),
});

const inferAssetsFromMetadata = () =>
  sortAssets(
    publishedAssets
      .map((asset) => {
        const classified = classifyAsset(asset?.name ?? '');
        if (!classified) {
          return null;
        }

        return {
          ...classified,
          url: asset.url,
          checksumUrl: checksumsUrl,
          size: typeof asset.size === 'number' ? formatSize(asset.size) : 'TBD',
          sha256:
            typeof asset.digest === 'string' && asset.digest.startsWith('sha256:')
              ? asset.digest.slice('sha256:'.length)
              : undefined,
        };
      })
      .filter(Boolean)
  );

const inferAssetsFromDirectory = () => {
  if (!hasArtifactSnapshot) {
    return [];
  }

  return sortAssets(
    listFiles(artifactsDir)
      .map((file) => {
        const filename = basename(file);
        const classified = classifyAsset(filename);
        if (!classified) {
          return null;
        }

        return createDirectoryAsset(
          classified.platform,
          classified.label,
          classified.arch,
          classified.format,
          filename,
          formatSize(statSync(file).size)
        );
      })
      .filter(Boolean)
  );
};

const resolvedAssets = (() => {
  const metadataAssets = inferAssetsFromMetadata();
  return metadataAssets.length > 0 ? metadataAssets : inferAssetsFromDirectory();
})();

const hasReleaseSnapshot = resolvedAssets.length > 0;

const manifest = {
  version,
  releaseDate,
  channel: 'stable',
  minimumOs: {
    windows: process.env.RELEASE_MIN_WINDOWS ?? 'Windows 10',
    macos: process.env.RELEASE_MIN_MACOS ?? 'macOS 12',
    linux: process.env.RELEASE_MIN_LINUX ?? 'Ubuntu 22.04 / equivalent',
  },
  notes: hasReleaseSnapshot
    ? [
        'Stable installers are published through GitHub Releases and mirrored on the TableTop Nexus website through a generated manifest.',
        'Verify the published SHA256 checksum before installing if you want to confirm file integrity.',
      ]
    : [
        'No stable release artifact set has been generated yet, so the website should fall back to the GitHub Releases page.',
        'Once a stable release is built and published, this manifest will be regenerated from the actual uploaded installer names and checksums.',
      ],
  assets: resolvedAssets,
  links: {
    website: siteUrl,
    release: hasReleaseSnapshot
      ? releaseMetadata?.url ?? `https://github.com/${repoSlug}/releases/tag/${releaseTag}`
      : `https://github.com/${repoSlug}/releases`,
  },
};

const outputPath = resolve('site', 'src', 'data', 'release-manifest.generated.json');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Release manifest written to ${relative(process.cwd(), outputPath)}`);

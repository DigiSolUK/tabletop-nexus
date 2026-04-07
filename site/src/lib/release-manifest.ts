import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface ReleaseManifestAsset {
  platform: 'windows' | 'macos' | 'linux';
  label: string;
  arch: string;
  format: string;
  url: string;
  checksumUrl: string;
  size: string;
  sha256?: string;
}

export interface ReleaseManifestData {
  version: string;
  releaseDate: string;
  channel: 'stable';
  minimumOs: {
    windows: string;
    macos: string;
    linux: string;
  };
  notes: string[];
  assets: ReleaseManifestAsset[];
  links: {
    website: string;
    release: string;
  };
}

const manifestPath = fileURLToPath(new URL('../data/release-manifest.generated.json', import.meta.url));

const isAsset = (value: unknown): value is ReleaseManifestAsset => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const asset = value as Record<string, unknown>;
  return (
    typeof asset.platform === 'string' &&
    typeof asset.label === 'string' &&
    typeof asset.arch === 'string' &&
    typeof asset.format === 'string' &&
    typeof asset.url === 'string' &&
    typeof asset.checksumUrl === 'string' &&
    typeof asset.size === 'string'
  );
};

const isManifest = (value: unknown): value is ReleaseManifestData => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const manifest = value as Record<string, unknown>;
  const minimumOs = manifest.minimumOs as Record<string, unknown> | undefined;
  const links = manifest.links as Record<string, unknown> | undefined;
  return (
    typeof manifest.version === 'string' &&
    typeof manifest.releaseDate === 'string' &&
    manifest.channel === 'stable' &&
    Array.isArray(manifest.notes) &&
    Array.isArray(manifest.assets) &&
    manifest.assets.every(isAsset) &&
    minimumOs !== undefined &&
    typeof minimumOs.windows === 'string' &&
    typeof minimumOs.macos === 'string' &&
    typeof minimumOs.linux === 'string' &&
    links !== undefined &&
    typeof links.website === 'string' &&
    typeof links.release === 'string'
  );
};

export const loadReleaseManifest = (): ReleaseManifestData | null => {
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return isManifest(parsed) && parsed.assets.length > 0 ? parsed : null;
  } catch {
    return null;
  }
};

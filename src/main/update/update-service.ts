import type { ReleaseAsset, ReleaseManifest, UpdateStatus } from '../../shared/contracts';
import { defaultUpdateStatus } from '../../shared/constants';

const DEFAULT_MANIFEST_URL =
  process.env.TABLETOP_NEXUS_UPDATE_MANIFEST_URL ??
  'https://raw.githubusercontent.com/DigiSolUK/tabletop-nexus/main/site/src/data/release-manifest.generated.json';

const PLATFORM_MAP: Record<NodeJS.Platform, ReleaseAsset['platform'] | null> = {
  aix: null,
  android: null,
  darwin: 'macos',
  freebsd: null,
  haiku: null,
  linux: 'linux',
  openbsd: null,
  sunos: null,
  win32: 'windows',
  cygwin: null,
  netbsd: null,
};

const parseVersion = (version: string) =>
  version
    .replace(/^v/i, '')
    .split('.')
    .map((segment) => Number.parseInt(segment.replace(/\D.*$/, ''), 10) || 0);

const compareVersions = (left: string, right: string) => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;
    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }
  return 0;
};

const preferredAsset = (manifest: ReleaseManifest): ReleaseAsset | null => {
  const platform = PLATFORM_MAP[process.platform] ?? null;
  if (!platform) {
    return manifest.assets[0] ?? null;
  }
  return manifest.assets.find((asset) => asset.platform === platform) ?? manifest.assets[0] ?? null;
};

export class UpdateService {
  private cachedStatus: UpdateStatus | null = null;
  private checkedForVersion: string | null = null;
  private dismissedVersion: string | null = null;

  async getStatus(currentVersion: string): Promise<UpdateStatus> {
    if (this.cachedStatus && this.checkedForVersion === currentVersion) {
      return this.applyDismissal(this.cachedStatus);
    }
    return this.refresh(currentVersion);
  }

  async refresh(currentVersion: string): Promise<UpdateStatus> {
    try {
      const response = await fetch(DEFAULT_MANIFEST_URL, {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Release manifest request failed with ${response.status}`);
      }

      const manifest = (await response.json()) as ReleaseManifest;
      const latestVersion = manifest.version ?? null;
      const asset = preferredAsset(manifest);
      const available =
        Boolean(latestVersion) &&
        (manifest.channel ?? 'stable') === 'stable' &&
        compareVersions(latestVersion ?? currentVersion, currentVersion) > 0;

      const status: UpdateStatus = {
        currentVersion,
        latestVersion,
        available,
        releaseUrl: manifest.links?.release ?? null,
        downloadUrl: asset?.url ?? manifest.links?.release ?? null,
        checkedAt: new Date().toISOString(),
        dismissed: false,
        error: null,
      };
      this.cachedStatus = status;
      this.checkedForVersion = currentVersion;
      return this.applyDismissal(status);
    } catch (error) {
      const fallback: UpdateStatus = {
        ...defaultUpdateStatus(currentVersion),
        checkedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unable to check for updates.',
      };
      this.cachedStatus = fallback;
      this.checkedForVersion = currentVersion;
      return fallback;
    }
  }

  dismiss(currentVersion: string): UpdateStatus {
    const status = this.cachedStatus ?? defaultUpdateStatus(currentVersion);
    this.dismissedVersion = status.latestVersion ?? currentVersion;
    return this.applyDismissal(status);
  }

  private applyDismissal(status: UpdateStatus): UpdateStatus {
    const dismissed = Boolean(status.latestVersion && status.latestVersion === this.dismissedVersion);
    return {
      ...status,
      available: dismissed ? false : status.available,
      dismissed,
    };
  }
}

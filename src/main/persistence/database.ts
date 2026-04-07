import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type {
  AppSettings,
  AuthSessionState,
  BootstrapPayload,
  MatchRecord,
  MatchSnapshot,
  ModManifest,
  ProfileSummary,
  SaveSlot,
  StatsSummary,
  SyncStatus,
} from '../../shared/contracts';
import {
  APP_NAME,
  defaultAuthState,
  defaultProfile,
  defaultSettings,
  defaultSyncStatus,
  defaultUpdateStatus,
  emptyStats,
} from '../../shared/constants';

type Bucket =
  | 'settings'
  | 'profile'
  | 'save'
  | 'match'
  | 'mod'
  | 'package'
  | 'tutorial'
  | 'active'
  | 'auth'
  | 'sync'
  | 'session';

interface StoredRow {
  payload: string;
}

const CURRENT_PROFILE_ID = 'current-profile-id';
const AUTH_SESSION_ID = 'session';
const ACTIVE_MATCH_ID = 'current';

export class AppDatabase {
  private readonly db: DatabaseSync;

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS app_records (
        bucket TEXT NOT NULL,
        id TEXT NOT NULL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (bucket, id)
      );
    `);
  }

  getSettings(profileId = this.getCurrentProfile().id): AppSettings {
    return this.getOne<AppSettings>('settings', profileId) ?? defaultSettings();
  }

  saveSettings(settings: AppSettings, profileId = this.getCurrentProfile().id): AppSettings {
    this.put('settings', profileId, settings);
    return settings;
  }

  listProfiles(): ProfileSummary[] {
    const profiles = this.getMany<ProfileSummary>('profile').map((profile) => this.hydrateProfile(profile));
    if (profiles.length === 0) {
      const profile = defaultProfile();
      this.saveProfile(profile);
      this.setCurrentProfileId(profile.id);
      return [profile];
    }
    return profiles.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getCurrentProfile(): ProfileSummary {
    const profiles = this.listProfiles();
    const currentId = this.getOne<string>('session', CURRENT_PROFILE_ID) ?? profiles[0]?.id;
    const current = profiles.find((profile) => profile.id === currentId) ?? profiles[0];
    if (!current) {
      const profile = defaultProfile();
      this.saveProfile(profile);
      this.setCurrentProfileId(profile.id);
      return profile;
    }
    this.setCurrentProfileId(current.id);
    return current;
  }

  saveProfile(profile: ProfileSummary): ProfileSummary {
    const saved = this.hydrateProfile({
      ...profile,
      updatedAt: profile.updatedAt ?? new Date().toISOString(),
    });
    this.put('profile', saved.id, saved);
    if (!this.getOne<string>('session', CURRENT_PROFILE_ID)) {
      this.setCurrentProfileId(saved.id);
    }
    return saved;
  }

  switchProfile(profileId: string): ProfileSummary {
    const profile = this.listProfiles().find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error(`Unknown profile: ${profileId}`);
    }
    this.setCurrentProfileId(profileId);
    return profile;
  }

  getSaves(profileId = this.getCurrentProfile().id): SaveSlot[] {
    return this.getMany<SaveSlot>('save')
      .map((slot) => this.hydrateSave(slot))
      .filter((slot) => !slot.profileId || slot.profileId === profileId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  saveSnapshot(slot: SaveSlot, profileId = this.getCurrentProfile().id): SaveSlot {
    const saved = this.hydrateSave({
      ...slot,
      profileId: slot.profileId ?? profileId,
      updatedAt: slot.updatedAt ?? new Date().toISOString(),
    });
    this.put('save', saved.id, saved);
    return saved;
  }

  deleteSave(id: string): void {
    this.delete('save', id);
  }

  getMatchRecords(profileId = this.getCurrentProfile().id): MatchRecord[] {
    return this.getMany<MatchRecord>('match')
      .map((record) => this.hydrateMatchRecord(record))
      .filter((record) => !record.profileId || record.profileId === profileId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  recordMatch(record: MatchRecord, profileId = this.getCurrentProfile().id): MatchRecord {
    const saved = this.hydrateMatchRecord({ ...record, profileId: record.profileId ?? profileId });
    this.put('match', saved.id, saved);
    return saved;
  }

  getMods(): ModManifest[] {
    return this.getMany<ModManifest>('mod');
  }

  saveMod(mod: ModManifest): ModManifest {
    this.put('mod', mod.id, mod);
    return mod;
  }

  getCustomPackages(): ModManifest[] {
    return this.getMany<ModManifest>('package');
  }

  saveCustomPackage(pkg: ModManifest): ModManifest {
    this.put('package', pkg.id, pkg);
    return pkg;
  }

  setModEnabled(modId: string, enabled: boolean): ModManifest | null {
    const mod = this.getOne<ModManifest>('mod', modId);
    if (!mod) {
      return null;
    }

    const updated = { ...mod, enabled };
    this.put('mod', modId, updated);
    return updated;
  }

  getTutorialsSeen(profileId = this.getCurrentProfile().id): string[] {
    return this.getOne<string[]>('tutorial', profileId) ?? [];
  }

  markTutorialSeen(tutorialId: string, profileId = this.getCurrentProfile().id): string[] {
    const current = this.getTutorialsSeen(profileId);
    const updated = current.includes(tutorialId) ? current : [...current, tutorialId];
    this.put('tutorial', profileId, updated);
    return updated;
  }

  getAuthState(): AuthSessionState {
    return {
      ...defaultAuthState(),
      ...(this.getOne<AuthSessionState>('auth', AUTH_SESSION_ID) ?? {}),
    };
  }

  saveAuthState(authState: AuthSessionState): AuthSessionState {
    const saved = { ...defaultAuthState(), ...authState };
    this.put('auth', AUTH_SESSION_ID, saved);
    return saved;
  }

  getSyncStatus(profileId = this.getCurrentProfile().id): SyncStatus {
    return {
      ...defaultSyncStatus(),
      ...(this.getOne<SyncStatus>('sync', profileId) ?? {}),
    };
  }

  saveSyncStatus(syncStatus: SyncStatus, profileId = this.getCurrentProfile().id): SyncStatus {
    const saved = { ...defaultSyncStatus(), ...syncStatus };
    this.put('sync', profileId, saved);
    return saved;
  }

  getActiveMatch(): MatchSnapshot | null {
    return this.getOne<MatchSnapshot>('active', ACTIVE_MATCH_ID) ?? null;
  }

  saveActiveMatch(snapshot: MatchSnapshot): MatchSnapshot {
    this.put('active', ACTIVE_MATCH_ID, snapshot);
    return snapshot;
  }

  clearActiveMatch(): void {
    this.delete('active', ACTIVE_MATCH_ID);
  }

  getBootstrap(version: string): BootstrapPayload {
    const profile = this.getCurrentProfile();
    return {
      appName: APP_NAME,
      version,
      profile,
      availableProfiles: this.listProfiles(),
      settings: this.getSettings(profile.id),
      saves: this.getSaves(profile.id),
      stats: this.buildStatsSummary(profile.id),
      mods: this.getMods(),
      customPackages: this.getCustomPackages(),
      tutorialsSeen: this.getTutorialsSeen(profile.id),
      releaseNotes: [
        'Finished games now surface a shared rematch flow, so replay starts a fresh seeded round instead of recycling stale state.',
        'The desktop shell now uses a premium tech-table visual system with local Space Grotesk and IBM Plex Sans fonts, sharper HUD chrome, and richer board materials.',
        'This build adds in-app stable update awareness for future releases, so players can jump straight to the latest installer when a newer version ships.',
      ],
      auth: this.getAuthState(),
      syncStatus: this.getSyncStatus(profile.id),
      activeMatch: this.getActiveMatch(),
      updateStatus: defaultUpdateStatus(version),
    };
  }

  private buildStatsSummary(profileId: string): StatsSummary {
    const matches = this.getMatchRecords(profileId);
    if (matches.length === 0) {
      return emptyStats();
    }

    const gameCounts = new Map<string, { total: number; wins: number; duration: number; metricSums: Record<string, number> }>();
    const modeCounts = new Map<string, number>();
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let winStreak = 0;
    let longestWinStreak = 0;
    let favouriteGameId: string | null = null;
    let favouriteCount = 0;

    for (const match of matches) {
      const stats = gameCounts.get(match.gameId) ?? { total: 0, wins: 0, duration: 0, metricSums: {} };
      stats.total += 1;
      stats.duration += match.durationSeconds;
      if (match.outcome === 'win' || match.outcome === 'complete') {
        stats.wins += 1;
      }
      for (const [metric, value] of Object.entries(match.metrics)) {
        stats.metricSums[metric] = (stats.metricSums[metric] ?? 0) + value;
      }
      gameCounts.set(match.gameId, stats);

      modeCounts.set(match.mode, (modeCounts.get(match.mode) ?? 0) + 1);

      if (stats.total > favouriteCount) {
        favouriteCount = stats.total;
        favouriteGameId = match.gameId;
      }

      if (match.outcome === 'win' || match.outcome === 'complete') {
        totalWins += 1;
        winStreak += 1;
        longestWinStreak = Math.max(longestWinStreak, winStreak);
      } else if (match.outcome === 'draw') {
        totalDraws += 1;
        winStreak = 0;
      } else {
        totalLosses += 1;
        winStreak = 0;
      }
    }

    const mostPlayedMode = [...modeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return {
      global: {
        totalPlayTimeSeconds: matches.reduce((sum, match) => sum + match.durationSeconds, 0),
        totalGamesPlayed: matches.length,
        totalWins,
        totalLosses,
        totalDraws,
        favouriteGameId,
        longestWinStreak,
        mostPlayedMode: mostPlayedMode as StatsSummary['global']['mostPlayedMode'],
      },
      perGame: [...gameCounts.entries()].map(([gameId, value]) => ({
        gameId,
        matchCount: value.total,
        winRate: value.total === 0 ? 0 : value.wins / value.total,
        averageDurationSeconds: value.total === 0 ? 0 : value.duration / value.total,
        metrics: Object.fromEntries(
          Object.entries(value.metricSums).map(([metric, amount]) => [
            metric,
            value.total === 0 ? 0 : amount / value.total,
          ])
        ),
      })),
      recentMatches: matches.slice(0, 10),
    };
  }

  private hydrateProfile(profile: Partial<ProfileSummary>): ProfileSummary {
    const base = defaultProfile();
    return {
      ...base,
      ...profile,
      accountId: profile.accountId ?? base.accountId,
      email: profile.email ?? base.email,
      avatarAsset: profile.avatarAsset ?? base.avatarAsset,
      bannerAsset: profile.bannerAsset ?? base.bannerAsset,
      authState: profile.authState ?? base.authState,
      achievementIds: profile.achievementIds ?? base.achievementIds,
      linkedDevices: profile.linkedDevices ?? base.linkedDevices,
      createdBy: profile.createdBy ?? base.createdBy,
      updatedAt: profile.updatedAt ?? profile.createdAt ?? base.updatedAt,
      lastSyncedAt: profile.lastSyncedAt ?? base.lastSyncedAt,
    };
  }

  private hydrateSave(slot: SaveSlot): SaveSlot {
    return {
      ...slot,
      profileId: slot.profileId ?? this.getCurrentProfile().id,
    };
  }

  private hydrateMatchRecord(record: MatchRecord): MatchRecord {
    return {
      ...record,
      profileId: record.profileId ?? this.getCurrentProfile().id,
      playerOutcomes: record.playerOutcomes ?? {},
    };
  }

  private setCurrentProfileId(profileId: string): void {
    this.put('session', CURRENT_PROFILE_ID, profileId);
  }

  private getOne<T>(bucket: Bucket, id: string): T | null {
    const statement = this.db.prepare('SELECT payload FROM app_records WHERE bucket = ? AND id = ?');
    const row = statement.get(bucket, id) as StoredRow | undefined;
    return row ? (JSON.parse(row.payload) as T) : null;
  }

  private getMany<T>(bucket: Bucket): T[] {
    const statement = this.db.prepare('SELECT payload FROM app_records WHERE bucket = ?');
    const rows = statement.all(bucket) as unknown as StoredRow[];
    return rows.map((row) => JSON.parse(row.payload) as T);
  }

  private put(bucket: Bucket, id: string, payload: unknown): void {
    const statement = this.db.prepare(`
      INSERT INTO app_records (bucket, id, payload, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(bucket, id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `);
    statement.run(bucket, id, JSON.stringify(payload), new Date().toISOString());
  }

  private delete(bucket: Bucket, id: string): void {
    this.db.prepare('DELETE FROM app_records WHERE bucket = ? AND id = ?').run(bucket, id);
  }
}

export const createSaveSlot = <TState>(
  snapshot: MatchSnapshot<TState>,
  title: string,
  profileId?: string
): SaveSlot => ({
  id: randomUUID(),
  profileId,
  title,
  gameId: snapshot.gameId,
  updatedAt: new Date().toISOString(),
  snapshot,
});

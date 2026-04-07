import type { MatchRecord, ProfileSummary, SaveSlot, SyncConflict, SyncStatus } from '../../shared/contracts';
import type { AppDatabase } from '../persistence/database';
import { AuthService } from '../auth/auth-service';

interface RemoteProfileRow {
  profile_id: string;
  account_id: string;
  payload: ProfileSummary;
  updated_at: string;
}

interface RemoteSettingsRow {
  profile_id: string;
  account_id: string;
  payload: unknown;
  updated_at: string;
}

interface RemoteSaveRow {
  save_id: string;
  profile_id: string;
  account_id: string;
  payload: SaveSlot;
  updated_at: string;
}

interface RemoteMatchRow {
  match_id: string;
  profile_id: string;
  account_id: string;
  payload: MatchRecord;
  updated_at: string;
}

export class SyncService {
  constructor(
    private readonly database: AppDatabase,
    private readonly authService: AuthService
  ) {}

  async syncNow(): Promise<SyncStatus> {
    const profile = this.database.getCurrentProfile();
    if (!this.authService.isConfigured()) {
      return this.database.saveSyncStatus({
        phase: 'disabled',
        lastSyncedAt: profile.lastSyncedAt,
        message: 'Cloud sync is disabled because Supabase is not configured in this build.',
        conflicts: [],
      });
    }

    if (profile.authState !== 'authenticated') {
      return this.database.saveSyncStatus({
        phase: 'disabled',
        lastSyncedAt: profile.lastSyncedAt,
        message: 'Sign in to sync saves, settings, and profile data.',
        conflicts: [],
      });
    }

    this.database.saveSyncStatus({
      phase: 'syncing',
      lastSyncedAt: profile.lastSyncedAt,
      message: 'Syncing cloud profile, saves, and match history...',
      conflicts: [],
    });

    try {
      const client = this.authService.getClient();
      const [{ data: userData, error: userError }, remoteProfileResult, remoteSettingsResult, remoteSavesResult, remoteMatchesResult] =
        await Promise.all([
          client.auth.getUser(),
          client.from('nexus_profiles').select('profile_id,account_id,payload,updated_at').eq('profile_id', profile.id).maybeSingle(),
          client.from('nexus_settings').select('profile_id,account_id,payload,updated_at').eq('profile_id', profile.id).maybeSingle(),
          client.from('nexus_saves').select('save_id,profile_id,account_id,payload,updated_at').eq('profile_id', profile.id),
          client.from('nexus_matches').select('match_id,profile_id,account_id,payload,updated_at').eq('profile_id', profile.id),
        ]);

      if (userError) {
        throw userError;
      }

      const accountId = userData.user?.id ?? profile.accountId;
      if (!accountId) {
        throw new Error('No authenticated account was available for sync.');
      }

      const conflicts: SyncConflict[] = [];
      let resolvedProfile = this.database.getCurrentProfile();

      const remoteProfile = remoteProfileResult.data as RemoteProfileRow | null;
      if (remoteProfile && Date.parse(remoteProfile.updated_at) > Date.parse(resolvedProfile.updatedAt)) {
        resolvedProfile = this.database.saveProfile({
          ...remoteProfile.payload,
          id: resolvedProfile.id,
          accountId,
          authState: 'authenticated',
          createdBy: 'cloud',
          updatedAt: remoteProfile.updated_at,
        });
      }

      const remoteSettings = remoteSettingsResult.data as RemoteSettingsRow | null;
      if (remoteSettings?.payload) {
        this.database.saveSettings(remoteSettings.payload as never, resolvedProfile.id);
      }

      const lastSyncAt = resolvedProfile.lastSyncedAt ? Date.parse(resolvedProfile.lastSyncedAt) : 0;
      const localSaves = this.database.getSaves(resolvedProfile.id);
      const remoteSaves = (remoteSavesResult.data ?? []) as RemoteSaveRow[];
      for (const remote of remoteSaves) {
        const local = localSaves.find((slot) => slot.id === remote.save_id);
        if (!local) {
          this.database.saveSnapshot({ ...remote.payload, profileId: resolvedProfile.id, updatedAt: remote.updated_at }, resolvedProfile.id);
          continue;
        }

        const localChangedSince = Date.parse(local.updatedAt) > lastSyncAt;
        const remoteChangedSince = Date.parse(remote.updated_at) > lastSyncAt;
        if (localChangedSince && remoteChangedSince && local.updatedAt !== remote.updated_at) {
          conflicts.push({
            entity: 'save',
            id: remote.save_id,
            localUpdatedAt: local.updatedAt,
            remoteUpdatedAt: remote.updated_at,
          });
          continue;
        }

        if (Date.parse(remote.updated_at) > Date.parse(local.updatedAt)) {
          this.database.saveSnapshot({ ...remote.payload, profileId: resolvedProfile.id, updatedAt: remote.updated_at }, resolvedProfile.id);
        }
      }

      const localMatches = this.database.getMatchRecords(resolvedProfile.id);
      const remoteMatches = (remoteMatchesResult.data ?? []) as RemoteMatchRow[];
      for (const remote of remoteMatches) {
        const local = localMatches.find((match) => match.id === remote.match_id);
        if (!local) {
          this.database.recordMatch({ ...remote.payload, profileId: resolvedProfile.id }, resolvedProfile.id);
        }
      }

      const mergedProfile = this.database.getCurrentProfile();
      const mergedSettings = this.database.getSettings(mergedProfile.id);
      const mergedSaves = this.database.getSaves(mergedProfile.id);
      const mergedMatches = this.database.getMatchRecords(mergedProfile.id);

      await Promise.all([
        client.from('nexus_profiles').upsert(
          {
            profile_id: mergedProfile.id,
            account_id: accountId,
            payload: mergedProfile,
            updated_at: mergedProfile.updatedAt,
          },
          { onConflict: 'profile_id' }
        ),
        client.from('nexus_settings').upsert(
          {
            profile_id: mergedProfile.id,
            account_id: accountId,
            payload: mergedSettings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'profile_id' }
        ),
        ...mergedSaves.map((slot) =>
          client.from('nexus_saves').upsert(
            {
              save_id: slot.id,
              profile_id: mergedProfile.id,
              account_id: accountId,
              payload: slot,
              updated_at: slot.updatedAt,
            },
            { onConflict: 'save_id' }
          )
        ),
        ...mergedMatches.map((match) =>
          client.from('nexus_matches').upsert(
            {
              match_id: match.id,
              profile_id: mergedProfile.id,
              account_id: accountId,
              payload: match,
              updated_at: match.createdAt,
            },
            { onConflict: 'match_id' }
          )
        ),
      ]);

      const syncedAt = new Date().toISOString();
      this.database.saveProfile({
        ...mergedProfile,
        lastSyncedAt: syncedAt,
        updatedAt: mergedProfile.updatedAt,
      });

      return this.database.saveSyncStatus({
        phase: conflicts.length > 0 ? 'conflict' : 'success',
        lastSyncedAt: syncedAt,
        message:
          conflicts.length > 0
            ? `Sync completed with ${conflicts.length} save conflict${conflicts.length === 1 ? '' : 's'}.`
            : 'Cloud sync completed successfully.',
        conflicts,
      });
    } catch (error) {
      return this.database.saveSyncStatus({
        phase: 'error',
        lastSyncedAt: profile.lastSyncedAt,
        message: 'Cloud sync failed.',
        conflicts: [],
      });
    }
  }
}

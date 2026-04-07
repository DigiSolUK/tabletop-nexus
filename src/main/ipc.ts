import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dialog, ipcMain } from 'electron';
import type { App } from 'electron';
import type { DesktopAPI } from '../shared/desktop-api';
import type { ModManifest } from '../shared/contracts';
import { APP_COMPATIBILITY_VERSION } from '../shared/constants';
import { AuthService } from './auth/auth-service';
import { ExportService } from './export/export-service';
import { PartyRoomService } from './party/party-service';
import { AppDatabase } from './persistence/database';
import { SyncService } from './sync/sync-service';
import { UpdateService } from './update/update-service';

export interface MainServices {
  database: AppDatabase;
  exportService: ExportService;
  partyService: PartyRoomService;
  authService: AuthService;
  syncService: SyncService;
  updateService: UpdateService;
}

export const createMainServices = (app: App): MainServices => {
  const database = new AppDatabase(join(app.getPath('userData'), 'tabletop-nexus.db'));
  const exportService = new ExportService(join(app.getPath('userData'), 'exports'), database);
  const partyService = new PartyRoomService();
  const authService = new AuthService(app, database);
  const syncService = new SyncService(database, authService);
  const updateService = new UpdateService();
  return { database, exportService, partyService, authService, syncService, updateService };
};

export const registerDesktopHandlers = (app: App, services: MainServices): void => {
  const handlers: DesktopAPI = {
    bootstrap: async () => ({
      ...services.database.getBootstrap(app.getVersion()),
      updateStatus: await services.updateService.getStatus(app.getVersion()),
    }),
    saveSettings: async (settings) => services.database.saveSettings(settings),
    saveProfile: async (profile) => services.database.saveProfile(profile),
    listProfiles: async () => services.database.listProfiles(),
    switchProfile: async (profileId) => {
      services.database.switchProfile(profileId);
      return {
        ...services.database.getBootstrap(app.getVersion()),
        updateStatus: await services.updateService.getStatus(app.getVersion()),
      };
    },
    beginAuth: async (request) => services.authService.beginAuth(request),
    completeAuth: async (callbackUrl) => services.authService.completeAuth(callbackUrl),
    signOut: async () => services.authService.signOut(),
    syncNow: async () => services.syncService.syncNow(),
    uploadAvatar: async () => uploadAvatar(app, services),
    checkForAppUpdate: async () => services.updateService.refresh(app.getVersion()),
    dismissUpdateNotice: async () => services.updateService.dismiss(app.getVersion()),
    getActiveMatch: async () => services.database.getActiveMatch(),
    saveActiveMatch: async (snapshot) => services.database.saveActiveMatch(snapshot),
    clearActiveMatch: async () => services.database.clearActiveMatch(),
    saveSnapshot: async (slot) => services.database.saveSnapshot(slot),
    deleteSave: async (id) => services.database.deleteSave(id),
    recordMatch: async (record) => {
      services.database.recordMatch(record);
    },
    markTutorialSeen: async (tutorialId) => services.database.markTutorialSeen(tutorialId),
    exportStats: async (request) => services.exportService.exportStats(request),
    importPackage: async () => importPackage(app, services.database),
    createCustomPackage: async (manifest) => createCustomPackage(app, manifest, services.database),
    setModEnabled: async (modId, enabled) => services.database.setModEnabled(modId, enabled),
    hostRoom: async (request) => services.partyService.hostRoom(request),
    joinRoom: async (request) => services.partyService.joinRoom(request),
    leaveRoom: async (code, playerId) => services.partyService.leaveRoom(code, playerId),
    toggleReady: async (request) => services.partyService.toggleReady(request),
    sendPartyChat: async (request) => services.partyService.sendChat(request),
    updatePartySettings: async (request) => services.partyService.updateSettings(request),
  };

  for (const [channel, handler] of Object.entries(handlers) as [keyof DesktopAPI, DesktopAPI[keyof DesktopAPI]][]) {
    ipcMain.handle(`desktop:${channel}`, (_, ...args: unknown[]) =>
      (handler as (...parameters: unknown[]) => unknown)(...args)
    );
  }
};

const importPackage = async (app: App, database: AppDatabase): Promise<ModManifest | null> => {
  const result = await dialog.showOpenDialog({
    title: 'Import TableTop Nexus package',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const manifest = JSON.parse(readFileSync(result.filePaths[0], 'utf8')) as ModManifest;
  const normalized: ModManifest = {
    ...manifest,
    compatibilityVersion: manifest.compatibilityVersion ?? APP_COMPATIBILITY_VERSION,
    enabled: manifest.enabled ?? true,
    dependencies: manifest.dependencies ?? [],
    conflicts: manifest.conflicts ?? [],
    assets: manifest.assets ?? [],
  };

  if (normalized.packageType === 'mod') {
    return database.saveMod(normalized);
  }

  return database.saveCustomPackage(normalized);
};

const createCustomPackage = async (
  app: App,
  manifest: ModManifest,
  database: AppDatabase
): Promise<ModManifest> => {
  const normalized: ModManifest = {
    ...manifest,
    id: manifest.id || randomUUID(),
    packageType: manifest.packageType ?? 'custom-game',
    compatibilityVersion: manifest.compatibilityVersion || APP_COMPATIBILITY_VERSION,
    enabled: true,
  };
  const exportPath = join(app.getPath('userData'), 'exports', `${normalized.id}.json`);
  writeFileSync(exportPath, JSON.stringify(normalized, null, 2));
  return normalized.packageType === 'mod'
    ? database.saveMod(normalized)
    : database.saveCustomPackage(normalized);
};

const uploadAvatar = async (app: App, services: MainServices) => {
  const result = await dialog.showOpenDialog({
    title: 'Choose a profile avatar',
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const extension = filePath.split('.').pop()?.toLowerCase() ?? 'png';
  const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'webp' ? 'image/webp' : extension === 'gif' ? 'image/gif' : 'image/png';
  const dataUrl = `data:${mimeType};base64,${readFileSync(filePath).toString('base64')}`;
  const profile = services.database.getCurrentProfile();
  const saved = services.database.saveProfile({
    ...profile,
    avatarAsset: dataUrl,
    updatedAt: new Date().toISOString(),
  });
  return saved;
};

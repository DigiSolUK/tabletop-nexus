import type {
  AppSettings,
  AuthSessionState,
  BeginAuthRequest,
  BootstrapPayload,
  ExportRequest,
  ExportResult,
  HostRoomRequest,
  JoinRoomRequest,
  MatchSnapshot,
  MatchRecord,
  ModManifest,
  PartyChatRequest,
  PartyReadyRequest,
  PartyRoom,
  PartySettingsRequest,
  ProfileSummary,
  SaveSlot,
  SyncStatus,
  UpdateStatus,
} from './contracts';

export interface DesktopAPI {
  bootstrap: () => Promise<BootstrapPayload>;
  saveSettings: (settings: AppSettings) => Promise<AppSettings>;
  saveProfile: (profile: ProfileSummary) => Promise<ProfileSummary>;
  listProfiles: () => Promise<ProfileSummary[]>;
  switchProfile: (profileId: string) => Promise<BootstrapPayload>;
  beginAuth: (request: BeginAuthRequest) => Promise<AuthSessionState>;
  completeAuth: (callbackUrl: string) => Promise<AuthSessionState>;
  signOut: () => Promise<AuthSessionState>;
  syncNow: () => Promise<SyncStatus>;
  uploadAvatar: () => Promise<ProfileSummary | null>;
  checkForAppUpdate: () => Promise<UpdateStatus>;
  dismissUpdateNotice: () => Promise<UpdateStatus>;
  getActiveMatch: () => Promise<MatchSnapshot | null>;
  saveActiveMatch: (snapshot: MatchSnapshot) => Promise<MatchSnapshot>;
  clearActiveMatch: () => Promise<void>;
  saveSnapshot: (slot: SaveSlot) => Promise<SaveSlot>;
  deleteSave: (id: string) => Promise<void>;
  recordMatch: (record: MatchRecord) => Promise<void>;
  markTutorialSeen: (tutorialId: string) => Promise<string[]>;
  exportStats: (request: ExportRequest) => Promise<ExportResult | null>;
  importPackage: () => Promise<ModManifest | null>;
  createCustomPackage: (manifest: ModManifest) => Promise<ModManifest>;
  setModEnabled: (modId: string, enabled: boolean) => Promise<ModManifest | null>;
  hostRoom: (request: HostRoomRequest) => Promise<PartyRoom>;
  joinRoom: (request: JoinRoomRequest) => Promise<PartyRoom>;
  leaveRoom: (code: string, playerId: string) => Promise<PartyRoom | null>;
  toggleReady: (request: PartyReadyRequest) => Promise<PartyRoom>;
  sendPartyChat: (request: PartyChatRequest) => Promise<PartyRoom>;
  updatePartySettings: (request: PartySettingsRequest) => Promise<PartyRoom>;
}

declare global {
  interface Window {
    desktopAPI: DesktopAPI;
  }
}

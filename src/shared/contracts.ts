export type GameCategory = 'card' | 'board' | 'party';
export type PlayMode = 'single' | 'local' | 'party';
export type PlayerType = 'human' | 'ai' | 'guest';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive';
export type MatchPhase = 'setup' | 'active' | 'complete';
export type ExportFormat = 'csv' | 'json' | 'pdf';
export type PackageType = 'mod' | 'custom-game';
export type ProfileAuthState = 'guest' | 'offline' | 'pending' | 'authenticated' | 'error' | 'unconfigured';
export type SyncPhase = 'idle' | 'disabled' | 'syncing' | 'success' | 'conflict' | 'error';
export type MatchOutcome = 'win' | 'loss' | 'draw' | 'complete';
export type RoundMode = 'single-match' | 'session-rounds';

export interface GameManifest {
  id: string;
  name: string;
  category: GameCategory;
  roundMode: RoundMode;
  shortDescription: string;
  description: string;
  playerCount: [number, number];
  supportedModes: PlayMode[];
  supportsAI: boolean;
  themeColor: string;
  artworkGlyph: string;
  tags: string[];
  tutorialId: string;
  launchTier: 'milestone1' | 'milestone2';
  supportsSaves?: boolean;
  rulesCompleteness?: 'full' | 'streamlined';
  artwork?: GameArtworkManifest;
}

export interface PlayerSeat {
  id: string;
  name: string;
  type: PlayerType;
  accent: string;
  profileId?: string | null;
  avatarAsset?: string | null;
  isLocal?: boolean;
}

export interface MatchSetup {
  id: string;
  gameId: string;
  mode: PlayMode;
  players: PlayerSeat[];
  aiDifficulty: DifficultyLevel;
  tutorialEnabled: boolean;
  ruleVariants: Record<string, string | number | boolean>;
  timerSeconds?: number;
  themeId?: string;
  seed: number;
}

export interface MoveCommand<TPayload = Record<string, unknown>> {
  id: string;
  playerId: string;
  type: string;
  payload: TPayload;
  createdAt: string;
}

export interface ReplayEvent<TPayload = Record<string, unknown>> {
  id: string;
  actorId: string;
  type: string;
  payload: TPayload;
  createdAt: string;
}

export interface MatchStatus {
  phase: MatchPhase;
  message: string;
  currentPlayerId: string | null;
  winnerIds: string[];
  isDraw: boolean;
  canSave: boolean;
  canRematch?: boolean;
  rematchLabel?: string | null;
}

export type MatchStatusInput = Omit<MatchStatus, 'canRematch' | 'rematchLabel'> &
  Partial<Pick<MatchStatus, 'canRematch' | 'rematchLabel'>>;

export interface MatchSnapshot<TState = unknown> {
  schemaVersion: number;
  id: string;
  gameId: string;
  setup: MatchSetup;
  state: TState;
  history: ReplayEvent[];
  status: MatchStatus;
  roundIndex: number;
  roundSeed: number;
  sessionStats?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  targetId?: string;
}

export interface TutorialScript {
  id: string;
  title: string;
  steps: TutorialStep[];
  allowDisable?: boolean;
}

export interface GameArtworkManifest {
  cover: string;
  setup: string;
  inMatch: string;
}

export interface RuleSchemaField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'toggle' | 'select';
  options?: string[];
  min?: number;
  max?: number;
  defaultValue: string | number | boolean;
}

export interface CreatorTemplate {
  id: string;
  name: string;
  category: GameCategory;
  description: string;
  fields: RuleSchemaField[];
}

export interface PackageDependency {
  id: string;
  versionRange?: string;
  optional?: boolean;
}

export interface ModManifest {
  id: string;
  name: string;
  packageType: PackageType;
  description: string;
  version: string;
  compatibilityVersion: string;
  author: string;
  enabled: boolean;
  dependencies: PackageDependency[];
  conflicts: string[];
  assets: string[];
  payload: Record<string, unknown>;
}

export interface LinkedDevice {
  id: string;
  name: string;
  platform: string;
  lastSeenAt: string;
}

export interface ProfileSummary {
  id: string;
  accountId: string | null;
  email: string | null;
  displayName: string;
  accent: string;
  avatarAsset: string | null;
  bannerAsset: string | null;
  authState: ProfileAuthState;
  achievementIds: string[];
  linkedDevices: LinkedDevice[];
  favouriteGameIds: string[];
  recentGameIds: string[];
  createdBy: 'local' | 'cloud';
  createdAt: string;
  updatedAt: string;
  lastSyncedAt: string | null;
}

export interface AppSettings {
  reduceMotion: boolean;
  tutorialsEnabled: boolean;
  soundEnabled: boolean;
  highContrast: boolean;
  compactMode: boolean;
  uiScale: number;
}

export interface AuthSessionState {
  provider: 'local' | 'supabase';
  configured: boolean;
  state: ProfileAuthState;
  email: string | null;
  pendingEmail: string | null;
  accountId: string | null;
  pendingCallbackUrl: string | null;
  lastError: string | null;
}

export interface SyncConflict {
  entity: 'profile' | 'settings' | 'save';
  id: string;
  localUpdatedAt: string;
  remoteUpdatedAt: string;
}

export interface SyncStatus {
  phase: SyncPhase;
  lastSyncedAt: string | null;
  message: string;
  conflicts: SyncConflict[];
}

export interface BeginAuthRequest {
  email: string;
  mode: 'sign-in' | 'sign-up';
  displayName?: string;
}

export interface MatchRecord {
  id: string;
  profileId?: string;
  gameId: string;
  gameName: string;
  mode: PlayMode;
  outcome: MatchOutcome;
  playerOutcomes: Record<string, MatchOutcome>;
  winnerIds: string[];
  createdAt: string;
  durationSeconds: number;
  players: PlayerSeat[];
  metrics: Record<string, number>;
  completionSummary?: string;
}

export interface SaveSlot {
  id: string;
  profileId?: string;
  title: string;
  gameId: string;
  updatedAt: string;
  snapshot: MatchSnapshot;
}

export interface GlobalStatsSummary {
  totalPlayTimeSeconds: number;
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  favouriteGameId: string | null;
  longestWinStreak: number;
  mostPlayedMode: PlayMode | null;
}

export interface GameStatsSummary {
  gameId: string;
  matchCount: number;
  winRate: number;
  averageDurationSeconds: number;
  metrics: Record<string, number>;
}

export interface StatsSummary {
  global: GlobalStatsSummary;
  perGame: GameStatsSummary[];
  recentMatches: MatchRecord[];
}

export interface ExportRequest {
  format: ExportFormat;
  scope: 'profile' | 'matches' | 'game';
  gameId?: string;
}

export interface ExportResult {
  path: string;
  format: ExportFormat;
}

export interface PartyChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
}

export interface PartyRoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
}

export interface PartyRoomSettings {
  privateRoom: boolean;
  maxPlayers: number;
  currentGameId: string;
  rotation: string[];
}

export interface PartyRoom {
  code: string;
  hostId: string;
  players: PartyRoomPlayer[];
  chat: PartyChatMessage[];
  settings: PartyRoomSettings;
  createdAt: string;
}

export interface HostRoomRequest {
  hostName: string;
  currentGameId: string;
}

export interface JoinRoomRequest {
  code: string;
  playerName: string;
}

export interface PartyChatRequest {
  code: string;
  playerId: string;
  message: string;
}

export interface PartyReadyRequest {
  code: string;
  playerId: string;
}

export interface PartySettingsRequest {
  code: string;
  playerId: string;
  patch: Partial<PartyRoomSettings>;
}

export interface BootstrapPayload {
  appName: string;
  version: string;
  profile: ProfileSummary;
  availableProfiles: ProfileSummary[];
  settings: AppSettings;
  saves: SaveSlot[];
  stats: StatsSummary;
  mods: ModManifest[];
  customPackages: ModManifest[];
  tutorialsSeen: string[];
  releaseNotes: string[];
  auth: AuthSessionState;
  syncStatus: SyncStatus;
  activeMatch: MatchSnapshot | null;
  updateStatus: UpdateStatus;
}

export interface ReleaseAsset {
  platform: 'windows' | 'macos' | 'linux';
  label: string;
  arch: string;
  format: string;
  url: string;
  checksumUrl: string;
  size: string;
  sha256?: string;
}

export interface ReleaseManifest {
  version: string;
  releaseDate: string;
  channel?: 'stable';
  minimumOs: {
    windows: string;
    macos: string;
    linux: string;
  };
  notes: string[];
  assets: ReleaseAsset[];
  links?: {
    website?: string;
    release?: string;
  };
}

export interface UpdateStatus {
  currentVersion: string;
  latestVersion: string | null;
  available: boolean;
  releaseUrl: string | null;
  downloadUrl: string | null;
  checkedAt: string | null;
  dismissed: boolean;
  error: string | null;
}

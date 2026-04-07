import type {
  AppSettings,
  AuthSessionState,
  CreatorTemplate,
  MatchStatus,
  ProfileSummary,
  SyncStatus,
  StatsSummary,
  UpdateStatus,
} from './contracts';

export const APP_NAME = 'TableTop Nexus';
export const APP_SCHEMA_VERSION = 1;
export const APP_COMPATIBILITY_VERSION = '1.0.0';

export const PLAYER_ACCENTS = ['#fdba74', '#67e8f9', '#f9a8d4', '#86efac'];

export const defaultProfile = (): ProfileSummary => ({
  id: 'profile-default',
  accountId: null,
  email: null,
  displayName: 'Player One',
  accent: '#67e8f9',
  avatarAsset: null,
  bannerAsset: null,
  authState: 'offline',
  achievementIds: [],
  linkedDevices: [],
  favouriteGameIds: [],
  recentGameIds: [],
  createdBy: 'local',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSyncedAt: null,
});

export const defaultAuthState = (): AuthSessionState => ({
  provider: 'local',
  configured: false,
  state: 'offline',
  email: null,
  pendingEmail: null,
  accountId: null,
  pendingCallbackUrl: null,
  lastError: null,
});

export const defaultSyncStatus = (): SyncStatus => ({
  phase: 'idle',
  lastSyncedAt: null,
  message: 'Sync is idle.',
  conflicts: [],
});

export const defaultSettings = (): AppSettings => ({
  reduceMotion: false,
  tutorialsEnabled: true,
  soundEnabled: true,
  highContrast: false,
  compactMode: false,
  uiScale: 1,
});

export const emptyStats = (): StatsSummary => ({
  global: {
    totalPlayTimeSeconds: 0,
    totalGamesPlayed: 0,
    totalWins: 0,
    totalLosses: 0,
    totalDraws: 0,
    favouriteGameId: null,
    longestWinStreak: 0,
    mostPlayedMode: null,
  },
  perGame: [],
  recentMatches: [],
});

export const activeStatus = (message: string, currentPlayerId: string | null): MatchStatus => ({
  phase: 'active',
  message,
  currentPlayerId,
  winnerIds: [],
  isDraw: false,
  canSave: true,
  canRematch: false,
  rematchLabel: null,
});

export const defaultUpdateStatus = (currentVersion: string): UpdateStatus => ({
  currentVersion,
  latestVersion: null,
  available: false,
  releaseUrl: null,
  downloadUrl: null,
  checkedAt: null,
  dismissed: false,
  error: null,
});

export const creatorTemplates: CreatorTemplate[] = [
  {
    id: 'board-template',
    name: 'Board Game Template',
    category: 'board',
    description: 'Create grid-based games with movement rules, win conditions, and scoring toggles.',
    fields: [
      { id: 'boardWidth', label: 'Board Width', type: 'number', min: 3, max: 16, defaultValue: 8 },
      { id: 'boardHeight', label: 'Board Height', type: 'number', min: 3, max: 16, defaultValue: 8 },
      {
        id: 'turnOrder',
        label: 'Turn Order',
        type: 'select',
        options: ['Alternating', 'Teams', 'Freeform'],
        defaultValue: 'Alternating',
      },
      { id: 'specialActions', label: 'Special Actions', type: 'toggle', defaultValue: true },
    ],
  },
  {
    id: 'card-template',
    name: 'Card Game Template',
    category: 'card',
    description: 'Configure deck structure, turn phases, draw rules, and score targets.',
    fields: [
      { id: 'deckCount', label: 'Deck Count', type: 'number', min: 1, max: 8, defaultValue: 1 },
      { id: 'handSize', label: 'Opening Hand Size', type: 'number', min: 1, max: 10, defaultValue: 5 },
      { id: 'wildCards', label: 'Wild Cards Enabled', type: 'toggle', defaultValue: false },
      {
        id: 'winCondition',
        label: 'Win Condition',
        type: 'select',
        options: ['Highest Score', 'Empty Hand', 'Objective Tokens'],
        defaultValue: 'Highest Score',
      },
    ],
  },
  {
    id: 'party-template',
    name: 'Party Game Template',
    category: 'party',
    description: 'Assemble prompt packs, timers, teams, and round-based score rules.',
    fields: [
      { id: 'rounds', label: 'Rounds', type: 'number', min: 1, max: 20, defaultValue: 5 },
      { id: 'teamMode', label: 'Team Mode', type: 'toggle', defaultValue: true },
      { id: 'timerSeconds', label: 'Round Timer', type: 'number', min: 10, max: 300, defaultValue: 60 },
      { id: 'promptPackName', label: 'Prompt Pack Name', type: 'text', defaultValue: 'Friday Night Pack' },
    ],
  },
];

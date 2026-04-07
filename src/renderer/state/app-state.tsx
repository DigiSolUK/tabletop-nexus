import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { builtInGameCatalogue, getGameBundle } from '../../games/core/registry';
import { tutorialsById } from '../../games/core/tutorials';
import { createSnapshot } from '../../games/core/engine';
import { PLAYER_ACCENTS } from '../../shared/constants';
import type {
  AppSettings,
  BootstrapPayload,
  MatchRecord,
  MatchSetup,
  MatchSnapshot,
  ModManifest,
  PlayerSeat,
  ProfileSummary,
  SaveSlot,
  TutorialScript,
} from '../../shared/contracts';

interface AppStateValue {
  loading: boolean;
  bootstrap: BootstrapPayload | null;
  games: typeof builtInGameCatalogue;
  activeSnapshot: MatchSnapshot | null;
  exportMessage: string | null;
  activeTutorial: TutorialScript | null;
  activeTutorialStep: number;
  refresh: () => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  saveProfile: (profile: ProfileSummary) => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
  beginAuth: (email: string, mode: 'sign-in' | 'sign-up', displayName?: string) => Promise<void>;
  completeAuth: (callbackUrl: string) => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
  uploadAvatar: () => Promise<void>;
  startMatch: (setup: MatchSetup) => void;
  updateActiveSnapshot: (snapshot: MatchSnapshot) => void;
  clearActiveSnapshot: () => void;
  resumeSave: (saveId: string) => void;
  saveActiveSnapshot: (title: string) => Promise<void>;
  toggleFavourite: (gameId: string) => Promise<void>;
  recordCompletedMatch: (record: MatchRecord) => Promise<void>;
  showTutorial: (tutorialId: string) => Promise<void>;
  closeTutorial: (disableFuture?: boolean) => Promise<void>;
  nextTutorialStep: () => void;
  previousTutorialStep: () => void;
  importPackage: () => Promise<void>;
  createCustomPackage: (manifest: ModManifest) => Promise<void>;
  setModEnabled: (modId: string, enabled: boolean) => Promise<void>;
  setExportMessage: (message: string | null) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export const AppStateProvider = ({ children }: PropsWithChildren) => {
  const [loading, setLoading] = useState(true);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState<MatchSnapshot | null>(null);
  const [activeTutorial, setActiveTutorial] = useState<TutorialScript | null>(null);
  const [activeTutorialStep, setActiveTutorialStep] = useState(0);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const payload = await window.desktopAPI.bootstrap();
    setBootstrap(payload);
    setActiveSnapshot(payload.activeMatch);
    setLoading(false);
    if (payload.auth.pendingCallbackUrl && payload.auth.state !== 'authenticated') {
      await window.desktopAPI.completeAuth(payload.auth.pendingCallbackUrl);
      const refreshed = await window.desktopAPI.bootstrap();
      setBootstrap(refreshed);
      setActiveSnapshot(refreshed.activeMatch);
    }
    if (payload.settings.tutorialsEnabled && !payload.tutorialsSeen.includes('tutorial-app')) {
      setActiveTutorial(tutorialsById['tutorial-app']);
      setActiveTutorialStep(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSettings = useCallback(async (settings: AppSettings) => {
    const saved = await window.desktopAPI.saveSettings(settings);
    setBootstrap((current) => (current ? { ...current, settings: saved } : current));
  }, []);

  const saveProfile = useCallback(async (profile: ProfileSummary) => {
    const saved = await window.desktopAPI.saveProfile(profile);
    setBootstrap((current) =>
      current
        ? {
            ...current,
            profile: saved,
            availableProfiles: current.availableProfiles.some((entry) => entry.id === saved.id)
              ? current.availableProfiles.map((entry) => (entry.id === saved.id ? saved : entry))
              : [saved, ...current.availableProfiles],
          }
        : current
    );
  }, []);

  const switchProfile = useCallback(async (profileId: string) => {
    const payload = await window.desktopAPI.switchProfile(profileId);
    setBootstrap(payload);
    setActiveSnapshot(payload.activeMatch);
  }, []);

  const beginAuth = useCallback(async (email: string, mode: 'sign-in' | 'sign-up', displayName?: string) => {
    await window.desktopAPI.beginAuth({ email, mode, displayName });
    await refresh();
  }, [refresh]);

  const completeAuth = useCallback(async (callbackUrl: string) => {
    await window.desktopAPI.completeAuth(callbackUrl);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await window.desktopAPI.signOut();
    await refresh();
  }, [refresh]);

  const syncNow = useCallback(async () => {
    await window.desktopAPI.syncNow();
    await refresh();
  }, [refresh]);

  const uploadAvatar = useCallback(async () => {
    const saved = await window.desktopAPI.uploadAvatar();
    if (saved) {
      setBootstrap((current) =>
        current
          ? {
              ...current,
              profile: saved,
              availableProfiles: current.availableProfiles.map((entry) => (entry.id === saved.id ? saved : entry)),
            }
          : current
      );
    }
  }, []);

  const toggleFavourite = useCallback(
    async (gameId: string) => {
      if (!bootstrap) {
        return;
      }
      const favouriteGameIds = bootstrap.profile.favouriteGameIds.includes(gameId)
        ? bootstrap.profile.favouriteGameIds.filter((id) => id !== gameId)
        : [...bootstrap.profile.favouriteGameIds, gameId];
      await saveProfile({ ...bootstrap.profile, favouriteGameIds });
    },
    [bootstrap, saveProfile]
  );

  const touchRecent = useCallback(
    async (gameId: string) => {
      if (!bootstrap) {
        return;
      }
      const recentGameIds = [gameId, ...bootstrap.profile.recentGameIds.filter((id) => id !== gameId)].slice(0, 6);
      await saveProfile({ ...bootstrap.profile, recentGameIds });
    },
    [bootstrap, saveProfile]
  );

  const startMatch = useCallback(
    (setup: MatchSetup) => {
      const bundle = getGameBundle(setup.gameId);
      if (!bundle) {
        return;
      }
      const state = bundle.definition.createInitialState(setup);
      const status = bundle.definition.getStatus(state, setup);
      const snapshot = createSnapshot(setup.gameId, setup, state, status);
      setActiveSnapshot(snapshot);
      void window.desktopAPI.saveActiveMatch(snapshot);
      void touchRecent(setup.gameId);
      const tutorialId = bundle.definition.tutorial.id;
      if (bootstrap?.settings.tutorialsEnabled && setup.tutorialEnabled && !bootstrap.tutorialsSeen.includes(tutorialId)) {
        setActiveTutorial(bundle.definition.tutorial);
        setActiveTutorialStep(0);
      }
    },
    [bootstrap, touchRecent]
  );

  const updateActiveSnapshot = useCallback((snapshot: MatchSnapshot) => {
    setActiveSnapshot(snapshot);
    void window.desktopAPI.saveActiveMatch(snapshot);
  }, []);

  const clearActiveSnapshot = useCallback(() => {
    setActiveSnapshot(null);
    void window.desktopAPI.clearActiveMatch();
  }, []);

  const resumeSave = useCallback(
    (saveId: string) => {
      const slot = bootstrap?.saves.find((save) => save.id === saveId);
      if (!slot) {
        return;
      }
      setActiveSnapshot(slot.snapshot);
      void window.desktopAPI.saveActiveMatch(slot.snapshot);
      void touchRecent(slot.gameId);
    },
    [bootstrap, touchRecent]
  );

  const saveActiveSnapshot = useCallback(
    async (title: string) => {
      if (!activeSnapshot || !bootstrap) {
        return;
      }
      const slot: SaveSlot = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`,
        profileId: bootstrap.profile.id,
        title,
        gameId: activeSnapshot.gameId,
        updatedAt: new Date().toISOString(),
        snapshot: activeSnapshot,
      };
      const saved = await window.desktopAPI.saveSnapshot(slot);
      setBootstrap((current) => (current ? { ...current, saves: [saved, ...current.saves] } : current));
    },
    [activeSnapshot, bootstrap]
  );

  const recordCompletedMatch = useCallback(async (record: MatchRecord) => {
    await window.desktopAPI.recordMatch(record);
    await refresh();
  }, [refresh]);

  const showTutorial = useCallback(async (tutorialId: string) => {
    const tutorial = tutorialsById[tutorialId];
    if (!tutorial) {
      return;
    }
    setActiveTutorial(tutorial);
    setActiveTutorialStep(0);
  }, []);

  const closeTutorial = useCallback(
    async (disableFuture?: boolean) => {
      if (!activeTutorial) {
        return;
      }
      const tutorialsSeen = await window.desktopAPI.markTutorialSeen(activeTutorial.id);
      setBootstrap((current) => (current ? { ...current, tutorialsSeen } : current));
      if (disableFuture && bootstrap) {
        const updatedSettings = { ...bootstrap.settings, tutorialsEnabled: false };
        await saveSettings(updatedSettings);
      }
      setActiveTutorial(null);
      setActiveTutorialStep(0);
    },
    [activeTutorial, bootstrap, saveSettings]
  );

  const nextTutorialStep = useCallback(() => {
    setActiveTutorialStep((step) => {
      if (!activeTutorial) {
        return step;
      }
      return Math.min(step + 1, activeTutorial.steps.length - 1);
    });
  }, [activeTutorial]);

  const previousTutorialStep = useCallback(() => {
    setActiveTutorialStep((step) => Math.max(step - 1, 0));
  }, []);

  const importPackage = useCallback(async () => {
    await window.desktopAPI.importPackage();
    await refresh();
  }, [refresh]);

  const createCustomPackage = useCallback(async (manifest: ModManifest) => {
    await window.desktopAPI.createCustomPackage(manifest);
    await refresh();
  }, [refresh]);

  const setModEnabled = useCallback(
    async (modId: string, enabled: boolean) => {
      await window.desktopAPI.setModEnabled(modId, enabled);
      await refresh();
    },
    [refresh]
  );

  const value = useMemo<AppStateValue>(
    () => ({
      loading,
      bootstrap,
      games: builtInGameCatalogue,
      activeSnapshot,
      exportMessage,
      activeTutorial,
      activeTutorialStep,
      refresh,
      saveSettings,
      saveProfile,
      switchProfile,
      beginAuth,
      completeAuth,
      signOut,
      syncNow,
      uploadAvatar,
      startMatch,
      updateActiveSnapshot,
      clearActiveSnapshot,
      resumeSave,
      saveActiveSnapshot,
      toggleFavourite,
      recordCompletedMatch,
      showTutorial,
      closeTutorial,
      nextTutorialStep,
      previousTutorialStep,
      importPackage,
      createCustomPackage,
      setModEnabled,
      setExportMessage,
    }),
    [
      activeSnapshot,
      activeTutorial,
      activeTutorialStep,
      bootstrap,
      clearActiveSnapshot,
      closeTutorial,
      createCustomPackage,
      exportMessage,
      importPackage,
      loading,
      nextTutorialStep,
      previousTutorialStep,
      recordCompletedMatch,
      refresh,
      resumeSave,
      saveActiveSnapshot,
      saveProfile,
      saveSettings,
      setModEnabled,
      showTutorial,
      signOut,
      startMatch,
      switchProfile,
      syncNow,
      toggleFavourite,
      uploadAvatar,
      updateActiveSnapshot,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('App state is not available.');
  }
  return context;
};

export const buildPlayerSeats = (
  profile: ProfileSummary,
  gameId: string,
  mode: MatchSetup['mode'],
  playerCount: number,
  includeAi: boolean
): PlayerSeat[] =>
  Array.from({ length: playerCount }, (_, index) => {
    const aiPlayer = includeAi && index > 0;
    return {
      id: `${gameId}-seat-${index + 1}`,
      name: aiPlayer ? 'Nexus AI' : index === 0 ? profile.displayName : `Player ${index + 1}`,
      type: aiPlayer ? 'ai' : index === 0 ? 'human' : mode === 'local' ? 'guest' : 'human',
      accent: PLAYER_ACCENTS[index % PLAYER_ACCENTS.length],
      profileId: aiPlayer ? null : index === 0 ? profile.id : null,
      avatarAsset: aiPlayer ? null : index === 0 ? profile.avatarAsset : null,
      isLocal: !aiPlayer && index === 0,
    };
  });

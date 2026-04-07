import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { advanceSnapshot } from '../../games/core/engine';
import { getGameBundle } from '../../games/core/registry';
import type { MatchOutcome, MatchRecord } from '../../shared/contracts';
import { gameBackdropStyle } from '../app/game-art';
import { MatchShell } from '../components/MatchShell';
import { useAppState } from '../state/app-state';

export const MatchScreen = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const {
    bootstrap,
    activeSnapshot,
    clearActiveSnapshot,
    rematchActiveSnapshot,
    saveActiveSnapshot,
    updateActiveSnapshot,
    recordCompletedMatch,
    showTutorial,
  } =
    useAppState();
  const recordRef = useRef(new Set<string>());
  const bundle = gameId ? getGameBundle(gameId) : null;

  useEffect(() => {
    if (!activeSnapshot || !bundle || activeSnapshot.gameId !== gameId) {
      return;
    }
    const currentPlayer = activeSnapshot.setup.players.find((player) => player.id === activeSnapshot.status.currentPlayerId);
    if (activeSnapshot.status.phase !== 'active' || currentPlayer?.type !== 'ai' || !bundle.definition.createAiCommand) {
      return;
    }
    const timeout = window.setTimeout(() => {
      const command = bundle.definition.createAiCommand?.(
        activeSnapshot.state,
        activeSnapshot.setup,
        activeSnapshot.setup.aiDifficulty
      );
      if (!command) {
        return;
      }
      updateActiveSnapshot(advanceSnapshot(activeSnapshot, bundle.definition, command));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [activeSnapshot, bundle, gameId, updateActiveSnapshot]);

  useEffect(() => {
    if (!activeSnapshot || !bundle || activeSnapshot.status.phase !== 'complete' || recordRef.current.has(activeSnapshot.id)) {
      return;
    }
    const playerOutcomes = Object.fromEntries(
      activeSnapshot.setup.players.map((player) => [
        player.id,
        activeSnapshot.status.isDraw
          ? 'draw'
          : activeSnapshot.status.winnerIds.length === 0
            ? 'complete'
            : activeSnapshot.status.winnerIds.includes(player.id)
              ? 'win'
              : 'loss',
      ])
    ) as Record<string, MatchOutcome>;
    const localSeat =
      activeSnapshot.setup.players.find((player) => player.profileId === bootstrap?.profile.id) ??
      activeSnapshot.setup.players.find((player) => player.type === 'human') ??
      activeSnapshot.setup.players[0];
    const outcome = (playerOutcomes[localSeat.id] ?? 'complete') as MatchRecord['outcome'];
    const metrics = bundle.definition.getMetrics?.(activeSnapshot.state, activeSnapshot.setup) ?? {};
    const record: MatchRecord = {
      id: activeSnapshot.id,
      profileId: bootstrap?.profile.id,
      gameId: activeSnapshot.gameId,
      gameName: bundle.definition.manifest.name,
      mode: activeSnapshot.setup.mode,
      outcome,
      playerOutcomes,
      winnerIds: activeSnapshot.status.winnerIds,
      createdAt: activeSnapshot.updatedAt,
      durationSeconds: Math.max(30, Math.round((Date.now() - Date.parse(activeSnapshot.createdAt)) / 1000)),
      players: activeSnapshot.setup.players,
      metrics,
      completionSummary: activeSnapshot.status.message,
    };
    recordRef.current.add(activeSnapshot.id);
    void recordCompletedMatch(record);
  }, [activeSnapshot, bootstrap?.profile.id, bundle, recordCompletedMatch]);

  if (!activeSnapshot || !bundle || activeSnapshot.gameId !== gameId) {
    return (
      <section className="screen">
        <div className="surface-panel">
          <h2>No active match</h2>
          <p>Start a game from the setup screen or resume a save from the dashboard.</p>
          <button type="button" className="primary-button" onClick={() => navigate('/games')}>
            Browse games
          </button>
        </div>
      </section>
    );
  }

  const dispatch = (command: Parameters<typeof advanceSnapshot>[2]) => {
    updateActiveSnapshot(advanceSnapshot(activeSnapshot, bundle.definition, command));
  };

  return (
    <section className="screen">
      <MatchShell
        title={bundle.definition.manifest.name}
        snapshot={activeSnapshot}
        playerSummary={
          <div className="stack">
            <h3>Players</h3>
            {activeSnapshot.setup.players.map((player) => (
              <div
                key={player.id}
                className={`player-row ${activeSnapshot.status.currentPlayerId === player.id ? 'player-row--active' : ''}`}
              >
                <span className="profile-dot" style={{ background: player.accent }} />
                <div>
                  <strong>{player.name}</strong>
                  <p>{player.type}</p>
                </div>
              </div>
            ))}
          </div>
        }
        boardStyle={gameBackdropStyle(bundle.definition.manifest.id, bundle.definition.manifest.themeColor)}
        onSave={() => {
          const title = window.prompt('Save title', `${bundle.definition.manifest.name} save`);
          if (title) {
            void saveActiveSnapshot(title);
          }
        }}
        onTutorial={() => void showTutorial(bundle.definition.tutorial.id)}
        onRematch={() => {
          rematchActiveSnapshot();
        }}
        onBackToSetup={() => navigate(`/games/${activeSnapshot.gameId}/setup`)}
        onExit={() => {
          clearActiveSnapshot();
          navigate('/');
        }}
      >
        <bundle.Renderer snapshot={activeSnapshot as never} dispatch={dispatch} status={activeSnapshot.status} />
      </MatchShell>
    </section>
  );
};

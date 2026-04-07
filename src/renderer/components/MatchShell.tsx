import type { CSSProperties, ReactNode } from 'react';
import type { MatchSnapshot } from '../../shared/contracts';

interface MatchShellProps {
  title: string;
  snapshot: MatchSnapshot;
  playerSummary: ReactNode;
  boardStyle?: CSSProperties;
  onSave: () => void;
  onTutorial: () => void;
  onRematch: () => void;
  onBackToSetup: () => void;
  onExit: () => void;
  children: ReactNode;
}

const formatStatLabel = (value: string) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-z])(\d+)/gi, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const MatchShell = ({
  title,
  snapshot,
  playerSummary,
  boardStyle,
  onSave,
  onTutorial,
  onRematch,
  onBackToSetup,
  onExit,
  children,
}: MatchShellProps) => (
  <div className="match-shell">
    <header className="match-shell__header">
      <div className="stack">
        <span className="eyebrow">{snapshot.status.phase === 'complete' ? 'Round Complete' : 'In Match'}</span>
        <h2>{title}</h2>
        <p>{snapshot.status.message}</p>
        <div className="badge-row">
          <span className="pill">Round {snapshot.roundIndex + 1}</span>
          <span className="pill pill--muted">{snapshot.setup.mode}</span>
          {snapshot.sessionStats ? <span className="pill pill--success">Session live</span> : null}
        </div>
      </div>
      <div className="button-row">
        {snapshot.status.phase === 'complete' && (snapshot.status.canRematch ?? false) ? (
          <button type="button" className="primary-button" onClick={onRematch}>
            {snapshot.status.rematchLabel ?? 'Play Again'}
          </button>
        ) : null}
        {snapshot.status.phase === 'complete' ? (
          <button type="button" className="ghost-button" onClick={onBackToSetup}>
            Back to setup
          </button>
        ) : null}
        {snapshot.status.canSave ? (
          <button type="button" className="ghost-button" onClick={onSave}>
            Save
          </button>
        ) : null}
        <button type="button" className="ghost-button" onClick={onTutorial}>
          Tutorial
        </button>
        <button type="button" className="ghost-button" onClick={onExit}>
          Exit
        </button>
      </div>
    </header>
    <div className="match-shell__body">
      <aside className="match-shell__sidebar">
        {playerSummary}
        {snapshot.sessionStats ? (
          <section className="surface-panel surface-panel--compact hud-panel">
            <h4>Session summary</h4>
            <div className="stack">
              {Object.entries(snapshot.sessionStats).map(([key, value]) => (
                <div key={key} className="player-row">
                  <span>{formatStatLabel(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
      <section className="match-shell__board" style={boardStyle}>
        {children}
      </section>
    </div>
  </div>
);

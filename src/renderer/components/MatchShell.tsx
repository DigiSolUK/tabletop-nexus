import type { CSSProperties, ReactNode } from 'react';
import type { MatchSnapshot } from '../../shared/contracts';

interface MatchShellProps {
  title: string;
  snapshot: MatchSnapshot;
  playerSummary: ReactNode;
  boardStyle?: CSSProperties;
  onSave: () => void;
  onTutorial: () => void;
  onExit: () => void;
  children: ReactNode;
}

export const MatchShell = ({
  title,
  snapshot,
  playerSummary,
  boardStyle,
  onSave,
  onTutorial,
  onExit,
  children,
}: MatchShellProps) => (
  <div className="match-shell">
    <header className="match-shell__header">
      <div>
        <span className="eyebrow">In Match</span>
        <h2>{title}</h2>
        <p>{snapshot.status.message}</p>
      </div>
      <div className="button-row">
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
      <aside className="match-shell__sidebar">{playerSummary}</aside>
      <section className="match-shell__board" style={boardStyle}>
        {children}
      </section>
    </div>
  </div>
);

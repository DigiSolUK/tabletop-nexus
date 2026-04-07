import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { gameBackdropStyle } from '../app/game-art';
import { buildMatchSetup, buildPlayerSeats, useAppState } from '../state/app-state';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

const GameCard = ({ game }: { game: ReturnType<typeof useAppState>['games'][number] }) => {
  const navigate = useNavigate();
  const { bootstrap, toggleFavourite } = useAppState();
  const favourite = bootstrap?.profile.favouriteGameIds.includes(game.id);

  return (
    <article className="game-card">
      <div className="game-card__hero" style={gameBackdropStyle(game.id, game.themeColor)}>
        <div className="game-card__overlay">
          <span className="game-card__glyph">{game.artworkGlyph}</span>
          <small>{game.category}</small>
        </div>
      </div>
      <div className="game-card__body">
        <div className="panel-heading">
          <div>
            <h4>{game.name}</h4>
            <p>{game.shortDescription}</p>
          </div>
          <button type="button" className="icon-button" onClick={() => void toggleFavourite(game.id)}>
            {favourite ? 'Fav' : '+'}
          </button>
        </div>
        <div className="badge-row">
          {game.supportedModes.map((mode) => (
            <span key={mode} className="pill">
              {mode}
            </span>
          ))}
          <span className={`pill ${game.playable ? 'pill--success' : 'pill--muted'}`}>{game.playable ? 'Playable now' : 'Unavailable'}</span>
        </div>
        <button type="button" className="primary-button" onClick={() => navigate(`/games/${game.id}/setup`)}>
          {game.playable ? 'Start setup' : 'Unavailable'}
        </button>
      </div>
    </article>
  );
};

export const HomeScreen = () => {
  const navigate = useNavigate();
  const { bootstrap, games, resumeSave, activeSnapshot, clearActiveSnapshot } = useAppState();

  if (!bootstrap) {
    return null;
  }

  const recentGames = bootstrap.profile.recentGameIds
    .map((id) => games.find((game) => game.id === id))
    .filter(Boolean);
  const continueSave = bootstrap.saves[0];

  return (
    <section className="screen">
      <header className="hero-panel">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h2>Welcome back, {bootstrap.profile.displayName}</h2>
          <p>Pick up a save, jump into a quick match, or explore the creator and party tools.</p>
        </div>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => navigate('/games')}>
            Browse library
          </button>
          <button type="button" className="ghost-button" onClick={() => navigate('/party')}>
            Open party hub
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="surface-panel">
          <h3>Continue playing</h3>
          {activeSnapshot ? (
            <div className="stack">
              <p>There is an active session waiting in memory.</p>
              <div className="button-row">
                <button type="button" className="primary-button" onClick={() => navigate(`/play/${activeSnapshot.gameId}`)}>
                  Return to match
                </button>
                <button type="button" className="ghost-button" onClick={clearActiveSnapshot}>
                  Clear session
                </button>
              </div>
            </div>
          ) : continueSave ? (
            <div className="stack">
              <strong>{continueSave.title}</strong>
              <p>Updated {new Date(continueSave.updatedAt).toLocaleString()}</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  resumeSave(continueSave.id);
                  navigate(`/play/${continueSave.gameId}`);
                }}
              >
                Resume save
              </button>
            </div>
          ) : (
            <p>No save files yet. Start a game and create one from the match shell.</p>
          )}
        </section>

        <section className="surface-panel">
          <h3>Profile snapshot</h3>
          <div className="stat-grid">
            <article className="stat-card">
              <span>Total games</span>
              <strong>{bootstrap.stats.global.totalGamesPlayed}</strong>
            </article>
            <article className="stat-card">
              <span>Total wins</span>
              <strong>{bootstrap.stats.global.totalWins}</strong>
            </article>
            <article className="stat-card">
              <span>Favourite</span>
              <strong>{bootstrap.stats.global.favouriteGameId ?? 'TBD'}</strong>
            </article>
            <article className="stat-card">
              <span>Play time</span>
              <strong>{formatDuration(bootstrap.stats.global.totalPlayTimeSeconds)}</strong>
            </article>
          </div>
        </section>
      </div>

      <section className="surface-panel">
        <div className="panel-heading">
          <h3>Recently played</h3>
          <button type="button" className="ghost-button" onClick={() => navigate('/games')}>
            See full library
          </button>
        </div>
        <div className="game-card-grid">
          {(recentGames.length > 0 ? recentGames : games.filter((game) => game.playable).slice(0, 4)).map((game) =>
            game ? <GameCard key={game.id} game={game} /> : null
          )}
        </div>
      </section>
    </section>
  );
};

export const GamesScreen = () => {
  const { games } = useAppState();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'board' | 'card' | 'party' | 'playable'>('all');

  const filtered = games.filter((game) => {
    const matchesSearch = `${game.name} ${game.tags.join(' ')} ${game.description}`.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ? true : filter === 'playable' ? game.playable : game.category === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Game Library</span>
          <h2>Browse the full built-in catalogue</h2>
        </div>
      </header>
      <div className="toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, category, or tag"
          className="text-input"
        />
        <div className="button-row">
          {['all', 'board', 'card', 'party', 'playable'].map((value) => (
            <button
              key={value}
              type="button"
              className={`ghost-button ${filter === value ? 'ghost-button--active' : ''}`}
              onClick={() => setFilter(value as typeof filter)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="game-card-grid">
        {filtered.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
};

export const GameSetupScreen = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { bootstrap, games, startMatch } = useAppState();
  const game = games.find((entry) => entry.id === gameId);
  const [mode, setMode] = useState<'single' | 'local' | 'party'>('single');
  const [playerCount, setPlayerCount] = useState(2);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard' | 'adaptive'>('medium');
  const [tutorialEnabled, setTutorialEnabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    if (!game) {
      return;
    }
    setMode(game.supportedModes.includes('single') ? 'single' : game.supportedModes[0]);
    setPlayerCount(Math.max(game.playerCount[0], Math.min(2, game.playerCount[1])));
  }, [game]);

  if (!bootstrap || !game) {
    return <Navigate to="/games" replace />;
  }

  const includeAi = mode === 'single' && game.supportsAI && playerCount > 1;
  const players = buildPlayerSeats(bootstrap.profile, game.id, mode, playerCount, includeAi);

  const handleStart = () => {
    if (!game.playable) {
      navigate('/games');
      return;
    }
    if (mode === 'party') {
      navigate('/party');
      return;
    }
    const setup = buildMatchSetup(
      game.id,
      mode,
      players,
      aiDifficulty,
      tutorialEnabled,
      timerSeconds || undefined
    );
    startMatch(setup);
    navigate(`/play/${game.id}`);
  };

  return (
    <section className="screen">
      <header className="hero-panel hero-panel--art" style={gameBackdropStyle(game.id, game.themeColor)}>
        <div className="hero-panel__content">
          <span className="eyebrow">{game.category}</span>
          <h2>{game.name}</h2>
          <p>{game.description}</p>
        </div>
        <div className="badge-row">
          {game.tags.map((tag) => (
            <span key={tag} className="pill">
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Match setup</h3>
          <label className="field">
            <span>Mode</span>
            <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)} className="select-input">
              {game.supportedModes.map((supportedMode) => (
                <option key={supportedMode} value={supportedMode}>
                  {supportedMode}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Players</span>
            <input
              className="text-input"
              type="number"
              min={game.playerCount[0]}
              max={game.playerCount[1]}
              value={playerCount}
              onChange={(event) => setPlayerCount(Number(event.target.value))}
            />
          </label>
          {game.supportsAI ? (
            <label className="field">
              <span>AI difficulty</span>
              <select value={aiDifficulty} onChange={(event) => setAiDifficulty(event.target.value as typeof aiDifficulty)} className="select-input">
                {['easy', 'medium', 'hard', 'adaptive'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>Turn timer seconds</span>
            <input className="text-input" type="number" min={0} max={300} value={timerSeconds} onChange={(event) => setTimerSeconds(Number(event.target.value))} />
          </label>
          <label className="toggle-row">
            <input type="checkbox" checked={tutorialEnabled} onChange={(event) => setTutorialEnabled(event.target.checked)} />
            Start with the guided tutorial if available
          </label>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={handleStart}>
              {mode === 'party' ? 'Go to party hub' : game.playable ? 'Launch match' : 'Unavailable'}
            </button>
            <button type="button" className="ghost-button" onClick={() => navigate('/games')}>
              Cancel
            </button>
          </div>
        </section>

        <section className="surface-panel">
          <h3>Player preview</h3>
          <div className="stack">
            {players.map((player) => (
              <div key={player.id} className="player-row">
                <span className="profile-dot" style={{ background: player.accent }} />
                <div>
                  <strong>{player.name}</strong>
                  <p>{player.type}</p>
                </div>
              </div>
            ))}
          </div>
          <p>Theme: premium local table presentation with guided help, save support where applicable, and clear mode badges.</p>
        </section>
      </div>
    </section>
  );
};

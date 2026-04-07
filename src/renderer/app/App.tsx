import { useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { TutorialOverlay } from '../components/TutorialOverlay';
import { GameSetupScreen, GamesScreen, HomeScreen } from '../screens/dashboard-screens';
import { MatchScreen } from '../screens/match-screen';
import {
  CreateScreen,
  HelpScreen,
  ModsScreen,
  PartyScreen,
  ProfileScreen,
  SettingsScreen,
  StatsScreen,
} from '../screens/tool-screens';
import { AppStateProvider, useAppState } from '../state/app-state';
import '../styles/global.css';

const navItems = [
  { to: '/', label: 'Home', id: 'screen-home' },
  { to: '/profile', label: 'Profile', id: 'screen-profile' },
  { to: '/games', label: 'Games', id: 'screen-games' },
  { to: '/party', label: 'Party', id: 'screen-party' },
  { to: '/create', label: 'Create', id: 'screen-create' },
  { to: '/mods', label: 'Mods', id: 'screen-mods' },
  { to: '/stats', label: 'Stats', id: 'screen-stats' },
  { to: '/help', label: 'Help', id: 'screen-help' },
  { to: '/settings', label: 'Settings', id: 'screen-settings' },
];

const SplashScreen = () => (
  <div className="splash-screen">
    <div className="splash-card">
      <span className="eyebrow">TableTop Nexus</span>
      <h1>Loading your tactical lounge</h1>
      <p>Booting saves, profiles, local game runtimes, and the latest release intelligence.</p>
      <div className="loading-bar">
        <div className="loading-bar__fill" />
      </div>
    </div>
  </div>
);

const LaunchGateway = () => {
  const navigate = useNavigate();
  const { bootstrap } = useAppState();
  const [dismissed, setDismissed] = useState(false);

  if (!bootstrap || dismissed || bootstrap.auth.state === 'authenticated') {
    return null;
  }

  return (
    <div className="gateway-backdrop">
      <div className="gateway-card">
        <span className="eyebrow">Profile Entry</span>
        <h2>Choose how you want to play today</h2>
        <p>Stay local with offline saves and guest play, or sign in for cloud-ready profiles, synced settings, and backup-friendly saves.</p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => setDismissed(true)}>
            Continue offline
          </button>
          {['Sign in', 'Create account', 'Switch account'].map((label) => (
            <button
              key={label}
              type="button"
              className="ghost-button"
              onClick={() => {
                setDismissed(true);
                navigate('/profile');
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const AppChrome = () => {
  const { loading, bootstrap, exportMessage, setExportMessage, dismissUpdateNotice } = useAppState();

  if (loading || !bootstrap) {
    return <SplashScreen />;
  }

  return (
    <HashRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div>
            <span className="eyebrow">Premium Tech-Table Platform</span>
            <h1>TableTop Nexus</h1>
            <p>Board, card, and party games with creator tools, mods, stats, hosted lobbies, and now a cleaner rematch flow.</p>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
                id={item.id}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <section className="profile-card">
            <div className="player-row__identity">
              <div className="avatar-frame">
                {bootstrap.profile.avatarAsset ? (
                  <img src={bootstrap.profile.avatarAsset} alt={bootstrap.profile.displayName} />
                ) : (
                  <span>{bootstrap.profile.displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="profile-dot" style={{ background: bootstrap.profile.accent }} />
            </div>
            <div>
              <strong>{bootstrap.profile.displayName}</strong>
              <p>{bootstrap.auth.state} · {bootstrap.syncStatus.phase}</p>
            </div>
          </section>
        </aside>
        <main className="main-shell">
          {bootstrap.updateStatus.available ? (
            <section className="banner banner--update">
              <div className="stack">
                <strong>Update available</strong>
                <p>
                  Version {bootstrap.updateStatus.latestVersion} is ready. You’re currently on {bootstrap.updateStatus.currentVersion}.
                </p>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    if (bootstrap.updateStatus.downloadUrl) {
                      window.open(bootstrap.updateStatus.downloadUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Download update
                </button>
                <button type="button" className="ghost-button" onClick={() => void dismissUpdateNotice()}>
                  Dismiss
                </button>
              </div>
            </section>
          ) : null}
          {exportMessage ? (
            <button type="button" className="banner" onClick={() => setExportMessage(null)}>
              {exportMessage}
            </button>
          ) : null}
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/profile" element={<ProfileScreen />} />
            <Route path="/games" element={<GamesScreen />} />
            <Route path="/games/:gameId/setup" element={<GameSetupScreen />} />
            <Route path="/play/:gameId" element={<MatchScreen />} />
            <Route path="/party" element={<PartyScreen />} />
            <Route path="/create" element={<CreateScreen />} />
            <Route path="/mods" element={<ModsScreen />} />
            <Route path="/stats" element={<StatsScreen />} />
            <Route path="/help" element={<HelpScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <LaunchGateway />
      </div>
      <TutorialOverlay />
    </HashRouter>
  );
};

export const App = () => (
  <AppStateProvider>
    <AppChrome />
  </AppStateProvider>
);

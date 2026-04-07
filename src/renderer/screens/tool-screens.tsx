import { useEffect, useState } from 'react';
import { creatorTemplates } from '../../shared/constants';
import type { ModManifest, PartyRoom } from '../../shared/contracts';
import { tutorialsById } from '../../games/core/tutorials';
import { useAppState } from '../state/app-state';

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

export const PartyScreen = () => {
  const { bootstrap, games } = useAppState();
  const [room, setRoom] = useState<PartyRoom | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [hostName, setHostName] = useState(bootstrap?.profile.displayName ?? 'Player One');
  const [joinName, setJoinName] = useState('Guest Player');
  const [inviteCode, setInviteCode] = useState('');
  const [chat, setChat] = useState('');
  const [currentGameId, setCurrentGameId] = useState('tic-tac-toe');

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Party Hub</span>
          <h2>Host or join a direct local room</h2>
          <p>Host-authoritative lobby with invite codes, ready states, room settings, and chat.</p>
        </div>
      </header>
      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Host room</h3>
          <label className="field">
            <span>Host display name</span>
            <input className="text-input" value={hostName} onChange={(event) => setHostName(event.target.value)} />
          </label>
          <label className="field">
            <span>Starting game</span>
            <select className="select-input" value={currentGameId} onChange={(event) => setCurrentGameId(event.target.value)}>
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const nextRoom = await window.desktopAPI.hostRoom({ hostName, currentGameId });
              setRoom(nextRoom);
              setCurrentPlayerId(nextRoom.hostId);
              setInviteCode(nextRoom.code);
            }}
          >
            Create room
          </button>
          <hr className="divider" />
          <h3>Join room</h3>
          <label className="field">
            <span>Invite code</span>
            <input className="text-input" value={inviteCode} onChange={(event) => setInviteCode(event.target.value.toUpperCase())} />
          </label>
          <label className="field">
            <span>Player name</span>
            <input className="text-input" value={joinName} onChange={(event) => setJoinName(event.target.value)} />
          </label>
          <button
            type="button"
            className="ghost-button"
            onClick={async () => {
              const nextRoom = await window.desktopAPI.joinRoom({ code: inviteCode, playerName: joinName });
              setRoom(nextRoom);
              const joinedPlayer = [...nextRoom.players].reverse().find((player) => player.name === joinName);
              setCurrentPlayerId(joinedPlayer?.id ?? '');
            }}
          >
            Join by code
          </button>
        </section>
        <section className="surface-panel">
          <h3>Room lobby</h3>
          {room ? (
            <div className="stack">
              <div className="panel-heading">
                <div>
                  <strong>Invite code: {room.code}</strong>
                  <p>Current game: {room.settings.currentGameId}</p>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={async () => {
                    const nextRoom = await window.desktopAPI.leaveRoom(room.code, currentPlayerId);
                    setRoom(nextRoom);
                    if (!nextRoom) {
                      setCurrentPlayerId('');
                    }
                  }}
                >
                  Leave
                </button>
              </div>
              <div className="stack">
                {room.players.map((player) => (
                  <div key={player.id} className="player-row">
                    <div>
                      <strong>{player.name}</strong>
                      <p>{player.isHost ? 'Host' : player.ready ? 'Ready' : 'Not ready'}</p>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={async () => {
                        const nextRoom = await window.desktopAPI.toggleReady({ code: room.code, playerId: currentPlayerId });
                        setRoom(nextRoom);
                      }}
                      disabled={player.id !== currentPlayerId}
                    >
                      Toggle ready
                    </button>
                  </div>
                ))}
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={async () => {
                    const nextRoom = await window.desktopAPI.updatePartySettings({
                      code: room.code,
                      playerId: currentPlayerId,
                      patch: { privateRoom: !room.settings.privateRoom },
                    });
                    setRoom(nextRoom);
                  }}
                  disabled={room.hostId !== currentPlayerId}
                >
                  Toggle privacy
                </button>
              </div>
              <div className="chat-box">
                {room.chat.map((message) => (
                  <div key={message.id} className="chat-line">
                    <strong>{message.playerName}</strong>
                    <span>{message.message}</span>
                  </div>
                ))}
              </div>
              <div className="button-row">
                <input className="text-input" value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Type lobby chat" />
                <button
                  type="button"
                  className="primary-button"
                  onClick={async () => {
                    const nextRoom = await window.desktopAPI.sendPartyChat({ code: room.code, playerId: currentPlayerId, message: chat });
                    setRoom(nextRoom);
                    setChat('');
                  }}
                  disabled={!chat.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <p>Create or join a room to manage players, ready states, and room chat.</p>
          )}
        </section>
      </div>
    </section>
  );
};

export const CreateScreen = () => {
  const { bootstrap, createCustomPackage, setExportMessage } = useAppState();
  const [templateId, setTemplateId] = useState(creatorTemplates[0].id);
  const template = creatorTemplates.find((entry) => entry.id === templateId) ?? creatorTemplates[0];
  const [name, setName] = useState('My Custom Table');
  const [description, setDescription] = useState('A creator-built game package.');
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | boolean>>(
    Object.fromEntries(template.fields.map((field) => [field.id, field.defaultValue]))
  );

  useEffect(() => {
    setFieldValues(Object.fromEntries(template.fields.map((field) => [field.id, field.defaultValue])));
  }, [template]);

  if (!bootstrap) {
    return null;
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Creator</span>
          <h2>Build template-driven custom packages</h2>
          <p>Use constrained board, card, or party templates now, with export-ready manifests that slot into the mod pipeline.</p>
        </div>
      </header>
      <div className="two-column-layout">
        <section className="surface-panel">
          <label className="field">
            <span>Template</span>
            <select className="select-input" value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
              {creatorTemplates.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Package name</span>
            <input className="text-input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea className="text-area" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          {template.fields.map((field) => (
            <label key={field.id} className="field">
              <span>{field.label}</span>
              {field.type === 'toggle' ? (
                <input
                  type="checkbox"
                  checked={Boolean(fieldValues[field.id])}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.checked }))}
                />
              ) : field.type === 'select' ? (
                <select
                  className="select-input"
                  value={String(fieldValues[field.id])}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.id]: event.target.value }))}
                >
                  {field.options?.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="text-input"
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(fieldValues[field.id])}
                  onChange={(event) =>
                    setFieldValues((current) => ({
                      ...current,
                      [field.id]: field.type === 'number' ? Number(event.target.value) : event.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}
          <button
            type="button"
            className="primary-button"
            onClick={async () => {
              const manifest: ModManifest = {
                id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                name,
                packageType: 'custom-game',
                description,
                version: '1.0.0',
                compatibilityVersion: '1.0.0',
                author: bootstrap.profile.displayName,
                enabled: true,
                dependencies: [],
                conflicts: [],
                assets: [],
                payload: {
                  templateId,
                  category: template.category,
                  rules: fieldValues,
                },
              };
              await createCustomPackage(manifest);
              setExportMessage(`Custom package "${name}" exported to the local TableTop Nexus exports folder.`);
            }}
          >
            Export package
          </button>
        </section>
        <section className="surface-panel">
          <h3>Preview</h3>
          <pre className="code-panel">{JSON.stringify({ name, template: template.name, description, rules: fieldValues }, null, 2)}</pre>
        </section>
      </div>
    </section>
  );
};

export const ModsScreen = () => {
  const { bootstrap, importPackage, setModEnabled } = useAppState();
  if (!bootstrap) {
    return null;
  }
  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Mods</span>
          <h2>Manage mods and creator-built packages</h2>
        </div>
        <button type="button" className="primary-button" onClick={() => void importPackage()}>
          Import package
        </button>
      </header>
      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Imported mods</h3>
          <div className="stack">
            {bootstrap.mods.length > 0 ? (
              bootstrap.mods.map((mod) => (
                <div key={mod.id} className="mod-card">
                  <div>
                    <strong>{mod.name}</strong>
                    <p>{mod.description}</p>
                    <small>Compat {mod.compatibilityVersion}</small>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => void setModEnabled(mod.id, !mod.enabled)}>
                    {mod.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))
            ) : (
              <p>No mod packages have been imported yet.</p>
            )}
          </div>
        </section>
        <section className="surface-panel">
          <h3>Custom packages</h3>
          <div className="stack">
            {bootstrap.customPackages.length > 0 ? (
              bootstrap.customPackages.map((pkg) => (
                <div key={pkg.id} className="mod-card">
                  <div>
                    <strong>{pkg.name}</strong>
                    <p>{pkg.description}</p>
                    <small>{pkg.packageType}</small>
                  </div>
                </div>
              ))
            ) : (
              <p>Creator exports will show up here once you build them.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

export const StatsScreen = () => {
  const { bootstrap, setExportMessage } = useAppState();
  if (!bootstrap) {
    return null;
  }
  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Stats</span>
          <h2>Track performance and export reports</h2>
        </div>
        <div className="button-row">
          {['csv', 'json', 'pdf'].map((format) => (
            <button
              key={format}
              type="button"
              className="ghost-button"
              onClick={async () => {
                const result = await window.desktopAPI.exportStats({ format: format as 'csv' | 'json' | 'pdf', scope: 'profile' });
                if (result) {
                  setExportMessage(`Exported ${result.format.toUpperCase()} report to ${result.path}`);
                }
              }}
            >
              Export {format.toUpperCase()}
            </button>
          ))}
        </div>
      </header>
      <div className="stat-grid">
        <article className="stat-card">
          <span>Total play time</span>
          <strong>{formatDuration(bootstrap.stats.global.totalPlayTimeSeconds)}</strong>
        </article>
        <article className="stat-card">
          <span>Total matches</span>
          <strong>{bootstrap.stats.global.totalGamesPlayed}</strong>
        </article>
        <article className="stat-card">
          <span>Wins / Losses / Draws</span>
          <strong>
            {bootstrap.stats.global.totalWins} / {bootstrap.stats.global.totalLosses} / {bootstrap.stats.global.totalDraws}
          </strong>
        </article>
        <article className="stat-card">
          <span>Longest streak</span>
          <strong>{bootstrap.stats.global.longestWinStreak}</strong>
        </article>
      </div>
      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Per-game summary</h3>
          <div className="stack">
            {bootstrap.stats.perGame.length > 0 ? (
              bootstrap.stats.perGame.map((entry) => (
                <div key={entry.gameId} className="mod-card">
                  <div>
                    <strong>{entry.gameId}</strong>
                    <p>
                      {entry.matchCount} matches, {Math.round(entry.winRate * 100)}% win rate
                    </p>
                  </div>
                  <small>{formatDuration(entry.averageDurationSeconds)}</small>
                </div>
              ))
            ) : (
              <p>Finish matches to populate detailed stats and export-ready history.</p>
            )}
          </div>
        </section>
        <section className="surface-panel">
          <h3>Recent matches</h3>
          <div className="stack">
            {bootstrap.stats.recentMatches.length > 0 ? (
              bootstrap.stats.recentMatches.map((match) => (
                <div key={match.id} className="mod-card">
                  <div>
                    <strong>{match.gameName}</strong>
                    <p>{match.mode}</p>
                  </div>
                  <small>{match.outcome}</small>
                </div>
              ))
            ) : (
              <p>No match history yet.</p>
            )}
          </div>
        </section>
      </div>
    </section>
  );
};

export const HelpScreen = () => {
  const { bootstrap, showTutorial } = useAppState();
  if (!bootstrap) {
    return null;
  }
  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Help</span>
          <h2>Tutorials, onboarding, and release notes</h2>
        </div>
      </header>
      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Reopen tutorials</h3>
          <div className="stack">
            {Object.values(tutorialsById).map((tutorial) => (
              <button key={tutorial.id} type="button" className="ghost-button" onClick={() => void showTutorial(tutorial.id)}>
                {tutorial.title}
              </button>
            ))}
          </div>
        </section>
        <section className="surface-panel">
          <h3>Release notes</h3>
          <div className="stack">
            {bootstrap.releaseNotes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};

export const ProfileScreen = () => {
  const { bootstrap, saveProfile, switchProfile, beginAuth, signOut, syncNow, uploadAvatar } = useAppState();
  const [displayName, setDisplayName] = useState(bootstrap?.profile.displayName ?? '');
  const [accent, setAccent] = useState(bootstrap?.profile.accent ?? '#67e8f9');
  const [email, setEmail] = useState(bootstrap?.auth.email ?? '');
  const [newProfileName, setNewProfileName] = useState('Guest Two');

  useEffect(() => {
    setDisplayName(bootstrap?.profile.displayName ?? '');
    setAccent(bootstrap?.profile.accent ?? '#67e8f9');
    setEmail(bootstrap?.auth.email ?? '');
  }, [bootstrap]);

  if (!bootstrap) {
    return null;
  }

  const authDescription =
    bootstrap.auth.state === 'authenticated'
      ? `Signed in as ${bootstrap.auth.email ?? bootstrap.profile.displayName}`
      : bootstrap.auth.state === 'pending'
        ? `Magic link sent to ${bootstrap.auth.pendingEmail ?? bootstrap.auth.email ?? 'your email'}. Open it to return to TableTop Nexus.`
        : bootstrap.auth.lastError ?? 'Continue offline or sign in for sync and cloud backups.';

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Profiles</span>
          <h2>Identity, sync, and local account switching</h2>
          <p>Stay offline when you want, or connect a Supabase-backed account for cloud-ready saves and synced preferences.</p>
        </div>
      </header>

      <div className="two-column-layout">
        <section className="surface-panel">
          <div className="profile-hero">
            <div className="avatar-frame avatar-frame--large">
              {bootstrap.profile.avatarAsset ? <img src={bootstrap.profile.avatarAsset} alt={bootstrap.profile.displayName} /> : <span>{bootstrap.profile.displayName.slice(0, 2).toUpperCase()}</span>}
            </div>
            <div className="stack">
              <h3>{bootstrap.profile.displayName}</h3>
              <p>{authDescription}</p>
              <div className="badge-row">
                <span className="pill">{bootstrap.profile.authState}</span>
                <span className={`pill ${bootstrap.syncStatus.phase === 'success' ? 'pill--success' : 'pill--muted'}`}>{bootstrap.syncStatus.phase}</span>
                <span className="pill">Devices {bootstrap.profile.linkedDevices.length}</span>
              </div>
            </div>
          </div>

          <label className="field">
            <span>Display name</span>
            <input className="text-input" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          <label className="field">
            <span>Accent colour</span>
            <input className="text-input" value={accent} onChange={(event) => setAccent(event.target.value)} />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="primary-button"
              onClick={() =>
                void saveProfile({
                  ...bootstrap.profile,
                  displayName,
                  accent,
                  updatedAt: new Date().toISOString(),
                })
              }
            >
              Save current profile
            </button>
            <button type="button" className="ghost-button" onClick={() => void uploadAvatar()}>
              Upload avatar
            </button>
            <button type="button" className="ghost-button" onClick={() => void syncNow()}>
              Sync now
            </button>
            <button type="button" className="ghost-button" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
          {bootstrap.syncStatus.conflicts.length > 0 ? (
            <div className="stack">
              <strong>Sync conflicts</strong>
              {bootstrap.syncStatus.conflicts.map((conflict) => (
                <p key={`${conflict.entity}-${conflict.id}`}>
                  {conflict.entity} {conflict.id}: local {new Date(conflict.localUpdatedAt).toLocaleString()} vs cloud{' '}
                  {new Date(conflict.remoteUpdatedAt).toLocaleString()}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        <section className="surface-panel">
          <h3>Cloud sign-in</h3>
          <label className="field">
            <span>Email address</span>
            <input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <p>{authDescription}</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={() => void beginAuth(email, 'sign-in')} disabled={!email.trim()}>
              Sign in with magic link
            </button>
            <button type="button" className="ghost-button" onClick={() => void beginAuth(email, 'sign-up', displayName)} disabled={!email.trim()}>
              Create account
            </button>
          </div>
          <hr className="divider" />
          <h3>Local profiles</h3>
          <div className="stack">
            {bootstrap.availableProfiles.map((profile) => (
              <div key={profile.id} className="profile-switch-card">
                <div className="player-row">
                  <div className="player-row__identity">
                    <div className="avatar-frame">
                      {profile.avatarAsset ? <img src={profile.avatarAsset} alt={profile.displayName} /> : <span>{profile.displayName.slice(0, 2).toUpperCase()}</span>}
                    </div>
                    <div>
                      <strong>{profile.displayName}</strong>
                      <p>{profile.email ?? profile.authState}</p>
                    </div>
                  </div>
                  <button type="button" className="ghost-button" onClick={() => void switchProfile(profile.id)} disabled={profile.id === bootstrap.profile.id}>
                    {profile.id === bootstrap.profile.id ? 'Active' : 'Switch'}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="profile-create">
            <label className="field">
              <span>Create local profile</span>
              <input className="text-input" value={newProfileName} onChange={(event) => setNewProfileName(event.target.value)} />
            </label>
            <button
              type="button"
              className="ghost-button"
              onClick={async () => {
                const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
                await saveProfile({
                  ...bootstrap.profile,
                  id,
                  accountId: null,
                  email: null,
                  displayName: newProfileName,
                  accent,
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
                await switchProfile(id);
              }}
              disabled={!newProfileName.trim()}
            >
              Add local profile
            </button>
          </div>
        </section>
      </div>
    </section>
  );
};

export const SettingsScreen = () => {
  const { bootstrap, saveSettings } = useAppState();
  const [settings, setSettings] = useState(bootstrap?.settings ?? null);

  useEffect(() => {
    setSettings(bootstrap?.settings ?? null);
  }, [bootstrap]);

  if (!bootstrap || !settings) {
    return null;
  }

  return (
    <section className="screen">
      <header className="screen-header">
        <div>
          <span className="eyebrow">Settings</span>
          <h2>Accessibility and app behaviour</h2>
        </div>
      </header>
      <div className="two-column-layout">
        <section className="surface-panel">
          <h3>Accessibility and UX</h3>
          {([
            ['reduceMotion', 'Reduce motion'],
            ['tutorialsEnabled', 'Enable tutorials'],
            ['soundEnabled', 'Enable sound'],
            ['highContrast', 'High contrast'],
            ['compactMode', 'Compact panels'],
          ] as const).map(([key, label]) => (
            <label key={key} className="toggle-row">
              <input
                type="checkbox"
                checked={Boolean(settings[key])}
                onChange={(event) => setSettings({ ...settings, [key]: event.target.checked })}
              />
              {label}
            </label>
          ))}
          <label className="field">
            <span>UI scale</span>
            <input className="text-input" type="number" min={0.8} max={1.4} step={0.1} value={settings.uiScale} onChange={(event) => setSettings({ ...settings, uiScale: Number(event.target.value) })} />
          </label>
          <button type="button" className="primary-button" onClick={() => void saveSettings(settings)}>
            Save settings
          </button>
        </section>
        <section className="surface-panel">
          <h3>Current sync and profile context</h3>
          <p>Active profile: {bootstrap.profile.displayName}</p>
          <p>Auth state: {bootstrap.auth.state}</p>
          <p>Sync state: {bootstrap.syncStatus.phase}</p>
          <p>Use the Profiles screen to switch accounts, upload avatars, create local players, or sign in for cloud sync.</p>
        </section>
      </div>
    </section>
  );
};

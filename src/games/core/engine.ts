import type { ComponentType } from 'react';
import type {
  DifficultyLevel,
  GameManifest,
  MatchSetup,
  MatchSnapshot,
  MatchStatus,
  MoveCommand,
  ReplayEvent,
  TutorialScript,
} from '../../shared/contracts';
import { APP_SCHEMA_VERSION } from '../../shared/constants';

export interface CommandResult<TState> {
  state: TState;
  status: MatchStatus;
  events?: ReplayEvent[];
}

export interface GameRendererProps<TState> {
  snapshot: MatchSnapshot<TState>;
  dispatch: (command: MoveCommand) => void;
  status: MatchStatus;
}

export interface GameDefinition<TState = unknown> {
  manifest: GameManifest;
  tutorial: TutorialScript;
  createInitialState: (setup: MatchSetup) => TState;
  getStatus: (state: TState, setup: MatchSetup) => MatchStatus;
  applyCommand: (state: TState, setup: MatchSetup, command: MoveCommand) => CommandResult<TState>;
  getMetrics?: (state: TState, setup: MatchSetup) => Record<string, number>;
  createAiCommand?: (state: TState, setup: MatchSetup, difficulty: DifficultyLevel) => MoveCommand | null;
}

export interface GameBundle<TState = unknown> {
  definition: GameDefinition<TState>;
  Renderer: ComponentType<GameRendererProps<TState>>;
}

export const createCommand = <TPayload extends Record<string, unknown>>(
  playerId: string,
  type: string,
  payload: TPayload
): MoveCommand<TPayload> => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  playerId,
  type,
  payload,
  createdAt: new Date().toISOString(),
});

export const createSnapshot = <TState>(
  gameId: string,
  setup: MatchSetup,
  state: TState,
  status: MatchStatus
): MatchSnapshot<TState> => ({
  schemaVersion: APP_SCHEMA_VERSION,
  id: setup.id,
  gameId,
  setup,
  state,
  history: [],
  status,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const advanceSnapshot = <TState>(
  snapshot: MatchSnapshot<TState>,
  definition: GameDefinition<TState>,
  command: MoveCommand
): MatchSnapshot<TState> => {
  const result = definition.applyCommand(snapshot.state, snapshot.setup, command);
  const history = [
    ...snapshot.history,
    ...(result.events ?? [
      {
        id: command.id,
        actorId: command.playerId,
        type: command.type,
        payload: command.payload,
        createdAt: command.createdAt,
      },
    ]),
  ];

  return {
    ...snapshot,
    state: result.state,
    history,
    status: result.status,
    updatedAt: new Date().toISOString(),
  };
};

export const nextSeed = (seed: number): { seed: number; value: number } => {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  const next = (value ^ (value >>> 14)) >>> 0;
  return { seed: next, value: next / 4294967296 };
};

export const shuffleWithSeed = <T,>(items: T[], seed: number): { items: T[]; seed: number } => {
  const clone = [...items];
  let currentSeed = seed;
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const random = nextSeed(currentSeed);
    currentSeed = random.seed;
    const swapIndex = Math.floor(random.value * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return { items: clone, seed: currentSeed };
};

export const rotatePlayerId = (players: MatchSetup['players'], currentPlayerId: string): string => {
  const index = players.findIndex((player) => player.id === currentPlayerId);
  const nextIndex = index === -1 ? 0 : (index + 1) % players.length;
  return players[nextIndex].id;
};

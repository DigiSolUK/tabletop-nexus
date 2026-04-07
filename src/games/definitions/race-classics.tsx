import { createCommand, nextSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface LudoState {
  positions: Record<string, number>;
  currentPlayerId: string;
  lastRoll: number | null;
  awaitingMove: boolean;
}

interface BackgammonState {
  checkers: Record<string, number[]>;
  currentPlayerId: string;
  pendingDice: number[];
  lastRoll: number[];
  seed: number;
}

const nextSeat = (setup: MatchSetup, playerId: string) =>
  setup.players[(setup.players.findIndex((player) => player.id === playerId) + 1) % setup.players.length]?.id ?? playerId;

const rollDie = (seed: number) => {
  const rolled = nextSeed(seed);
  return { seed: rolled.seed, value: Math.floor(rolled.value * 6) + 1 };
};

const ludoHome = 24;

const ludoStatus = (state: LudoState, setup: MatchSetup): MatchStatus => {
  const winnerId = Object.entries(state.positions).find(([, position]) => position === ludoHome)?.[0];
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} reached home first.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  return activeStatus(
    state.awaitingMove
      ? `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} can move ${state.lastRoll} spaces.`
      : `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} should roll the die.`,
    state.currentPlayerId
  );
};

export const ludoBundle: GameBundle<LudoState> = {
  definition: {
    manifest: manifestById.ludo,
    tutorial: tutorialsById['tutorial-ludo'],
    createInitialState: (setup) => ({
      positions: Object.fromEntries(setup.players.map((player) => [player.id, -1])),
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      lastRoll: null,
      awaitingMove: false,
    }),
    getStatus: ludoStatus,
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: ludoStatus(state, setup) };
      }

      if (command.type === 'roll') {
        if (state.awaitingMove) {
          return { state, status: ludoStatus(state, setup) };
        }
        const roll = Number(command.payload.value);
        const currentPosition = state.positions[command.playerId];
        const canMove =
          (currentPosition === -1 && roll === 6) ||
          (currentPosition >= 0 && currentPosition + roll <= ludoHome);
        if (!canMove) {
          const nextState = {
            ...state,
            lastRoll: roll,
            awaitingMove: false,
            currentPlayerId: nextSeat(setup, command.playerId),
          };
          return { state: nextState, status: ludoStatus(nextState, setup) };
        }
        const nextState = { ...state, lastRoll: roll, awaitingMove: true };
        return { state: nextState, status: ludoStatus(nextState, setup) };
      }

      if (command.type !== 'move' || !state.awaitingMove || state.lastRoll === null) {
        return { state, status: ludoStatus(state, setup) };
      }

      const currentPosition = state.positions[command.playerId];
      const nextPosition = currentPosition === -1 ? 0 : currentPosition + state.lastRoll;
      const positions = Object.fromEntries(
        Object.entries(state.positions).map(([playerId, position]) => [
          playerId,
          playerId !== command.playerId && position === nextPosition && nextPosition < ludoHome ? -1 : position,
        ])
      );
      positions[command.playerId] = nextPosition;
      const extraTurn = state.lastRoll === 6 && nextPosition !== ludoHome;
      const nextState = {
        positions,
        currentPlayerId: extraTurn ? command.playerId : nextSeat(setup, command.playerId),
        lastRoll: null,
        awaitingMove: false,
      };
      return { state: nextState, status: ludoStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      furthestProgress: Math.max(...Object.values(state.positions)),
    }),
    createAiCommand: (state) => {
      if (!state.awaitingMove) {
        return createCommand(state.currentPlayerId, 'roll', { value: Math.floor(Math.random() * 6) + 1 });
      }
      return createCommand(state.currentPlayerId, 'move', {});
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const track = Array.from({ length: 25 }, (_, index) => index);
    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.positions[player.id] < 0 ? 'Start' : state.positions[player.id] === ludoHome ? 'Home' : state.positions[player.id]}</strong>
            </div>
          ))}
        </div>
        <div className="race-track">
          {track.map((space) => (
            <div key={space} className={`race-space ${space === ludoHome ? 'race-space--home' : ''}`}>
              <small>{space}</small>
              <div className="race-space__tokens">
                {snapshot.setup.players
                  .filter((player) => state.positions[player.id] === space)
                  .map((player) => (
                    <span key={player.id} className="race-token" style={{ background: player.accent }} />
                  ))}
              </div>
            </div>
          ))}
        </div>
        <div className="button-row">
          {!state.awaitingMove ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'roll', { value: Math.floor(Math.random() * 6) + 1 }))}
              disabled={snapshot.status.phase === 'complete'}
            >
              Roll die
            </button>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'move', {}))}
              disabled={snapshot.status.phase === 'complete'}
            >
              Move token {state.lastRoll} spaces
            </button>
          )}
          <p>Last roll: {state.lastRoll ?? 'none'}</p>
        </div>
      </div>
    );
  },
};

const backgammonWinner = (state: BackgammonState, setup: MatchSetup) =>
  setup.players.find((player, index) =>
    state.checkers[player.id].every((position) => (index === 0 ? position >= 12 : position < 0))
  )?.id ?? null;

const backgammonLegalMoves = (state: BackgammonState, setup: MatchSetup, playerId: string) => {
  const playerIndex = setup.players.findIndex((player) => player.id === playerId);
  const direction = playerIndex === 0 ? 1 : -1;
  return state.checkers[playerId].flatMap((position, checkerIndex) =>
    state.pendingDice.flatMap((die, dieIndex) => {
      const nextPosition = position + die * direction;
      const finished = playerIndex === 0 ? nextPosition >= 12 : nextPosition < 0;
      return finished || (nextPosition >= 0 && nextPosition < 12)
        ? [{ checkerIndex, dieIndex, nextPosition }]
        : [];
    })
  );
};

const backgammonStatus = (state: BackgammonState, setup: MatchSetup): MatchStatus => {
  const winnerId = backgammonWinner(state, setup);
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} bore off every checker.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  return activeStatus(
    state.pendingDice.length > 0
      ? `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is resolving dice ${state.pendingDice.join(', ')}.`
      : `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} should roll both dice.`,
    state.currentPlayerId
  );
};

export const backgammonBundle: GameBundle<BackgammonState> = {
  definition: {
    manifest: manifestById.backgammon,
    tutorial: tutorialsById['tutorial-backgammon'],
    createInitialState: (setup) => ({
      checkers: {
        [setup.players[0]?.id ?? 'player-1']: [0, 0, 0, 0, 0],
        [setup.players[1]?.id ?? 'player-2']: [11, 11, 11, 11, 11],
      },
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      pendingDice: [],
      lastRoll: [],
      seed: setup.seed,
    }),
    getStatus: backgammonStatus,
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: backgammonStatus(state, setup) };
      }
      if (command.type === 'roll') {
        if (state.pendingDice.length > 0) {
          return { state, status: backgammonStatus(state, setup) };
        }
        const first = rollDie(state.seed);
        const second = rollDie(first.seed);
        const dice = [first.value, second.value];
        const nextState = {
          ...state,
          seed: second.seed,
          lastRoll: dice,
          pendingDice: first.value === second.value ? [first.value, first.value, first.value, first.value] : dice,
        };
        return { state: nextState, status: backgammonStatus(nextState, setup) };
      }
      if (command.type !== 'move' || state.pendingDice.length === 0) {
        return { state, status: backgammonStatus(state, setup) };
      }
      const checkerIndex = Number(command.payload.checkerIndex);
      const dieIndex = Number(command.payload.dieIndex);
      const legalMove = backgammonLegalMoves(state, setup, command.playerId).find(
        (move) => move.checkerIndex === checkerIndex && move.dieIndex === dieIndex
      );
      if (!legalMove) {
        return { state, status: backgammonStatus(state, setup) };
      }
      const checkers = {
        ...state.checkers,
        [command.playerId]: state.checkers[command.playerId].map((position, index) =>
          index === checkerIndex ? legalMove.nextPosition : position
        ),
      };
      const pendingDice = state.pendingDice.filter((_, index) => index !== dieIndex);
      const legalAfterMove = pendingDice.length > 0 ? backgammonLegalMoves({ ...state, checkers, pendingDice }, setup, command.playerId) : [];
      const nextState = {
        ...state,
        checkers,
        pendingDice: legalAfterMove.length > 0 ? pendingDice : [],
        currentPlayerId: legalAfterMove.length > 0 ? command.playerId : nextSeat(setup, command.playerId),
      };
      return { state: nextState, status: backgammonStatus(nextState, setup) };
    },
    getMetrics: (state, setup) => ({
      borneOff:
        state.checkers[setup.players[0]?.id ?? 'player-1'].filter((position) => position >= 12).length +
        state.checkers[setup.players[1]?.id ?? 'player-2'].filter((position) => position < 0).length,
    }),
    createAiCommand: (state, setup) => {
      if (state.pendingDice.length === 0) {
        return createCommand(state.currentPlayerId, 'roll', {});
      }
      const move = backgammonLegalMoves(state, setup, state.currentPlayerId)[0];
      return move ? createCommand(state.currentPlayerId, 'move', move) : null;
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const playerId = snapshot.status.currentPlayerId ?? state.currentPlayerId;
    const moves = backgammonLegalMoves(state, snapshot.setup, playerId);

    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>
                {state.checkers[player.id].filter((position) =>
                  player.id === snapshot.setup.players[0]?.id ? position >= 12 : position < 0
                ).length}{' '}
                off
              </strong>
            </div>
          ))}
        </div>
        <div className="backgammon-board">
          {Array.from({ length: 12 }, (_, point) => (
            <div key={point} className="backgammon-point">
              <strong>{point}</strong>
              {snapshot.setup.players.map((player) => {
                const count = state.checkers[player.id].filter((position) => position === point).length;
                return count > 0 ? (
                  <div key={player.id} className="backgammon-stack">
                    {Array.from({ length: count }, (_, index) => (
                      <span key={index} className="race-token" style={{ background: player.accent }} />
                    ))}
                  </div>
                ) : null;
              })}
            </div>
          ))}
        </div>
        <div className="button-row">
          {state.pendingDice.length === 0 ? (
            <button type="button" className="primary-button" onClick={() => dispatch(createCommand(playerId, 'roll', {}))}>
              Roll dice
            </button>
          ) : (
            moves.map((move) => (
              <button key={`${move.checkerIndex}-${move.dieIndex}`} type="button" className="ghost-button" onClick={() => dispatch(createCommand(playerId, 'move', move))}>
                Move checker {move.checkerIndex + 1} using {state.pendingDice[move.dieIndex]}
              </button>
            ))
          )}
          <p>Last roll: {state.lastRoll.join(', ') || 'none'}</p>
        </div>
      </div>
    );
  },
};

export const raceClassics = {
  ludo: ludoBundle,
  backgammon: backgammonBundle,
};

import { createCommand, nextSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface BattleshipCell {
  ship: string | null;
  hit: boolean;
}

interface BattleshipState {
  boards: Record<string, BattleshipCell[][]>;
  currentPlayerId: string;
  lastAction: string;
}

const shipLengths = [5, 4, 3, 3, 2];
const boardSize = 8;

const emptyBoard = (): BattleshipCell[][] =>
  Array.from({ length: boardSize }, () =>
    Array.from({ length: boardSize }, () => ({ ship: null, hit: false }))
  );

const generateBoard = (seed: number): { board: BattleshipCell[][]; seed: number } => {
  const board = emptyBoard();
  let currentSeed = seed;
  shipLengths.forEach((length, shipIndex) => {
    let placed = false;
    while (!placed) {
      const orientationRoll = nextSeed(currentSeed);
      currentSeed = orientationRoll.seed;
      const horizontal = orientationRoll.value > 0.5;
      const rowRoll = nextSeed(currentSeed);
      currentSeed = rowRoll.seed;
      const columnRoll = nextSeed(currentSeed);
      currentSeed = columnRoll.seed;
      const startRow = Math.floor(rowRoll.value * boardSize);
      const startColumn = Math.floor(columnRoll.value * boardSize);
      const cells = Array.from({ length }, (_, offset) => [
        startRow + (horizontal ? 0 : offset),
        startColumn + (horizontal ? offset : 0),
      ]);
      const valid = cells.every(
        ([row, column]) =>
          row >= 0 && row < boardSize && column >= 0 && column < boardSize && !board[row][column].ship
      );
      if (valid) {
        cells.forEach(([row, column]) => {
          board[row][column] = { ship: `ship-${shipIndex}`, hit: false };
        });
        placed = true;
      }
    }
  });
  return { board, seed: currentSeed };
};

const remainingSegments = (board: BattleshipCell[][]) =>
  board.flat().filter((cell) => cell.ship && !cell.hit).length;

const opponentId = (setup: MatchSetup, playerId: string) =>
  setup.players.find((player) => player.id !== playerId)?.id ?? playerId;

const getStatus = (state: BattleshipState, setup: MatchSetup): MatchStatus => {
  const winnerId = setup.players.find((player) => remainingSegments(state.boards[player.id]) === 0)?.id;
  if (winnerId) {
    const victorId = opponentId(setup, winnerId);
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === victorId)?.name ?? 'Winner'} sank the final ship.`,
      currentPlayerId: null,
      winnerIds: [victorId],
      isDraw: false,
      canSave: false,
    };
  }
  return activeStatus(state.lastAction || 'Scan the enemy grid and fire.', state.currentPlayerId);
};

export const battleshipBundle: GameBundle<BattleshipState> = {
  definition: {
    manifest: manifestById.battleship,
    tutorial: tutorialsById['tutorial-battleship'],
    createInitialState: (setup) => {
      const first = generateBoard(setup.seed);
      const second = generateBoard(first.seed);
      return {
        boards: {
          [setup.players[0]?.id ?? 'player-1']: first.board,
          [setup.players[1]?.id ?? 'player-2']: second.board,
        },
        currentPlayerId: setup.players[0]?.id ?? 'player-1',
        lastAction: 'Fleets deployed. Open with a scouting shot.',
      };
    },
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'fire' || command.playerId !== state.currentPlayerId) {
        return { state, status: getStatus(state, setup) };
      }
      const targetId = opponentId(setup, command.playerId);
      const row = Number(command.payload.row);
      const column = Number(command.payload.column);
      const targetBoard = state.boards[targetId];
      const cell = targetBoard?.[row]?.[column];
      if (!cell || cell.hit) {
        return { state, status: getStatus(state, setup) };
      }

      const boards = {
        ...state.boards,
        [targetId]: targetBoard.map((line, rowIndex) =>
          line.map((entry, columnIndex) =>
            rowIndex === row && columnIndex === column ? { ...entry, hit: true } : entry
          )
        ),
      };
      const hit = Boolean(cell.ship);
      const nextPlayerId = setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId;
      const nextState = {
        ...state,
        boards,
        currentPlayerId: nextPlayerId,
        lastAction: hit ? 'Direct hit. The fleet took damage.' : 'Miss. The water is clear there.',
      };
      return { state: nextState, status: getStatus(nextState, setup) };
    },
    getMetrics: (state, setup) => {
      const playerBoard = state.boards[setup.players[0].id];
      const hits = playerBoard.flat().filter((cell) => cell.hit && cell.ship).length;
      const misses = playerBoard.flat().filter((cell) => cell.hit && !cell.ship).length;
      return {
        hitPercentage: hits + misses === 0 ? 0 : hits / (hits + misses),
      };
    },
    createAiCommand: (state, setup) => {
      const targetId = opponentId(setup, state.currentPlayerId);
      const board = state.boards[targetId];
      for (let row = 0; row < boardSize; row += 1) {
        for (let column = 0; column < boardSize; column += 1) {
          if (!board[row][column].hit) {
            return createCommand(state.currentPlayerId, 'fire', { row, column });
          }
        }
      }
      return null;
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const playerId = snapshot.status.currentPlayerId ?? state.currentPlayerId;
    const targetId = opponentId(snapshot.setup, playerId);
    const ownBoard = state.boards[playerId];
    const enemyBoard = state.boards[targetId];

    return (
      <div className="game-column">
        <div className="duo-grid">
          <div>
            <h4>Your fleet</h4>
            <div className="naval-grid">
              {ownBoard.flatMap((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <div key={`${rowIndex}-${columnIndex}`} className="naval-cell">
                    {cell.ship ? <span className={`naval-ship ${cell.hit ? 'naval-ship--hit' : ''}`} /> : null}
                    {!cell.ship && cell.hit ? <span className="naval-miss" /> : null}
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h4>Enemy waters</h4>
            <div className="naval-grid">
              {enemyBoard.flatMap((row, rowIndex) =>
                row.map((cell, columnIndex) => (
                  <button
                    key={`${rowIndex}-${columnIndex}`}
                    type="button"
                    className="naval-cell naval-cell--button"
                    onClick={() =>
                      dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'fire', { row: rowIndex, column: columnIndex }))
                    }
                    disabled={cell.hit || snapshot.status.phase === 'complete'}
                  >
                    {cell.hit ? <span className={cell.ship ? 'naval-ship naval-ship--hit' : 'naval-miss'} /> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
};

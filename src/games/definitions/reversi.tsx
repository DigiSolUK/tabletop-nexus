import { createCommand, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

type Disc = 'dark' | 'light' | null;
interface ReversiState {
  board: Disc[][];
  currentPlayerId: string;
  colours: Record<string, Exclude<Disc, null>>;
}

const dirs = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const initialBoard = (): Disc[][] => {
  const board = Array.from({ length: 8 }, () => Array<Disc>(8).fill(null));
  board[3][3] = 'light';
  board[3][4] = 'dark';
  board[4][3] = 'dark';
  board[4][4] = 'light';
  return board;
};

const discoverFlips = (board: Disc[][], row: number, column: number, colour: Exclude<Disc, null>) => {
  if (board[row][column]) {
    return [];
  }
  const opponent = colour === 'dark' ? 'light' : 'dark';
  return dirs.flatMap(([dr, dc]) => {
    const captured: Array<[number, number]> = [];
    let nextRow = row + dr;
    let nextColumn = column + dc;
    while (nextRow >= 0 && nextRow < 8 && nextColumn >= 0 && nextColumn < 8) {
      const cell = board[nextRow][nextColumn];
      if (cell === opponent) {
        captured.push([nextRow, nextColumn]);
      } else if (cell === colour) {
        return captured.length > 0 ? captured : [];
      } else {
        return [];
      }
      nextRow += dr;
      nextColumn += dc;
    }
    return [];
  });
};

const legalMoves = (board: Disc[][], colour: Exclude<Disc, null>) =>
  board.flatMap((row, rowIndex) =>
    row.flatMap((_, columnIndex) => {
      const flips = discoverFlips(board, rowIndex, columnIndex, colour);
      return flips.length > 0 ? [`${rowIndex},${columnIndex}`] : [];
    })
  );

const getStatus = (state: ReversiState, setup: MatchSetup): MatchStatus => {
  const darkCount = state.board.flat().filter((disc) => disc === 'dark').length;
  const lightCount = state.board.flat().filter((disc) => disc === 'light').length;
  const darkMoves = legalMoves(state.board, 'dark');
  const lightMoves = legalMoves(state.board, 'light');
  if (darkMoves.length === 0 && lightMoves.length === 0) {
    const winnerColour = darkCount === lightCount ? null : darkCount > lightCount ? 'dark' : 'light';
    const winnerId = winnerColour
      ? Object.entries(state.colours).find(([, colour]) => colour === winnerColour)?.[0] ?? null
      : null;
    return {
      phase: 'complete',
      message: winnerId ? `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} controls the board.` : 'Counts are tied after the final flip.',
      currentPlayerId: null,
      winnerIds: winnerId ? [winnerId] : [],
      isDraw: !winnerId,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is looking for a bracket move.`,
    state.currentPlayerId
  );
};

export const reversiBundle: GameBundle<ReversiState> = {
  definition: {
    manifest: manifestById.reversi,
    tutorial: tutorialsById['tutorial-reversi'],
    createInitialState: (setup) => ({
      board: initialBoard(),
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      colours: {
        [setup.players[0]?.id ?? 'player-1']: 'dark',
        [setup.players[1]?.id ?? 'player-2']: 'light',
      },
    }),
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: getStatus(state, setup) };
      }

      if (command.type === 'pass') {
        const nextPlayerId = setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId;
        const nextState = { ...state, currentPlayerId: nextPlayerId };
        return { state: nextState, status: getStatus(nextState, setup) };
      }

      if (command.type !== 'place') {
        return { state, status: getStatus(state, setup) };
      }

      const row = Number(command.payload.row);
      const column = Number(command.payload.column);
      const colour = state.colours[command.playerId];
      const flips = discoverFlips(state.board, row, column, colour);
      if (flips.length === 0) {
        return { state, status: getStatus(state, setup) };
      }

      const board = state.board.map((entry) => [...entry]);
      board[row][column] = colour;
      for (const [flipRow, flipColumn] of flips) {
        board[flipRow][flipColumn] = colour;
      }

      const nextPlayerId = setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId;
      const nextColour = state.colours[nextPlayerId];
      const fallbackPlayerId = command.playerId;
      const nextState = {
        ...state,
        board,
        currentPlayerId: legalMoves(board, nextColour).length === 0 ? fallbackPlayerId : nextPlayerId,
      };
      return { state: nextState, status: getStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      darkControl: state.board.flat().filter((disc) => disc === 'dark').length,
      lightControl: state.board.flat().filter((disc) => disc === 'light').length,
    }),
    createAiCommand: (state) => {
      const colour = state.colours[state.currentPlayerId];
      const moves = legalMoves(state.board, colour).map((move) => {
        const [row, column] = move.split(',').map(Number);
        return { move, flips: discoverFlips(state.board, row, column, colour).length };
      });
      if (moves.length === 0) {
        return createCommand(state.currentPlayerId, 'pass', {});
      }
      const best = moves.sort((a, b) => b.flips - a.flips)[0];
      const [row, column] = best.move.split(',').map(Number);
      return createCommand(state.currentPlayerId, 'place', { row, column });
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const currentColour = state.colours[snapshot.status.currentPlayerId ?? state.currentPlayerId];
    const currentMoves = currentColour ? legalMoves(state.board, currentColour) : [];
    return (
      <div className="game-column">
        <div className="board-eight board-eight--reversi">
          {state.board.map((row, rowIndex) =>
            row.map((disc, columnIndex) => {
              const key = `${rowIndex},${columnIndex}`;
              return (
                <button
                  key={key}
                  type="button"
                  className={`board-tile board-tile--reversi ${currentMoves.includes(key) ? 'board-tile--target' : ''}`}
                  onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'place', { row: rowIndex, column: columnIndex }))}
                  disabled={snapshot.status.phase === 'complete'}
                >
                  {disc ? <span className={`reversi-disc reversi-disc--${disc}`} /> : null}
                </button>
              );
            })
          )}
        </div>
        {currentMoves.length === 0 && snapshot.status.phase !== 'complete' ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'pass', {}))}
          >
            Pass turn
          </button>
        ) : null}
      </div>
    );
  },
};

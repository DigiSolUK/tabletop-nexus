import { createCommand, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

type Disc = 'R' | 'Y';
interface Connect4State {
  board: Array<Array<Disc | null>>;
  currentPlayerId: string;
  marks: Record<string, Disc>;
  moveCount: number;
  winnerId: string | null;
}

const directions = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

const getWinner = (state: Connect4State): string | null => {
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const current = state.board[row]?.[column];
      if (!current) {
        continue;
      }
      for (const [dr, dc] of directions) {
        let count = 1;
        for (let step = 1; step < 4; step += 1) {
          const nextRow = row + dr * step;
          const nextColumn = column + dc * step;
          if (
            nextRow < 0 ||
            nextRow >= 6 ||
            nextColumn < 0 ||
            nextColumn >= 7 ||
            state.board[nextRow]?.[nextColumn] !== current
          ) {
            break;
          }
          count += 1;
        }
        if (count >= 4) {
          return Object.entries(state.marks).find(([, value]) => value === current)?.[0] ?? null;
        }
      }
    }
  }
  return null;
};

const getStatus = (state: Connect4State, setup: MatchSetup): MatchStatus => {
  const winnerId = getWinner(state);
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} connected four.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  if (state.moveCount >= 42) {
    return {
      phase: 'complete',
      message: 'Every slot is filled. This match ends in a draw.',
      currentPlayerId: null,
      winnerIds: [],
      isDraw: true,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is lining up a drop.`,
    state.currentPlayerId
  );
};

const cloneBoard = (board: Connect4State['board']) => board.map((row) => [...row]);

const dropDisc = (board: Connect4State['board'], column: number, disc: Disc): Connect4State['board'] | null => {
  const nextBoard = cloneBoard(board);
  for (let row = 5; row >= 0; row -= 1) {
    if (!nextBoard[row][column]) {
      nextBoard[row][column] = disc;
      return nextBoard;
    }
  }
  return null;
};

export const connect4Bundle: GameBundle<Connect4State> = {
  definition: {
    manifest: manifestById['connect-4'],
    tutorial: tutorialsById['tutorial-connect-4'],
    createInitialState: (setup) => ({
      board: Array.from({ length: 6 }, () => Array<Disc | null>(7).fill(null)),
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      marks: {
        [setup.players[0]?.id ?? 'player-1']: 'R',
        [setup.players[1]?.id ?? 'player-2']: 'Y',
      },
      moveCount: 0,
      winnerId: null,
    }),
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'drop') {
        return { state, status: getStatus(state, setup) };
      }
      const column = Number(command.payload.column);
      const disc = state.marks[command.playerId];
      if (Number.isNaN(column) || column < 0 || column > 6 || !disc || command.playerId !== state.currentPlayerId) {
        return { state, status: getStatus(state, setup) };
      }

      const nextBoard = dropDisc(state.board, column, disc);
      if (!nextBoard) {
        return { state, status: getStatus(state, setup) };
      }

      const nextState: Connect4State = {
        ...state,
        board: nextBoard,
        moveCount: state.moveCount + 1,
        currentPlayerId: setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId,
      };
      nextState.winnerId = getWinner(nextState);
      return {
        state: nextState,
        status: getStatus(nextState, setup),
      };
    },
    getMetrics: (state) => ({
      discsPlayed: state.moveCount,
    }),
    createAiCommand: (state) => {
      const playerId = state.currentPlayerId;
      const validColumns = Array.from({ length: 7 }, (_, index) => index).filter((column) => !state.board[0][column]);
      for (const column of validColumns) {
        const nextBoard = dropDisc(state.board, column, state.marks[playerId]);
        if (nextBoard && getWinner({ ...state, board: nextBoard })) {
          return createCommand(playerId, 'drop', { column });
        }
      }
      const opponentId = Object.keys(state.marks).find((id) => id !== playerId);
      for (const column of validColumns) {
        const disc = opponentId ? state.marks[opponentId] : undefined;
        if (!disc) {
          continue;
        }
        const nextBoard = dropDisc(state.board, column, disc);
        if (nextBoard && getWinner({ ...state, board: nextBoard })) {
          return createCommand(playerId, 'drop', { column });
        }
      }
      const preferred = [3, 2, 4, 1, 5, 0, 6].find((column) => validColumns.includes(column));
      return preferred === undefined ? null : createCommand(playerId, 'drop', { column: preferred });
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    return (
      <div className="game-column">
        <div className="connect-four-columns">
          {Array.from({ length: 7 }, (_, column) => (
            <button
              key={column}
              type="button"
              className="ghost-button"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'drop', { column }))}
              disabled={snapshot.status.phase === 'complete'}
            >
              Drop {column + 1}
            </button>
          ))}
        </div>
        <div className="game-grid game-grid--seven">
          {state.board.flatMap((row, rowIndex) =>
            row.map((cell, columnIndex) => (
              <div key={`${rowIndex}-${columnIndex}`} className="game-cell game-cell--disc">
                <div className={`disc disc--${cell ?? 'empty'}`} />
              </div>
            ))
          )}
        </div>
      </div>
    );
  },
};

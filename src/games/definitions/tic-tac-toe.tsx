import type { CSSProperties } from 'react';
import { createCommand, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

type Mark = 'X' | 'O';
interface TicTacToeState {
  board: Array<Mark | null>;
  currentPlayerId: string;
  marks: Record<string, Mark>;
  winnerId: string | null;
  moveCount: number;
}

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const getWinnerId = (state: TicTacToeState): string | null => {
  for (const [a, b, c] of lines) {
    const mark = state.board[a];
    if (mark && mark === state.board[b] && mark === state.board[c]) {
      return Object.entries(state.marks).find(([, value]) => value === mark)?.[0] ?? null;
    }
  }
  return null;
};

const getStatus = (state: TicTacToeState, setup: MatchSetup): MatchStatus => {
  const winnerId = getWinnerId(state);
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} completed three in a row.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  if (state.moveCount >= 9) {
    return {
      phase: 'complete',
      message: 'The grid is full. This round ends in a draw.',
      currentPlayerId: null,
      winnerIds: [],
      isDraw: true,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} to move.`,
    state.currentPlayerId
  );
};

const findBestMove = (state: TicTacToeState, playerId: string): number | null => {
  const mark = state.marks[playerId];
  const opponentMark = Object.values(state.marks).find((value) => value !== mark);
  const emptyIndices = state.board.flatMap((value, index) => (value ? [] : [index]));

  for (const index of emptyIndices) {
    const board = [...state.board];
    board[index] = mark;
    if (getWinnerId({ ...state, board })) {
      return index;
    }
  }

  for (const index of emptyIndices) {
    const board = [...state.board];
    if (opponentMark) {
      board[index] = opponentMark;
      if (getWinnerId({ ...state, board, marks: state.marks })) {
        return index;
      }
    }
  }

  if (state.board[4] === null) {
    return 4;
  }

  return emptyIndices[0] ?? null;
};

const cellStyle: CSSProperties = {
  aspectRatio: '1 / 1',
};

export const ticTacToeBundle: GameBundle<TicTacToeState> = {
  definition: {
    manifest: manifestById['tic-tac-toe'],
    tutorial: tutorialsById['tutorial-tic-tac-toe'],
    createInitialState: (setup) => ({
      board: Array<Mark | null>(9).fill(null),
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      marks: {
        [setup.players[0]?.id ?? 'player-1']: 'X',
        [setup.players[1]?.id ?? 'player-2']: 'O',
      },
      winnerId: null,
      moveCount: 0,
    }),
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'place') {
        return { state, status: getStatus(state, setup) };
      }
      const index = Number(command.payload.index);
      if (Number.isNaN(index) || state.board[index] || state.currentPlayerId !== command.playerId) {
        return { state, status: getStatus(state, setup) };
      }

      const nextBoard = [...state.board];
      nextBoard[index] = state.marks[command.playerId];
      const provisional = {
        ...state,
        board: nextBoard,
        moveCount: state.moveCount + 1,
        currentPlayerId: setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId,
      };
      const winnerId = getWinnerId(provisional);
      const nextState = { ...provisional, winnerId };
      return {
        state: nextState,
        status: getStatus(nextState, setup),
      };
    },
    getMetrics: (state) => ({
      movesPlayed: state.moveCount,
    }),
    createAiCommand: (state, setup) => {
      const playerId = state.currentPlayerId;
      const target = findBestMove(state, playerId);
      if (target === null) {
        return null;
      }
      return createCommand(playerId, 'place', { index: target, difficulty: setup.aiDifficulty });
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    return (
      <div className="game-column">
        <div className="game-grid game-grid--three">
          {state.board.map((cell, index) => (
            <button
              key={index}
              className="game-cell game-cell--large"
              style={cellStyle}
              type="button"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'place', { index }))}
              disabled={Boolean(cell) || snapshot.status.phase === 'complete'}
            >
              {cell}
            </button>
          ))}
        </div>
      </div>
    );
  },
};

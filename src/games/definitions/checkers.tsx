import { useMemo, useState } from 'react';
import { createCommand, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

type Piece = 'r' | 'R' | 'b' | 'B' | null;
interface CheckersState {
  board: Piece[][];
  currentPlayerId: string;
  colours: Record<string, 'r' | 'b'>;
  captures: Record<string, number>;
}

interface CheckersMove {
  from: string;
  to: string;
  capture: string | null;
}

const isKing = (piece: Piece) => piece === 'R' || piece === 'B';
const belongsTo = (piece: Piece, colour: 'r' | 'b') =>
  piece !== null && piece.toLowerCase() === colour;

const createBoard = (): Piece[][] =>
  Array.from({ length: 8 }, (_, row) =>
    Array.from({ length: 8 }, (_, column) => {
      if ((row + column) % 2 === 0) {
        return null;
      }
      if (row < 3) {
        return 'b';
      }
      if (row > 4) {
        return 'r';
      }
      return null;
    })
  );

const parseCell = (value: string): [number, number] => {
  const [row, column] = value.split(',').map(Number);
  return [row, column];
};

const inBounds = (row: number, column: number) => row >= 0 && row < 8 && column >= 0 && column < 8;

const legalMovesForPiece = (state: CheckersState, row: number, column: number): CheckersMove[] => {
  const piece = state.board[row][column];
  if (!piece) {
    return [];
  }
  const deltas =
    piece === 'r'
      ? [
          [-1, -1],
          [-1, 1],
        ]
      : piece === 'b'
        ? [
            [1, -1],
            [1, 1],
          ]
        : [
            [-1, -1],
            [-1, 1],
            [1, -1],
            [1, 1],
          ];

  return deltas.flatMap<CheckersMove>(([dr, dc]) => {
    const nextRow = row + dr;
    const nextColumn = column + dc;
    if (!inBounds(nextRow, nextColumn)) {
      return [];
    }
    if (!state.board[nextRow][nextColumn]) {
      return [{ from: `${row},${column}`, to: `${nextRow},${nextColumn}`, capture: null }];
    }
    const jumpRow = row + dr * 2;
    const jumpColumn = column + dc * 2;
    if (!inBounds(jumpRow, jumpColumn) || state.board[jumpRow][jumpColumn]) {
      return [];
    }
    return [
      {
        from: `${row},${column}`,
        to: `${jumpRow},${jumpColumn}`,
        capture: `${nextRow},${nextColumn}`,
      },
    ];
  });
};

const allMoves = (state: CheckersState, colour: 'r' | 'b'): CheckersMove[] =>
  state.board.flatMap((row, rowIndex) =>
    row.flatMap((piece, columnIndex) =>
      belongsTo(piece, colour) ? legalMovesForPiece(state, rowIndex, columnIndex) : []
    )
  );

const winner = (state: CheckersState, setup: MatchSetup): string | null => {
  for (const player of setup.players.slice(0, 2)) {
    const colour = state.colours[player.id];
    const piecesRemaining = state.board.flat().some((piece) => belongsTo(piece, colour));
    if (!piecesRemaining || allMoves(state, colour).length === 0) {
      return setup.players.find((candidate) => candidate.id !== player.id)?.id ?? null;
    }
  }
  return null;
};

const getStatus = (state: CheckersState, setup: MatchSetup): MatchStatus => {
  const winnerId = winner(state, setup);
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} controls the last viable pieces.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is choosing a diagonal move.`,
    state.currentPlayerId
  );
};

export const checkersBundle: GameBundle<CheckersState> = {
  definition: {
    manifest: manifestById.checkers,
    tutorial: tutorialsById['tutorial-checkers'],
    createInitialState: (setup) => ({
      board: createBoard(),
      currentPlayerId: setup.players[0]?.id ?? 'player-1',
      colours: {
        [setup.players[0]?.id ?? 'player-1']: 'r',
        [setup.players[1]?.id ?? 'player-2']: 'b',
      },
      captures: {
        [setup.players[0]?.id ?? 'player-1']: 0,
        [setup.players[1]?.id ?? 'player-2']: 0,
      },
    }),
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'move' || command.playerId !== state.currentPlayerId) {
        return { state, status: getStatus(state, setup) };
      }
      const from = String(command.payload.from ?? '');
      const to = String(command.payload.to ?? '');
      const [fromRow, fromColumn] = parseCell(from);
      const [toRow, toColumn] = parseCell(to);
      const piece = state.board[fromRow]?.[fromColumn];
      const colour = state.colours[command.playerId];
      if (!belongsTo(piece, colour)) {
        return { state, status: getStatus(state, setup) };
      }
      const move = legalMovesForPiece(state, fromRow, fromColumn).find((candidate) => candidate.to === to);
      if (!move) {
        return { state, status: getStatus(state, setup) };
      }

      const board = state.board.map((row) => [...row]);
      board[fromRow][fromColumn] = null;
      let movedPiece = piece;
      if (colour === 'r' && toRow === 0) {
        movedPiece = 'R';
      } else if (colour === 'b' && toRow === 7) {
        movedPiece = 'B';
      } else if (isKing(piece)) {
        movedPiece = piece;
      }
      board[toRow][toColumn] = movedPiece;
      const captures = { ...state.captures };
      if (move.capture) {
        const [captureRow, captureColumn] = parseCell(move.capture);
        board[captureRow][captureColumn] = null;
        captures[command.playerId] += 1;
      }

      const nextState: CheckersState = {
        ...state,
        board,
        captures,
        currentPlayerId: setup.players.find((player) => player.id !== command.playerId)?.id ?? command.playerId,
      };
      return { state: nextState, status: getStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      captures: Object.values(state.captures).reduce((sum, value) => sum + value, 0),
    }),
    createAiCommand: (state) => {
      const colour = state.colours[state.currentPlayerId];
      const moves = allMoves(state, colour).sort(
        (a: CheckersMove, b: CheckersMove) => Number(Boolean(b.capture)) - Number(Boolean(a.capture))
      );
      const move = moves[0];
      return move ? createCommand(state.currentPlayerId, 'move', { from: move.from, to: move.to }) : null;
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const state = snapshot.state;
    const legalTargets = useMemo(() => {
      if (!selected) {
        return [];
      }
      const [row, column] = parseCell(selected);
      return legalMovesForPiece(state, row, column).map((move) => move.to);
    }, [selected, state]);

    return (
      <div className="game-column">
        <div className="board-eight">
          {state.board.map((row, rowIndex) =>
            row.map((piece, columnIndex) => {
              const key = `${rowIndex},${columnIndex}`;
              const darkTile = (rowIndex + columnIndex) % 2 === 1;
              const isTarget = legalTargets.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`board-tile ${darkTile ? 'board-tile--dark' : 'board-tile--light'} ${
                    selected === key ? 'board-tile--selected' : ''
                  } ${isTarget ? 'board-tile--target' : ''}`}
                  onClick={() => {
                    if (isTarget && selected) {
                      dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'move', { from: selected, to: key }));
                      setSelected(null);
                      return;
                    }
                    if (piece) {
                      setSelected(key);
                    }
                  }}
                >
                  {piece ? <span className={`checker checker--${piece.toLowerCase()} ${isKing(piece) ? 'checker--king' : ''}`} /> : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  },
};

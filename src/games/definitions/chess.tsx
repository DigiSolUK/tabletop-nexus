import { useMemo, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { createCommand, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface ChessState {
  fen: string;
  moveHistory: string[];
}

const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'] as const;

const pieceGlyph: Record<string, string> = {
  wp: '♙',
  wn: '♘',
  wb: '♗',
  wr: '♖',
  wq: '♕',
  wk: '♔',
  bp: '♟',
  bn: '♞',
  bb: '♝',
  br: '♜',
  bq: '♛',
  bk: '♚',
};

const deterministicIndex = (value: string, length: number) => {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return length === 0 ? 0 : hash % length;
};

const currentPlayerId = (game: Chess, setup: MatchSetup) =>
  (game.turn() === 'w' ? setup.players[0]?.id : setup.players[1]?.id) ?? null;

const statusForGame = (game: Chess, setup: MatchSetup): MatchStatus => {
  if (game.isCheckmate()) {
    const winnerId = game.turn() === 'w' ? setup.players[1]?.id : setup.players[0]?.id;
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} delivered checkmate.`,
      currentPlayerId: null,
      winnerIds: winnerId ? [winnerId] : [],
      isDraw: false,
      canSave: false,
    };
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return {
      phase: 'complete',
      message: 'The board position is drawn.',
      currentPlayerId: null,
      winnerIds: [],
      isDraw: true,
      canSave: false,
    };
  }
  const playerId = currentPlayerId(game, setup);
  return activeStatus(
    `${setup.players.find((player) => player.id === playerId)?.name ?? 'Current player'} to move${game.inCheck() ? ' and currently in check.' : '.'}`,
    playerId
  );
};

export const chessBundle: GameBundle<ChessState> = {
  definition: {
    manifest: manifestById.chess,
    tutorial: tutorialsById['tutorial-chess'],
    createInitialState: () => ({
      fen: new Chess().fen(),
      moveHistory: [],
    }),
    getStatus: (state, setup) => statusForGame(new Chess(state.fen), setup),
    applyCommand: (state, setup, command) => {
      if (command.type !== 'move') {
        return { state, status: statusForGame(new Chess(state.fen), setup) };
      }
      const game = new Chess(state.fen);
      const playerId = currentPlayerId(game, setup);
      if (playerId !== command.playerId) {
        return { state, status: statusForGame(game, setup) };
      }
      const from = String(command.payload.from ?? '');
      const to = String(command.payload.to ?? '');
      const promotion = String(command.payload.promotion ?? 'q');
      const move = game.move({ from, to, promotion });
      if (!move) {
        return { state, status: statusForGame(game, setup) };
      }
      const nextState: ChessState = {
        fen: game.fen(),
        moveHistory: [...state.moveHistory, move.san],
      };
      return { state: nextState, status: statusForGame(game, setup) };
    },
    getMetrics: (state) => ({
      movesPlayed: state.moveHistory.length,
    }),
    createAiCommand: (state, setup) => {
      const game = new Chess(state.fen);
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) {
        return null;
      }
      const preferred =
        moves.find((move) => move.captured) ??
        moves.find((move) => {
          const probe = new Chess(state.fen);
          probe.move(move);
          return probe.inCheck();
        }) ??
        moves[deterministicIndex(state.fen, moves.length)];
      return createCommand(currentPlayerId(game, setup) ?? '', 'move', {
        from: preferred.from,
        to: preferred.to,
        promotion: preferred.promotion ?? 'q',
      });
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const [selected, setSelected] = useState<string | null>(null);
    const game = useMemo(() => new Chess(snapshot.state.fen), [snapshot.state.fen]);
    const legalMoves = useMemo(
      () => (selected ? game.moves({ square: selected as Square, verbose: true }).map((move) => move.to) : []),
      [game, selected]
    );

    return (
      <div className="game-column">
        <div className="chess-board">
          {ranks.flatMap((rank, rowIndex) =>
            files.map((file, columnIndex) => {
              const square = `${file}${rank}` as Square;
              const piece = game.get(square);
              const dark = (rowIndex + columnIndex) % 2 === 1;
              const ownTurn = snapshot.status.currentPlayerId;
              return (
                <button
                  key={square}
                  type="button"
                  className={`board-tile ${dark ? 'board-tile--dark' : 'board-tile--light'} ${
                    selected === square ? 'board-tile--selected' : ''
                  } ${legalMoves.includes(square) ? 'board-tile--target' : ''}`}
                  onClick={() => {
                    if (selected && legalMoves.includes(square)) {
                      dispatch(createCommand(ownTurn ?? '', 'move', { from: selected, to: square, promotion: 'q' }));
                      setSelected(null);
                      return;
                    }
                    if (piece) {
                      const pieceOwner = piece.color === 'w' ? snapshot.setup.players[0]?.id : snapshot.setup.players[1]?.id;
                      if (pieceOwner === ownTurn) {
                        setSelected(square);
                      }
                    } else {
                      setSelected(null);
                    }
                  }}
                  disabled={snapshot.status.phase === 'complete'}
                >
                  {piece ? pieceGlyph[`${piece.color}${piece.type}`] : null}
                </button>
              );
            })
          )}
        </div>
        <div className="surface-panel surface-panel--compact">
          <h4>Move log</h4>
          <div className="move-log">{snapshot.state.moveHistory.length > 0 ? snapshot.state.moveHistory.join(' ') : 'No moves yet'}</div>
        </div>
      </div>
    );
  },
};

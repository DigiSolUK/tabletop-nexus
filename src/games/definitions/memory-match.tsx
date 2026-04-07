import { createCommand, shuffleWithSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface MemoryCard {
  id: string;
  symbol: string;
  matchedBy: string | null;
}

interface MemoryMatchState {
  deck: MemoryCard[];
  revealed: number[];
  currentPlayerId: string;
  scores: Record<string, number>;
  pendingMismatch: boolean;
}

const symbols = ['Sun', 'Moon', 'Star', 'Dice', 'Card', 'Pawn', 'Gem', 'Map'];

const getStatus = (state: MemoryMatchState, setup: MatchSetup): MatchStatus => {
  const matchedCards = state.deck.filter((card) => card.matchedBy).length;
  if (matchedCards === state.deck.length) {
    const scores = Object.entries(state.scores).sort((a, b) => b[1] - a[1]);
    const [winnerId, winnerScore] = scores[0] ?? [null, 0];
    const secondScore = scores[1]?.[1] ?? winnerScore;
    const isDraw = winnerScore === secondScore;
    return {
      phase: 'complete',
      message: isDraw
        ? 'Every pair has been found and the final score is tied.'
        : `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} found the most pairs.`,
      currentPlayerId: null,
      winnerIds: isDraw || !winnerId ? [] : [winnerId],
      isDraw,
      canSave: false,
    };
  }

  return activeStatus(
    state.pendingMismatch
      ? 'Resolve the mismatch to hand the turn over.'
      : `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is flipping cards.`,
    state.currentPlayerId
  );
};

export const memoryMatchBundle: GameBundle<MemoryMatchState> = {
  definition: {
    manifest: manifestById['memory-match'],
    tutorial: tutorialsById['tutorial-memory-match'],
    createInitialState: (setup) => {
      const cards = symbols.flatMap((symbol, index) => [
        { id: `${symbol}-${index}-a`, symbol, matchedBy: null },
        { id: `${symbol}-${index}-b`, symbol, matchedBy: null },
      ]);
      const shuffled = shuffleWithSeed(cards, setup.seed);
      return {
        deck: shuffled.items,
        revealed: [],
        currentPlayerId: setup.players[0]?.id ?? 'player-1',
        scores: Object.fromEntries(setup.players.map((player) => [player.id, 0])),
        pendingMismatch: false,
      };
    },
    getStatus,
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: getStatus(state, setup) };
      }

      if (command.type === 'resolve') {
        const nextPlayerId = setup.players[(setup.players.findIndex((player) => player.id === command.playerId) + 1) % setup.players.length]?.id ?? command.playerId;
        const nextState = { ...state, revealed: [], pendingMismatch: false, currentPlayerId: nextPlayerId };
        return { state: nextState, status: getStatus(nextState, setup) };
      }

      if (command.type !== 'flip' || state.pendingMismatch) {
        return { state, status: getStatus(state, setup) };
      }

      const index = Number(command.payload.index);
      if (Number.isNaN(index) || state.revealed.includes(index) || state.deck[index]?.matchedBy) {
        return { state, status: getStatus(state, setup) };
      }

      const revealed = [...state.revealed, index];
      if (revealed.length < 2) {
        const nextState = { ...state, revealed };
        return { state: nextState, status: getStatus(nextState, setup) };
      }

      const [first, second] = revealed;
      if (state.deck[first].symbol === state.deck[second].symbol) {
        const deck = state.deck.map((card, cardIndex) =>
          cardIndex === first || cardIndex === second ? { ...card, matchedBy: command.playerId } : card
        );
        const nextState = {
          ...state,
          deck,
          revealed: [],
          scores: { ...state.scores, [command.playerId]: state.scores[command.playerId] + 1 },
        };
        return { state: nextState, status: getStatus(nextState, setup) };
      }

      const nextState = { ...state, revealed, pendingMismatch: true };
      return { state: nextState, status: getStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      pairsFound: Object.values(state.scores).reduce((sum, score) => sum + score, 0),
    }),
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    return (
      <div className="game-column">
        <div className="score-row">
          {Object.entries(state.scores).map(([playerId, score]) => (
            <div key={playerId} className="score-card">
              <span>{snapshot.setup.players.find((player) => player.id === playerId)?.name}</span>
              <strong>{score}</strong>
            </div>
          ))}
        </div>
        <div className="memory-grid">
          {state.deck.map((card, index) => {
            const isOpen = state.revealed.includes(index) || Boolean(card.matchedBy);
            return (
              <button
                key={card.id}
                type="button"
                className={`memory-card ${isOpen ? 'memory-card--open' : ''}`}
                onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'flip', { index }))}
                disabled={Boolean(card.matchedBy) || state.pendingMismatch}
              >
                <span>{isOpen ? card.symbol : '?'}</span>
              </button>
            );
          })}
        </div>
        {state.pendingMismatch ? (
          <button
            type="button"
            className="primary-button"
            onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'resolve', {}))}
          >
            Continue
          </button>
        ) : null}
      </div>
    );
  },
};

import { createCommand, createRuntimeId, nextSeed, shuffleWithSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface Card {
  id: string;
  suit: string;
  rank: string;
}

interface BlackjackState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  roundOver: boolean;
  chipDelta: number;
  session: {
    handsPlayed: number;
    wins: number;
    losses: number;
    pushes: number;
    netChipDelta: number;
  };
}

const suits = ['Spades', 'Hearts', 'Clubs', 'Diamonds'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () =>
  suits.flatMap((suit) => ranks.map((rank) => ({ id: `${suit}-${rank}`, suit, rank })));

const handValue = (hand: Card[]) => {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
};

const draw = (state: BlackjackState, count: number) => {
  const cards = state.deck.slice(0, count);
  return {
    cards,
    deck: state.deck.slice(count),
  };
};

const createRound = (setup: MatchSetup, session?: BlackjackState['session']): BlackjackState => {
  const shuffled = shuffleWithSeed(createDeck(), setup.seed);
  const firstState: BlackjackState = {
    deck: shuffled.items,
    playerHand: [],
    dealerHand: [],
    roundOver: false,
    chipDelta: 0,
    session: session ?? {
      handsPlayed: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      netChipDelta: 0,
    },
  };
  const playerDraw = draw(firstState, 2);
  const dealerDraw = draw({ ...firstState, deck: playerDraw.deck }, 2);
  return {
    ...firstState,
    deck: dealerDraw.deck,
    playerHand: playerDraw.cards,
    dealerHand: dealerDraw.cards,
  };
};

const withSessionResult = (state: BlackjackState, chipDelta: number): BlackjackState => ({
  ...state,
  chipDelta,
  roundOver: true,
  session: {
    handsPlayed: state.session.handsPlayed + 1,
    wins: state.session.wins + (chipDelta > 0 ? 1 : 0),
    losses: state.session.losses + (chipDelta < 0 ? 1 : 0),
    pushes: state.session.pushes + (chipDelta === 0 ? 1 : 0),
    netChipDelta: state.session.netChipDelta + chipDelta,
  },
});

const getStatus = (state: BlackjackState, setup: MatchSetup): MatchStatus => {
  if (!state.roundOver) {
    return activeStatus(
      `${setup.players[0]?.name ?? 'Player'} is deciding whether to hit or stand.`,
      setup.players[0]?.id ?? null
    );
  }
  const playerTotal = handValue(state.playerHand);
  const dealerTotal = handValue(state.dealerHand);
  const outcome =
    playerTotal > 21
      ? 'Bust. The house takes the round.'
      : dealerTotal > 21 || playerTotal > dealerTotal
        ? 'You beat the dealer.'
        : playerTotal === dealerTotal
          ? 'Push. Both hands stand equal.'
          : 'Dealer wins this round.';
  return {
    phase: 'complete',
    message: outcome,
    currentPlayerId: null,
    winnerIds: playerTotal > 21 ? [] : dealerTotal > 21 || playerTotal > dealerTotal ? [setup.players[0]?.id ?? 'player-1'] : [],
    isDraw: playerTotal === dealerTotal,
    canSave: false,
  };
};

export const blackjackBundle: GameBundle<BlackjackState> = {
  definition: {
    manifest: manifestById.blackjack,
    tutorial: tutorialsById['tutorial-blackjack'],
    createInitialState: (setup) => createRound(setup),
    getStatus,
    applyCommand: (state, setup, command) => {
      if (state.roundOver) {
        return { state, status: getStatus(state, setup) };
      }
      if (command.type === 'hit') {
        const nextDraw = draw(state, 1);
        const nextState = {
          ...state,
          deck: nextDraw.deck,
          playerHand: [...state.playerHand, ...nextDraw.cards],
        };
        const busted = handValue(nextState.playerHand) > 21;
        const finalState = busted ? withSessionResult(nextState, -10) : nextState;
        return { state: finalState, status: getStatus(finalState, setup) };
      }
      if (command.type === 'stand') {
        let nextState = { ...state };
        while (handValue(nextState.dealerHand) < 17 && nextState.deck.length > 0) {
          const nextDraw = draw(nextState, 1);
          nextState = {
            ...nextState,
            deck: nextDraw.deck,
            dealerHand: [...nextState.dealerHand, ...nextDraw.cards],
          };
        }
        const playerTotal = handValue(nextState.playerHand);
        const dealerTotal = handValue(nextState.dealerHand);
        const chipDelta = dealerTotal > 21 || playerTotal > dealerTotal ? 10 : playerTotal === dealerTotal ? 0 : -10;
        const finalState = withSessionResult(nextState, chipDelta);
        return { state: finalState, status: getStatus(finalState, setup) };
      }
      return { state, status: getStatus(state, setup) };
    },
    getSessionStats: (state) => state.session,
    createReplaySnapshot: (snapshot) => {
      const nextRound = nextSeed(snapshot.roundSeed);
      const setup = {
        ...snapshot.setup,
        id: createRuntimeId('blackjack'),
        tutorialEnabled: false,
        seed: nextRound.seed,
      };
      const priorState = snapshot.state as BlackjackState;
      const state = createRound(setup, priorState.session);
      const status = getStatus(state, setup);
      return {
        ...snapshot,
        id: setup.id,
        setup,
        state,
        history: [],
        status: {
          ...status,
          rematchLabel: 'Next Hand',
        },
        roundIndex: snapshot.roundIndex + 1,
        roundSeed: nextRound.seed,
        sessionStats: state.session,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    getMetrics: (state) => ({
      playerTotal: handValue(state.playerHand),
      dealerTotal: handValue(state.dealerHand),
      balanceChange: state.chipDelta,
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const playerTotal = handValue(state.playerHand);
    const dealerTotal = handValue(state.dealerHand);

    return (
      <div className="game-column">
        <div className="card-stack-panel">
          <section className="surface-panel">
            <h4>Dealer</h4>
            <div className="hand-row">
              {state.dealerHand.map((card) => (
                <div key={card.id} className="playing-card">
                  <span>{card.rank}</span>
                  <small>{card.suit}</small>
                </div>
              ))}
            </div>
            <p>Total: {state.roundOver ? dealerTotal : state.dealerHand.length > 0 ? '?' : 0}</p>
          </section>
          <section className="surface-panel">
            <h4>Player</h4>
            <div className="hand-row">
              {state.playerHand.map((card) => (
                <div key={card.id} className="playing-card playing-card--player">
                  <span>{card.rank}</span>
                  <small>{card.suit}</small>
                </div>
              ))}
            </div>
            <p>Total: {playerTotal}</p>
            <p>Round delta: {state.chipDelta}</p>
          </section>
        </div>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => dispatch(createCommand(snapshot.setup.players[0].id, 'hit', {}))} disabled={state.roundOver}>
            Hit
          </button>
          <button type="button" className="ghost-button" onClick={() => dispatch(createCommand(snapshot.setup.players[0].id, 'stand', {}))} disabled={state.roundOver}>
            Stand
          </button>
        </div>
      </div>
    );
  },
};

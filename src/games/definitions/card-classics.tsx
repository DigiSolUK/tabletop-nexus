import { createCommand, type GameBundle } from '../core/engine';
import { dealHands, evaluateBestHoldemHand, formatCard, type StandardCard, type StandardSuit } from '../core/cards';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchSetup, MatchStatus } from '../../shared/contracts';

interface HeartsState {
  hands: Record<string, StandardCard[]>;
  currentTrick: Array<{ playerId: string; card: StandardCard }>;
  currentPlayerId: string;
  scores: Record<string, number>;
  completedTricks: number;
}

interface CrazyEightsState {
  hands: Record<string, StandardCard[]>;
  drawPile: StandardCard[];
  discardPile: StandardCard[];
  currentSuit: StandardSuit;
  currentPlayerId: string;
}

type HoldemStage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
interface HoldemState {
  hands: Record<string, StandardCard[]>;
  drawPile: StandardCard[];
  community: StandardCard[];
  stage: HoldemStage;
}

const nextPlayer = (setup: MatchSetup, playerId: string) =>
  setup.players[(setup.players.findIndex((player) => player.id === playerId) + 1) % setup.players.length]?.id ?? playerId;

const sortHand = (cards: StandardCard[]) =>
  [...cards].sort((left, right) => left.suit.localeCompare(right.suit) || left.rank - right.rank);

const removeCardById = (cards: StandardCard[], cardId: string) => cards.filter((card) => card.id !== cardId);

const legalHeartsCards = (hand: StandardCard[], leadSuit: StandardSuit | null) => {
  if (!leadSuit) {
    return hand;
  }
  const followSuit = hand.filter((card) => card.suit === leadSuit);
  return followSuit.length > 0 ? followSuit : hand;
};

const resolveHeartsWinner = (trick: HeartsState['currentTrick']) => {
  const leadSuit = trick[0]?.card.suit;
  return trick
    .filter((entry) => entry.card.suit === leadSuit)
    .sort((left, right) => right.card.rank - left.card.rank)[0]?.playerId;
};

const resolveHeartsPoints = (trick: HeartsState['currentTrick']) =>
  trick.reduce((total, entry) => total + (entry.card.suit === 'H' ? 1 : 0) + (entry.card.suit === 'S' && entry.card.rank === 12 ? 13 : 0), 0);

const heartsStatus = (state: HeartsState, setup: MatchSetup): MatchStatus => {
  const cardsLeft = Object.values(state.hands).reduce((sum, hand) => sum + hand.length, 0);
  if (cardsLeft === 0 && state.currentTrick.length === 0) {
    const ordered = Object.entries(state.scores).sort((a, b) => a[1] - b[1]);
    const lowest = ordered[0]?.[1] ?? 0;
    const winnerIds = ordered.filter(([, score]) => score === lowest).map(([playerId]) => playerId);
    return {
      phase: 'complete',
      message:
        winnerIds.length > 1
          ? 'The round ends in a tie on the lowest heart score.'
          : `${setup.players.find((player) => player.id === winnerIds[0])?.name ?? 'Winner'} kept the fewest points.`,
      currentPlayerId: null,
      winnerIds: winnerIds.length === 1 ? winnerIds : [],
      isDraw: winnerIds.length > 1,
      canSave: false,
    };
  }
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is playing the next trick.`,
    state.currentPlayerId
  );
};

const chooseSuit = (cards: StandardCard[]): StandardSuit =>
  (['H', 'S', 'D', 'C'] as StandardSuit[])
    .map((suit) => ({ suit, count: cards.filter((card) => card.suit === suit).length }))
    .sort((left, right) => right.count - left.count)[0]?.suit ?? 'H';

const crazyStatus = (state: CrazyEightsState, setup: MatchSetup): MatchStatus => {
  const winnerId = Object.entries(state.hands).find(([, hand]) => hand.length === 0)?.[0];
  if (winnerId) {
    return {
      phase: 'complete',
      message: `${setup.players.find((player) => player.id === winnerId)?.name ?? 'Winner'} emptied their hand first.`,
      currentPlayerId: null,
      winnerIds: [winnerId],
      isDraw: false,
      canSave: false,
    };
  }
  const topCard = state.discardPile[state.discardPile.length - 1];
  return activeStatus(
    `${setup.players.find((player) => player.id === state.currentPlayerId)?.name ?? 'Current player'} is matching ${formatCard(topCard)} or suit ${state.currentSuit}.`,
    state.currentPlayerId
  );
};

const legalCrazyCards = (hand: StandardCard[], state: CrazyEightsState) => {
  const topCard = state.discardPile[state.discardPile.length - 1];
  return hand.filter((card) => card.rank === 8 || card.suit === state.currentSuit || card.rank === topCard.rank);
};

const holdemStatus = (state: HoldemState, setup: MatchSetup): MatchStatus => {
  if (state.stage === 'showdown') {
    const rankings = setup.players.map((player) => ({
      playerId: player.id,
      hand: evaluateBestHoldemHand([...state.community, ...state.hands[player.id]]),
    }));
    rankings.sort((left, right) => right.hand.category - left.hand.category);
    const best = rankings[0];
    const winnerIds = rankings.filter((entry) => entry.hand.category === best.hand.category && entry.hand.values.join(',') === best.hand.values.join(',')).map((entry) => entry.playerId);
    return {
      phase: 'complete',
      message:
        winnerIds.length > 1
          ? `Split pot with ${best.hand.label.toLowerCase()}.`
          : `${setup.players.find((player) => player.id === winnerIds[0])?.name ?? 'Winner'} takes the pot with ${best.hand.label.toLowerCase()}.`,
      currentPlayerId: null,
      winnerIds: winnerIds.length === 1 ? winnerIds : [],
      isDraw: winnerIds.length > 1,
      canSave: false,
    };
  }
  return activeStatus(`Advance the board from ${state.stage} to the next street.`, setup.players[0]?.id ?? null);
};

export const heartsBundle: GameBundle<HeartsState> = {
  definition: {
    manifest: manifestById.hearts,
    tutorial: tutorialsById['tutorial-hearts'],
    createInitialState: (setup) => {
      const deal = dealHands(setup.players.map((player) => player.id), Math.floor(52 / setup.players.length), setup.seed);
      const firstPlayer =
        setup.players.find((player) => deal.hands[player.id].some((card) => card.suit === 'C' && card.rank === 2))?.id ??
        setup.players[0]?.id ??
        'player-1';
      return {
        hands: Object.fromEntries(setup.players.map((player) => [player.id, sortHand(deal.hands[player.id])])),
        currentTrick: [],
        currentPlayerId: firstPlayer,
        scores: Object.fromEntries(setup.players.map((player) => [player.id, 0])),
        completedTricks: 0,
      };
    },
    getStatus: heartsStatus,
    applyCommand: (state, setup, command) => {
      if (command.type !== 'play' || command.playerId !== state.currentPlayerId) {
        return { state, status: heartsStatus(state, setup) };
      }
      const hand = state.hands[command.playerId];
      const card = hand.find((entry) => entry.id === command.payload.cardId);
      const leadSuit = state.currentTrick[0]?.card.suit ?? null;
      if (!card || !legalHeartsCards(hand, leadSuit).some((legal) => legal.id === card.id)) {
        return { state, status: heartsStatus(state, setup) };
      }

      const hands = { ...state.hands, [command.playerId]: removeCardById(hand, card.id) };
      const currentTrick = [...state.currentTrick, { playerId: command.playerId, card }];
      if (currentTrick.length < setup.players.length) {
        const nextState = {
          ...state,
          hands,
          currentTrick,
          currentPlayerId: nextPlayer(setup, command.playerId),
        };
        return { state: nextState, status: heartsStatus(nextState, setup) };
      }

      const winnerId = resolveHeartsWinner(currentTrick) ?? command.playerId;
      const nextState: HeartsState = {
        hands,
        currentTrick: [],
        currentPlayerId: winnerId,
        scores: { ...state.scores, [winnerId]: state.scores[winnerId] + resolveHeartsPoints(currentTrick) },
        completedTricks: state.completedTricks + 1,
      };
      return { state: nextState, status: heartsStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      trickCount: state.completedTricks,
      lowestScore: Math.min(...Object.values(state.scores)),
    }),
    createAiCommand: (state) => {
      const hand = state.hands[state.currentPlayerId];
      const legal = legalHeartsCards(hand, state.currentTrick[0]?.card.suit ?? null).sort((a, b) => a.rank - b.rank);
      return legal[0] ? createCommand(state.currentPlayerId, 'play', { cardId: legal[0].id }) : null;
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const hand = state.hands[snapshot.status.currentPlayerId ?? state.currentPlayerId] ?? [];
    const legal = legalHeartsCards(hand, state.currentTrick[0]?.card.suit ?? null).map((card) => card.id);

    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.scores[player.id]}</strong>
            </div>
          ))}
        </div>
        <div className="surface-panel surface-panel--compact">
          <h4>Current trick</h4>
          <div className="hand-row">
            {state.currentTrick.map((entry) => (
              <div key={`${entry.playerId}-${entry.card.id}`} className="playing-card">
                <span>{formatCard(entry.card)}</span>
                <small>{snapshot.setup.players.find((player) => player.id === entry.playerId)?.name}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="hand-row">
          {hand.map((card) => (
            <button
              key={card.id}
              type="button"
              className="playing-card playing-card--player"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'play', { cardId: card.id }))}
              disabled={!legal.includes(card.id) || snapshot.status.phase === 'complete'}
            >
              <span>{formatCard(card)}</span>
              <small>{card.suit}</small>
            </button>
          ))}
        </div>
      </div>
    );
  },
};

export const crazyEightsBundle: GameBundle<CrazyEightsState> = {
  definition: {
    manifest: manifestById['crazy-eights'],
    tutorial: tutorialsById['tutorial-crazy-eights'],
    createInitialState: (setup) => {
      const deal = dealHands(setup.players.map((player) => player.id), 5, setup.seed);
      const [firstDiscard, ...rest] = deal.deck;
      const safeDiscard = firstDiscard.rank === 8 ? { ...rest[0] } : firstDiscard;
      const remainingDeck = firstDiscard.rank === 8 ? [...rest.slice(1), firstDiscard] : rest;
      return {
        hands: Object.fromEntries(setup.players.map((player) => [player.id, sortHand(deal.hands[player.id])])),
        drawPile: remainingDeck,
        discardPile: [safeDiscard],
        currentSuit: safeDiscard.suit,
        currentPlayerId: setup.players[0]?.id ?? 'player-1',
      };
    },
    getStatus: crazyStatus,
    applyCommand: (state, setup, command) => {
      if (command.playerId !== state.currentPlayerId) {
        return { state, status: crazyStatus(state, setup) };
      }

      if (command.type === 'draw') {
        const drawCard = state.drawPile[0];
        if (!drawCard) {
          return { state, status: crazyStatus(state, setup) };
        }
        const nextState = {
          ...state,
          drawPile: state.drawPile.slice(1),
          hands: {
            ...state.hands,
            [command.playerId]: sortHand([...state.hands[command.playerId], drawCard]),
          },
          currentPlayerId: nextPlayer(setup, command.playerId),
        };
        return { state: nextState, status: crazyStatus(nextState, setup) };
      }

      if (command.type !== 'play') {
        return { state, status: crazyStatus(state, setup) };
      }

      const hand = state.hands[command.playerId];
      const card = hand.find((entry) => entry.id === command.payload.cardId);
      if (!card || !legalCrazyCards(hand, state).some((legal) => legal.id === card.id)) {
        return { state, status: crazyStatus(state, setup) };
      }
      const remainingHand = removeCardById(hand, card.id);
      const nextState = {
        ...state,
        hands: {
          ...state.hands,
          [command.playerId]: remainingHand,
        },
        discardPile: [...state.discardPile, card],
        currentSuit: card.rank === 8 ? chooseSuit(remainingHand) : card.suit,
        currentPlayerId: nextPlayer(setup, command.playerId),
      };
      return { state: nextState, status: crazyStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      cardsRemaining: Object.values(state.hands).reduce((sum, hand) => sum + hand.length, 0),
    }),
    createAiCommand: (state) => {
      const hand = state.hands[state.currentPlayerId];
      const legal = legalCrazyCards(hand, state).sort((a, b) => Number(a.rank === 8) - Number(b.rank === 8) || a.rank - b.rank);
      return legal[0]
        ? createCommand(state.currentPlayerId, 'play', { cardId: legal[0].id })
        : createCommand(state.currentPlayerId, 'draw', {});
    },
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const hand = state.hands[snapshot.status.currentPlayerId ?? state.currentPlayerId] ?? [];
    const legal = legalCrazyCards(hand, state).map((card) => card.id);
    const topCard = state.discardPile[state.discardPile.length - 1];

    return (
      <div className="game-column">
        <div className="score-row">
          {snapshot.setup.players.map((player) => (
            <div key={player.id} className="score-card">
              <span>{player.name}</span>
              <strong>{state.hands[player.id]?.length ?? 0} cards</strong>
            </div>
          ))}
        </div>
        <div className="card-stack-panel">
          <section className="surface-panel surface-panel--compact">
            <h4>Discard</h4>
            <div className="playing-card">
              <span>{formatCard(topCard)}</span>
              <small>Suit in play: {state.currentSuit}</small>
            </div>
          </section>
          <section className="surface-panel surface-panel--compact">
            <h4>Draw pile</h4>
            <button
              type="button"
              className="primary-button"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'draw', {}))}
              disabled={legal.length > 0 || snapshot.status.phase === 'complete'}
            >
              Draw card
            </button>
            <p>{state.drawPile.length} cards left</p>
          </section>
        </div>
        <div className="hand-row">
          {hand.map((card) => (
            <button
              key={card.id}
              type="button"
              className="playing-card playing-card--player"
              onClick={() => dispatch(createCommand(snapshot.status.currentPlayerId ?? '', 'play', { cardId: card.id }))}
              disabled={!legal.includes(card.id) || snapshot.status.phase === 'complete'}
            >
              <span>{formatCard(card)}</span>
              <small>{card.rank === 8 ? 'Wild suit change' : card.suit}</small>
            </button>
          ))}
        </div>
      </div>
    );
  },
};

const holdemRound = (setup: MatchSetup) => {
  const deal = dealHands(setup.players.map((player) => player.id), 2, setup.seed + Date.now());
  return {
    hands: Object.fromEntries(setup.players.map((player) => [player.id, deal.hands[player.id]])),
    drawPile: deal.deck,
    community: [] as StandardCard[],
    stage: 'preflop' as HoldemStage,
  };
};

export const texasHoldemBundle: GameBundle<HoldemState> = {
  definition: {
    manifest: manifestById['texas-holdem'],
    tutorial: tutorialsById['tutorial-texas-holdem'],
    createInitialState: (setup) => holdemRound(setup),
    getStatus: holdemStatus,
    applyCommand: (state, setup, command) => {
      if (command.type === 'new-round') {
        const nextState = holdemRound(setup);
        return { state: nextState, status: holdemStatus(nextState, setup) };
      }
      if (command.type !== 'advance' || state.stage === 'showdown') {
        return { state, status: holdemStatus(state, setup) };
      }

      const revealCount = state.stage === 'preflop' ? 3 : 1;
      const reveal = state.drawPile.slice(0, revealCount);
      const drawPile = state.drawPile.slice(revealCount);
      const stage: HoldemStage =
        state.stage === 'preflop'
          ? 'flop'
          : state.stage === 'flop'
            ? 'turn'
            : state.stage === 'turn'
              ? 'river'
              : 'showdown';
      const nextState = {
        ...state,
        drawPile,
        community: [...state.community, ...reveal],
        stage,
      };
      return { state: nextState, status: holdemStatus(nextState, setup) };
    },
    getMetrics: (state) => ({
      communityCards: state.community.length,
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const rankings =
      state.stage === 'showdown'
        ? snapshot.setup.players.map((player) => ({
            playerId: player.id,
            hand: evaluateBestHoldemHand([...state.community, ...state.hands[player.id]]),
          }))
        : [];

    return (
      <div className="game-column">
        <div className="surface-panel surface-panel--compact">
          <h4>Community board</h4>
          <div className="hand-row">
            {state.community.map((card) => (
              <div key={card.id} className="playing-card">
                <span>{formatCard(card)}</span>
              </div>
            ))}
          </div>
          <p>Street: {state.stage}</p>
        </div>
        <div className="score-row">
          {snapshot.setup.players.map((player) => {
            const rank = rankings.find((entry) => entry.playerId === player.id);
            return (
              <div key={player.id} className="surface-panel surface-panel--compact">
                <strong>{player.name}</strong>
                <div className="hand-row">
                  {state.hands[player.id].map((card) => (
                    <div key={card.id} className="playing-card playing-card--player">
                      <span>{formatCard(card)}</span>
                    </div>
                  ))}
                </div>
                {rank ? <small>{rank.hand.label}</small> : null}
              </div>
            );
          })}
        </div>
        <div className="button-row">
          {state.stage !== 'showdown' ? (
            <button type="button" className="primary-button" onClick={() => dispatch(createCommand(snapshot.setup.players[0].id, 'advance', {}))}>
              Reveal next street
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => dispatch(createCommand(snapshot.setup.players[0].id, 'new-round', {}))}>
              Start new round
            </button>
          )}
        </div>
      </div>
    );
  },
};

export const cardClassics = {
  hearts: heartsBundle,
  'crazy-eights': crazyEightsBundle,
  'texas-holdem': texasHoldemBundle,
};

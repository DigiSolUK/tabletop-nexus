import { useState } from 'react';
import { createCommand, shuffleWithSeed, type GameBundle } from '../core/engine';
import { manifestById } from '../core/catalogue';
import { tutorialsById } from '../core/tutorials';
import { activeStatus } from '../../shared/constants';
import type { MatchStatus } from '../../shared/contracts';

type Suit = 'S' | 'H' | 'D' | 'C';
interface Card {
  id: string;
  suit: Suit;
  rank: number;
  faceUp: boolean;
}

interface SolitaireState {
  tableau: Card[][];
  stock: Card[];
  waste: Card[];
  foundations: Record<Suit, Card[]>;
  moves: number;
}

const suits: Suit[] = ['S', 'H', 'D', 'C'];

const createDeck = () =>
  suits.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 1}`,
      suit,
      rank: index + 1,
      faceUp: false,
    }))
  );

const isRed = (suit: Suit) => suit === 'H' || suit === 'D';
const top = <T,>(items: T[]) => items[items.length - 1];

const getStatus = (state: SolitaireState): MatchStatus => {
  const complete = suits.every((suit) => state.foundations[suit].length === 13);
  if (complete) {
    return {
      phase: 'complete',
      message: 'All foundations are complete. The table is cleared.',
      currentPlayerId: null,
      winnerIds: ['solo-player'],
      isDraw: false,
      canSave: false,
    };
  }
  return activeStatus('Move cards between tableau piles and foundations to clear the table.', 'solo-player');
};

const canMoveToFoundation = (card: Card, foundations: SolitaireState['foundations']) => {
  const pile = foundations[card.suit];
  return pile.length === 0 ? card.rank === 1 : top(pile)?.rank === card.rank - 1;
};

const canMoveToTableau = (card: Card, pile: Card[]) => {
  const target = top(pile);
  if (!target) {
    return card.rank === 13;
  }
  return target.faceUp && isRed(target.suit) !== isRed(card.suit) && target.rank === card.rank + 1;
};

const revealTop = (pile: Card[]) =>
  pile.map((card, index) => (index === pile.length - 1 ? { ...card, faceUp: true } : card));

export const solitaireBundle: GameBundle<SolitaireState> = {
  definition: {
    manifest: manifestById.solitaire,
    tutorial: tutorialsById['tutorial-solitaire'],
    createInitialState: (setup) => {
      const shuffled = shuffleWithSeed(createDeck(), setup.seed).items;
      const tableau: Card[][] = [];
      let cursor = 0;
      for (let column = 0; column < 7; column += 1) {
        const pile = shuffled.slice(cursor, cursor + column + 1).map((card, index, pileCards) => ({
          ...card,
          faceUp: index === pileCards.length - 1,
        }));
        tableau.push(pile);
        cursor += column + 1;
      }
      return {
        tableau,
        stock: shuffled.slice(cursor),
        waste: [],
        foundations: { S: [], H: [], D: [], C: [] },
        moves: 0,
      };
    },
    getStatus,
    applyCommand: (state, _setup, command) => {
      if (command.type === 'draw') {
        if (state.stock.length === 0) {
          const recycled = [...state.waste].reverse().map((card) => ({ ...card, faceUp: false }));
          const nextState = { ...state, stock: recycled, waste: [], moves: state.moves + 1 };
          return { state: nextState, status: getStatus(nextState) };
        }
        const card = top(state.stock);
        if (!card) {
          return { state, status: getStatus(state) };
        }
        const nextState = {
          ...state,
          stock: state.stock.slice(0, -1),
          waste: [...state.waste, { ...card, faceUp: true }],
          moves: state.moves + 1,
        };
        return { state: nextState, status: getStatus(nextState) };
      }

      if (command.type === 'move-waste-foundation') {
        const card = top(state.waste);
        if (!card || !canMoveToFoundation(card, state.foundations)) {
          return { state, status: getStatus(state) };
        }
        const nextState = {
          ...state,
          waste: state.waste.slice(0, -1),
          foundations: { ...state.foundations, [card.suit]: [...state.foundations[card.suit], card] },
          moves: state.moves + 1,
        };
        return { state: nextState, status: getStatus(nextState) };
      }

      if (command.type === 'move-waste-tableau') {
        const column = Number(command.payload.column);
        const card = top(state.waste);
        if (!card || Number.isNaN(column) || !canMoveToTableau(card, state.tableau[column] ?? [])) {
          return { state, status: getStatus(state) };
        }
        const tableau = state.tableau.map((pile, index) => (index === column ? [...pile, card] : pile));
        const nextState = {
          ...state,
          tableau,
          waste: state.waste.slice(0, -1),
          moves: state.moves + 1,
        };
        return { state: nextState, status: getStatus(nextState) };
      }

      if (command.type === 'move-tableau-foundation') {
        const column = Number(command.payload.column);
        const pile = state.tableau[column];
        const card = pile ? top(pile) : undefined;
        if (!card || !card.faceUp || !canMoveToFoundation(card, state.foundations)) {
          return { state, status: getStatus(state) };
        }
        const nextPile = revealTop(pile.slice(0, -1));
        const tableau = state.tableau.map((entry, index) => (index === column ? nextPile : entry));
        const nextState = {
          ...state,
          tableau,
          foundations: { ...state.foundations, [card.suit]: [...state.foundations[card.suit], card] },
          moves: state.moves + 1,
        };
        return { state: nextState, status: getStatus(nextState) };
      }

      if (command.type === 'move-tableau-tableau') {
        const from = Number(command.payload.from);
        const to = Number(command.payload.to);
        const source = state.tableau[from];
        const card = source ? top(source) : undefined;
        if (!card || !card.faceUp || Number.isNaN(to) || !canMoveToTableau(card, state.tableau[to] ?? [])) {
          return { state, status: getStatus(state) };
        }
        const tableau = state.tableau.map((pile, index) => {
          if (index === from) {
            return revealTop(pile.slice(0, -1));
          }
          if (index === to) {
            return [...pile, card];
          }
          return pile;
        });
        const nextState = { ...state, tableau, moves: state.moves + 1 };
        return { state: nextState, status: getStatus(nextState) };
      }

      return { state, status: getStatus(state) };
    },
    getMetrics: (state) => ({
      moves: state.moves,
      foundationsFilled: suits.reduce((sum, suit) => sum + state.foundations[suit].length, 0),
    }),
    createAiCommand: () => null,
  },
  Renderer: ({ snapshot, dispatch }) => {
    const state = snapshot.state;
    const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
    const wasteTop = top(state.waste);

    return (
      <div className="game-column">
        <div className="solitaire-top-row">
          <button type="button" className="primary-button" onClick={() => dispatch(createCommand('solo-player', 'draw', {}))}>
            {state.stock.length > 0 ? `Draw (${state.stock.length})` : 'Recycle waste'}
          </button>
          <div className="waste-slot">
            <h4>Waste</h4>
            {wasteTop ? (
              <div className="playing-card playing-card--player">
                <span>{wasteTop.rank === 1 ? 'A' : wasteTop.rank === 11 ? 'J' : wasteTop.rank === 12 ? 'Q' : wasteTop.rank === 13 ? 'K' : wasteTop.rank}</span>
                <small>{wasteTop.suit}</small>
              </div>
            ) : (
              <div className="playing-card playing-card--empty">Empty</div>
            )}
            <div className="button-row">
              <button type="button" className="ghost-button" onClick={() => dispatch(createCommand('solo-player', 'move-waste-foundation', {}))} disabled={!wasteTop}>
                Waste to foundation
              </button>
            </div>
          </div>
          <div className="foundation-row">
            {suits.map((suit) => (
              <div key={suit} className="foundation-slot">
                <span>{suit}</span>
                <strong>{state.foundations[suit].length}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="solitaire-columns">
          {state.tableau.map((pile, column) => {
            const card = top(pile);
            return (
              <div key={column} className={`tableau-column ${selectedColumn === column ? 'tableau-column--selected' : ''}`}>
                <button type="button" className="ghost-button" onClick={() => setSelectedColumn(column)}>
                  Column {column + 1}
                </button>
                <div className="tableau-stack">
                  {pile.map((entry) => (
                    <div key={entry.id} className={`playing-card ${entry.faceUp ? 'playing-card--player' : 'playing-card--facedown'}`}>
                      {entry.faceUp ? (
                        <>
                          <span>{entry.rank === 1 ? 'A' : entry.rank === 11 ? 'J' : entry.rank === 12 ? 'Q' : entry.rank === 13 ? 'K' : entry.rank}</span>
                          <small>{entry.suit}</small>
                        </>
                      ) : (
                        <span>Hidden</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="button-row">
                  <button type="button" className="ghost-button" onClick={() => dispatch(createCommand('solo-player', 'move-tableau-foundation', { column }))} disabled={!card?.faceUp}>
                    To foundation
                  </button>
                  <button type="button" className="ghost-button" onClick={() => dispatch(createCommand('solo-player', 'move-waste-tableau', { column }))} disabled={!wasteTop}>
                    Waste here
                  </button>
                  {selectedColumn !== null && selectedColumn !== column ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => {
                        dispatch(createCommand('solo-player', 'move-tableau-tableau', { from: selectedColumn, to: column }));
                        setSelectedColumn(null);
                      }}
                    >
                      Move selected here
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};

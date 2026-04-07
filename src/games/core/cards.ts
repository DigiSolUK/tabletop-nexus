import { shuffleWithSeed } from './engine';

export type StandardSuit = 'S' | 'H' | 'D' | 'C';

export interface StandardCard {
  id: string;
  suit: StandardSuit;
  rank: number;
}

export interface RankedHand {
  category: number;
  values: number[];
  label: string;
}

export const suitOrder: StandardSuit[] = ['S', 'H', 'D', 'C'];

export const suitSymbol = (suit: StandardSuit) =>
  ({
    S: '♠',
    H: '♥',
    D: '♦',
    C: '♣',
  })[suit];

export const rankLabel = (rank: number) =>
  ({
    14: 'A',
    13: 'K',
    12: 'Q',
    11: 'J',
  })[rank] ?? String(rank);

export const formatCard = (card: StandardCard) => `${rankLabel(card.rank)}${suitSymbol(card.suit)}`;

export const createStandardDeck = (): StandardCard[] =>
  suitOrder.flatMap((suit) =>
    Array.from({ length: 13 }, (_, index) => ({
      id: `${suit}-${index + 2}`,
      suit,
      rank: index + 2,
    }))
  );

export const dealHands = (
  playerIds: string[],
  count: number,
  seed: number
): { hands: Record<string, StandardCard[]>; deck: StandardCard[]; seed: number } => {
  const shuffled = shuffleWithSeed(createStandardDeck(), seed);
  const hands = Object.fromEntries(playerIds.map((playerId) => [playerId, [] as StandardCard[]]));
  let cursor = 0;
  for (let round = 0; round < count; round += 1) {
    for (const playerId of playerIds) {
      hands[playerId].push(shuffled.items[cursor]);
      cursor += 1;
    }
  }
  return {
    hands,
    deck: shuffled.items.slice(cursor),
    seed: shuffled.seed,
  };
};

const compareValues = (left: number[], right: number[]) => {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
};

const uniqueDescending = (values: number[]) => [...new Set(values)].sort((a, b) => b - a);

const straightHighCard = (ranks: number[]): number | null => {
  const unique = uniqueDescending(ranks);
  if (unique.includes(14)) {
    unique.push(1);
  }
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const slice = unique.slice(index, index + 5);
    if (slice[0] - slice[4] === 4) {
      return slice[0];
    }
  }
  return null;
};

const evaluateFiveCardHand = (cards: StandardCard[]): RankedHand => {
  const ranks = cards.map((card) => card.rank).sort((a, b) => b - a);
  const counts = new Map<number, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) ?? 0) + 1);
  }
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const straight = straightHighCard(ranks);

  if (flush && straight) {
    return { category: 8, values: [straight], label: 'Straight flush' };
  }
  if (groups[0][1] === 4) {
    const kicker = groups.find(([, count]) => count === 1)?.[0] ?? 0;
    return { category: 7, values: [groups[0][0], kicker], label: 'Four of a kind' };
  }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) {
    return { category: 6, values: [groups[0][0], groups[1][0]], label: 'Full house' };
  }
  if (flush) {
    return { category: 5, values: ranks, label: 'Flush' };
  }
  if (straight) {
    return { category: 4, values: [straight], label: 'Straight' };
  }
  if (groups[0][1] === 3) {
    return {
      category: 3,
      values: [groups[0][0], ...groups.filter(([, count]) => count === 1).map(([rank]) => rank)],
      label: 'Three of a kind',
    };
  }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) {
    const pairRanks = groups.filter(([, count]) => count === 2).map(([rank]) => rank);
    const kicker = groups.find(([, count]) => count === 1)?.[0] ?? 0;
    return { category: 2, values: [...pairRanks, kicker], label: 'Two pair' };
  }
  if (groups[0][1] === 2) {
    return {
      category: 1,
      values: [groups[0][0], ...groups.filter(([, count]) => count === 1).map(([rank]) => rank)],
      label: 'One pair',
    };
  }
  return { category: 0, values: ranks, label: 'High card' };
};

const choose = <T,>(items: T[], size: number): T[][] => {
  if (size === 0) {
    return [[]];
  }
  if (items.length < size) {
    return [];
  }
  if (items.length === size) {
    return [items];
  }
  const [first, ...rest] = items;
  return [
    ...choose(rest, size - 1).map((group) => [first, ...group]),
    ...choose(rest, size),
  ];
};

export const evaluateBestHoldemHand = (cards: StandardCard[]): RankedHand => {
  const combinations = choose(cards, 5);
  return combinations
    .map((group) => evaluateFiveCardHand(group))
    .sort((a, b) => b.category - a.category || compareValues(b.values, a.values))[0];
};

export const sortByRankDescending = (cards: StandardCard[]) =>
  [...cards].sort((a, b) => b.rank - a.rank || suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit));

export const isRedSuit = (suit: StandardSuit) => suit === 'H' || suit === 'D';

export type Suit = 'C' | 'D' | 'H' | 'S';
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'JOKER';

/** `id` is random and opaque: it must never reveal the card's value. */
export interface Card {
  id: string;
  rank: Rank;
  suit: Suit | null;
}

/** What a client may see of a card: always the id, the face only when allowed. */
export interface CardView {
  id: string;
  rank?: Rank;
  suit?: Suit | null;
}

export type Power = 'peekOwn' | 'spy' | 'blindSwap' | 'openSwap' | 'peekStack';

const SUITS: Suit[] = ['C', 'D', 'H', 'S'];

const RANK_POINTS: Record<Rank, number> = {
  A: 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  JOKER: 0,
};

/** Every rank in table order, Jokers last: the default deck and the lobby's rank picker. */
export const ALL_RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'JOKER'];

const POWERS: Partial<Record<Rank, Power>> = {
  '7': 'peekOwn',
  '8': 'peekOwn',
  '9': 'spy',
  '10': 'spy',
  J: 'blindSwap',
  Q: 'blindSwap',
};

export const isRed = (card: { suit?: Suit | null }) =>
  card.suit === 'H' || card.suit === 'D';

export const points = (card: Card): number =>
  card.rank === 'K' && isRed(card) ? -1 : RANK_POINTS[card.rank];

export const powerOf = (card: Card, hardMode: boolean): Power | null =>
  card.rank === 'K'
    ? isRed(card)
      ? null
      : 'openSwap'
    : card.rank === '6' && hardMode
      ? 'peekStack'
      : (POWERS[card.rank] ?? null);

export const isFaceUp = (card: CardView): card is Card =>
  card.rank !== undefined;

export const cardName = (card: Card) =>
  card.rank === 'JOKER' ? 'Joker' : `${card.rank}${suitSymbol[card.suit!]}`;

const suitSymbol: Record<Suit, string> = { C: '♣', D: '♦', H: '♥', S: '♠' };

/** One or more decks of the chosen ranks: every suit of each rank, plus 2 Jokers if chosen. */
export const newDeck = (decks: number, id: () => string, ranks: readonly Rank[] = ALL_RANKS): Card[] =>
  Array.from({ length: decks }).flatMap(() => [
    ...SUITS.flatMap((suit) => ranks.filter((r) => r !== 'JOKER').map((rank) => ({ id: id(), rank, suit }))),
    ...(ranks.includes('JOKER') ? [null, null].map(() => ({ id: id(), rank: 'JOKER' as const, suit: null })) : []),
  ]);

export const shuffle = <T>(items: T[], random: () => number): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

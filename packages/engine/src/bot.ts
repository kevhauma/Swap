import { isFaceUp, points, type Card, type CardView } from './cards.ts';
import type { Action } from './game.ts';
import type { GameView } from './view.ts';

/** Everything the bot has seen, by card id. Ids follow cards, so swaps keep it correct. */
export type BotMemory = Record<string, Card>;

export const remember = (memory: BotMemory, cards: (CardView | null | undefined)[]) => {
  for (const card of cards) if (card && isFaceUp(card)) memory[card.id] = card;
};

/** Every face the view shows: open card, drawn card, open-swap peeks, end-of-round hands. */
export const visibleCards = (view: GameView): (CardView | null | undefined)[] => [
  view.open,
  ...('card' in view.step ? [view.step.card] : []),
  ...('own' in view.step ? [view.step.own, view.step.other] : []),
  ...view.players.flatMap((p) => p.cards),
];

const UNKNOWN_ESTIMATE = 6.5;
const pick = <T>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];

/**
 * A simple heuristic player. It only uses what a player with perfect memory could know.
 * shortcut: never bluffs; enough to fill a seat.
 */
export function botAction(view: GameView, memory: BotMemory): Action | null {
  remember(memory, visibleCards(view));
  const me = view.players.find((p) => p.id === view.you)!;
  const known = (c: CardView) => memory[c.id];
  const estimate = (c: CardView) => (known(c) ? points(known(c)) : UNKNOWN_ESTIMATE);
  const worst = [...me.cards].sort((a, b) => estimate(b) - estimate(a))[0];
  const open = view.open;

  if (view.phase === 'ended') return null;
  if (view.phase === 'peek' && !me.hasPeeked) return { type: 'initialPeek', cardId: me.cards[0].id };

  const others = view.players.filter((p) => p.id !== me.id && !p.locked).flatMap((p) => p.cards);

  if (open && !me.locked) {
    const ofOpenRank = (c: CardView) => known(c)?.rank === open.rank;
    // Own cards first: the hand shrinks instead of trading a card away.
    const mine = me.cards.find(ofOpenRank);
    if (mine) return { type: 'match', cardId: mine.id, openId: open.id };
    const theirs = others.find(ofOpenRank);
    if (theirs) return { type: 'match', cardId: theirs.id, openId: open.id, give: worst?.id };
  }

  if (view.turn !== me.id) return null;

  const lowestKnownOther = others
    .filter(known)
    .sort((a, b) => points(known(a)) - points(known(b)))[0];
  const total = me.cards.reduce((sum, c) => sum + estimate(c), 0);
  const step = view.step;

  switch (step.kind) {
    case 'choose':
      if (
        view.turnsTaken >= view.players.length &&
        !view.swishBy &&
        (total <= 5 || view.turnsTaken > 20 * view.players.length)
      )
        return { type: 'swish' };
      if (open && worst && ((points(open) <= 3 && points(open) < estimate(worst)) || !view.canDraw))
        return { type: 'takeOpen', replace: worst.id };
      return { type: 'draw' };
    case 'drawn': {
      const value = points(step.card as Card);
      return worst && value <= 5 && value < estimate(worst)
        ? { type: 'swapDrawn', replace: worst.id }
        : { type: 'discardDrawn' };
    }
    case 'peekOwn': {
      const unknown = me.cards.find((c) => !known(c));
      return unknown ? { type: 'peek', cardId: unknown.id } : { type: 'skip' };
    }
    case 'spy': {
      const target = pick(others.filter((c) => !known(c))) ?? pick(others);
      return target ? { type: 'peek', cardId: target.id } : { type: 'skip' };
    }
    case 'blindSwap': {
      const target = lowestKnownOther ?? pick(others);
      return worst && target && estimate(worst) >= 8
        ? { type: 'blindSwap', own: worst.id, other: target.id }
        : { type: 'skip' };
    }
    case 'openSwap': {
      if (!step.own) return worst ? { type: 'peek', cardId: worst.id } : { type: 'skip' };
      const target = lowestKnownOther ?? pick(others);
      if (!step.other) return target ? { type: 'peek', cardId: target.id } : { type: 'skip' };
      // A picked card matched away meanwhile shows no face; the engine keeps both cards then anyway.
      const { own, other } = step;
      return { type: 'openSwap', swap: isFaceUp(own) && isFaceUp(other) && points(other) < points(own) };
    }
  }
}

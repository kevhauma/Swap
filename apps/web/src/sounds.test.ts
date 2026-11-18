import { describe, expect, it } from 'vitest';
import { ALL_RANKS, apply, viewFor, type Action, type Card, type GameState } from '@swap/engine';
import { soundFor } from './sounds.ts';

const card = (id: string): Card => ({ id, rank: id.slice(0, -1) as Card['rank'], suit: id.at(-1) as Card['suit'] });
let n = 0;
const ctx = { random: () => 0.5, id: () => `new${n++}` };

/** a holds 5H 7H, b holds 5S QS; open 5D; the stack top is 8C. */
const table = (extra: Partial<GameState> = {}): GameState => ({
  phase: 'turn',
  hardMode: false,
  swishPenalty: false,
  ranks: ALL_RANKS,
  players: [
    { id: 'a', name: 'A', hand: [card('5H'), card('7H')], locked: false, hasPeeked: true },
    { id: 'b', name: 'B', hand: [card('5S'), card('QS')], locked: false, hasPeeked: true },
  ],
  discard: [card('5D')],
  stack: [card('2C'), card('8C')],
  turn: 0,
  step: { kind: 'choose' },
  turnsTaken: 2,
  swishBy: null,
  turnsLeft: null,
  lastPeek: null,
  log: [],
  ...extra,
});

/** The sound b hears when `player` does `actions` in order; only the last step is compared. */
const heard = (s: GameState, ...moves: [string, Action][]) => {
  const states = moves.reduce((acc, [player, action]) => [...acc, apply(acc.at(-1)!, player, action, ctx).state], [s]);
  return soundFor(viewFor(states.at(-2)!, 'b'), viewFor(states.at(-1)!, 'b'));
};

describe('soundFor', () => {
  it('draw', () => expect(heard(table(), ['a', { type: 'draw' }])).toBe('draw'));

  it('swap: drawn card swapped in, open card taken, blind swap', () => {
    expect(heard(table(), ['a', { type: 'draw' }], ['a', { type: 'swapDrawn', replace: '5H' }])).toBe('swap');
    expect(heard(table(), ['a', { type: 'takeOpen', replace: '5H' }])).toBe('swap');
    const blind = table({ step: { kind: 'blindSwap' } });
    expect(heard(blind, ['a', { type: 'blindSwap', own: '5H', other: 'QS' }])).toBe('swap');
  });

  it('match: own card, or an opponent card with a card given back', () => {
    expect(heard(table(), ['b', { type: 'match', cardId: '5S', openId: '5D' }])).toBe('match');
    expect(heard(table(), ['a', { type: 'match', cardId: '5S', openId: '5D', give: '7H' }])).toBe('match');
  });

  it('wrong match is silent in the view: the mismatch reveal plays it', () => {
    const s = table();
    expect(apply(s, 'b', { type: 'match', cardId: 'QS', openId: '5D' }, ctx).reveals[0].reason).toBe('mismatch');
    expect(heard(s, ['b', { type: 'match', cardId: 'QS', openId: '5D' }])).toBeNull();
  });

  it('swish, also for a second swish-swish in the last round', () => {
    expect(heard(table(), ['a', { type: 'swish' }])).toBe('swish');
    const lastRound = table({ turn: 1, swishBy: 'a', turnsLeft: 1 });
    lastRound.players[0].locked = true;
    expect(heard(lastRound, ['b', { type: 'swish' }])).toBe('swish');
  });

  it('flip: any peek, and the reveal at round end', () => {
    expect(heard(table(), ['a', { type: 'draw' }], ['a', { type: 'discardDrawn' }], ['a', { type: 'peek', cardId: '7H' }])).toBe('flip');
    const peek = table({ phase: 'peek' });
    peek.players[0].hasPeeked = false;
    expect(heard(peek, ['a', { type: 'initialPeek', cardId: '7H' }])).toBe('flip');
    const last = table({ swishBy: 'b', turnsLeft: 1, stack: [card('4C')] });
    last.players[1].locked = true;
    expect(heard(last, ['a', { type: 'draw' }], ['a', { type: 'discardDrawn' }])).toBe('flip');
  });

  it('silent: putting a card down, a resent view, the first view, a new deal', () => {
    expect(heard(table(), ['a', { type: 'draw' }], ['a', { type: 'discardDrawn' }])).toBeNull();
    const v = viewFor(table(), 'b');
    expect(soundFor(v, v)).toBeNull();
    expect(soundFor(null, v)).toBeNull();
    const dealt = viewFor(table({ phase: 'peek' }), 'b');
    dealt.players[0].cards = [{ id: 'other' }, { id: 'ids' }];
    expect(soundFor(viewFor(table({ phase: 'ended' }), 'b'), dealt)).toBeNull();
  });
});

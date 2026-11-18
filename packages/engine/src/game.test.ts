import { describe, expect, it } from 'vitest';
import {
  ALL_RANKS,
  apply,
  botAction,
  createGame,
  MAX_PLAYERS,
  points,
  remember,
  RuleError,
  viewFor,
  type Action,
  type BotMemory,
  type Card,
  type Ctx,
  type GameState,
  type Suit,
} from './index.ts';

const seeded = (seed = 1): Ctx => {
  let n = 0;
  return {
    // mulberry32
    random: () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    id: () => `id${n++}`,
  };
};

let uid = 0;
/** 'KH' = king of hearts, '10S', 'JOKER'. Ids are opaque in the game; readable here. */
const card = (spec: string): Card =>
  spec === 'JOKER'
    ? { id: `JOKER#${uid++}`, rank: 'JOKER', suit: null }
    : { id: `${spec}#${uid++}`, rank: spec.slice(0, -1) as Card['rank'], suit: spec.at(-1) as Suit };

/** A game in the turn phase: hands for a, b (and c), the open card, then the stack top first. */
const table = (
  hands: string[][],
  open: string,
  stack: string[] = ['2C', '3C', '4C', '5C'],
  extra: Partial<GameState> = {}
): GameState => ({
  phase: 'turn',
  hardMode: false,
  swishPenalty: false,
  ranks: ALL_RANKS,
  players: hands.map((h, i) => ({
    id: 'abc'[i],
    name: 'ABC'[i],
    hand: h.map(card),
    locked: false,
    hasPeeked: true,
  })),
  discard: [card(open)],
  stack: stack.map(card).reverse(),
  turn: 0,
  step: { kind: 'choose' },
  turnsTaken: 0,
  swishBy: null,
  turnsLeft: null,
  lastPeek: null,
  log: [],
  ...extra,
});

const ctx = seeded();
const act = (s: GameState, player: string, action: Action) => apply(s, player, action, ctx);
const hand = (s: GameState, player: string) =>
  s.players.find((p) => p.id === player)!.hand.map((c) => c.id.split('#')[0]);
const id = (s: GameState, player: string, spec: string) =>
  s.players.find((p) => p.id === player)!.hand.find((c) => c.id.startsWith(`${spec}#`))!.id;
const openId = (s: GameState) => s.discard.at(-1)!.id;

describe('cards', () => {
  it('scores red kings -1, black kings 13, jokers 0, faces by rank', () => {
    expect(['KH', 'KD', 'KS', 'KC', 'JOKER', 'AS', 'JH', 'QH', '7D'].map((c) => points(card(c)))).toEqual([
      -1, -1, 13, 13, 0, 1, 11, 12, 7,
    ]);
  });
});

describe('setup', () => {
  it('deals 4 cards each, one open card, the rest on the stack', () => {
    const s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, ctx);
    expect(s.players.map((p) => p.hand.length)).toEqual([4, 4]);
    expect(s.discard).toHaveLength(1);
    expect(s.stack).toHaveLength(54 - 9);
    expect(new Set([...s.stack, ...s.discard, ...s.players.flatMap((p) => p.hand)].map((c) => c.id)).size).toBe(54);
  });

  it('uses two decks above 4 players', () => {
    const players = 'abcde'.split('').map((id) => ({ id, name: id }));
    expect(createGame(players, { hardMode: false }, ctx).stack).toHaveLength(108 - 21);
  });

  it(`seats up to ${MAX_PLAYERS} players and rejects more`, () => {
    const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    expect(MAX_PLAYERS).toBe(6);
    expect(createGame(players(6), { hardMode: false }, ctx).players).toHaveLength(6);
    expect(() => createGame(players(7), { hardMode: false }, ctx)).toThrow(RuleError);
  });

  describe('custom deck (row 1)', () => {
    const players = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
    const cards = (s: GameState) => [...s.stack, ...s.discard, ...s.players.flatMap((p) => p.hand)];

    it('deals only the chosen ranks, every suit plus 2 Jokers per deck, and shows the choice to everyone', () => {
      const s = createGame(players(2), { hardMode: false, ranks: ['A', 'K', 'JOKER'] }, ctx);
      expect(cards(s).map((c) => c.rank).sort()).toEqual(['A', 'A', 'A', 'A', 'JOKER', 'JOKER', 'K', 'K', 'K', 'K']);
      expect(viewFor(s, 'p0').ranks).toEqual(['A', 'K', 'JOKER']);
      const five = createGame(players(5), { hardMode: false, ranks: ['2', '3', '4'] }, ctx);
      expect(cards(five)).toHaveLength(2 * 12);
      expect(new Set(cards(five).map((c) => c.rank))).toEqual(new Set(['2', '3', '4']));
    });

    it('defaults to the full deck', () => {
      expect(createGame(players(2), { hardMode: false }, ctx).ranks).toEqual(ALL_RANKS);
    });

    it('rejects a deck too small to deal 4 cards each plus the open card', () => {
      expect(createGame(players(2), { hardMode: false, ranks: ['A', '2', 'JOKER'] }, ctx).stack).toHaveLength(1);
      expect(() => createGame(players(2), { hardMode: false, ranks: ['A', '2'] }, ctx)).toThrow(/Too few cards/);
      expect(() => createGame(players(2), { hardMode: false, ranks: [] }, ctx)).toThrow(RuleError);
      expect(() => createGame(players(5), { hardMode: false, ranks: ['A', '2'] }, ctx)).toThrow(RuleError);
    });

    it('rejects unknown and repeated ranks', () => {
      expect(() => createGame(players(2), { hardMode: false, ranks: ['A', '2', '1'] as never }, ctx)).toThrow(/Unknown card rank/);
      expect(() => createGame(players(2), { hardMode: false, ranks: 'A23' as never }, ctx)).toThrow(/Unknown card rank/);
      expect(() => createGame(players(2), { hardMode: false, ranks: ['A', 'A', '2', '3'] }, ctx)).toThrow(/twice/);
    });
  });

  it('starts turns once everyone has looked at one card, privately', () => {
    let s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, ctx);
    expect(() => act(s, 'a', { type: 'draw' })).toThrow(RuleError);
    const r = act(s, 'a', { type: 'initialPeek', cardId: s.players[0].hand[2].id });
    expect(r.reveals).toEqual([{ to: 'a', cards: [s.players[0].hand[2]], reason: 'peek' }]);
    expect(() => act(r.state, 'a', { type: 'initialPeek', cardId: s.players[0].hand[1].id })).toThrow('already');
    s = act(r.state, 'b', { type: 'initialPeek', cardId: s.players[1].hand[0].id }).state;
    expect(s.phase).toBe('turn');
  });
});

describe('turns', () => {
  it('draw then swap: drawn card goes in, replaced card becomes open, turn passes', () => {
    let s = table([['9H', '2H', '3H', '4H'], ['5S', '5S', '5S', '5S']], '6D', ['KH']);
    s = act(s, 'a', { type: 'draw' }).state;
    expect(() => act(s, 'b', { type: 'discardDrawn' })).toThrow('Not your turn');
    s = act(s, 'a', { type: 'swapDrawn', replace: id(s, 'a', '9H') }).state;
    expect(hand(s, 'a')).toEqual(['KH', '2H', '3H', '4H']);
    expect(s.discard.at(-1)!.id).toMatch(/^9H/);
    expect(s.players[s.turn].id).toBe('b');
  });

  it('take open: open card goes in, replaced card becomes open', () => {
    let s = table([['9H', '2H', '3H', '4H'], ['5S']], 'AD');
    s = act(s, 'a', { type: 'takeOpen', replace: id(s, 'a', '9H') }).state;
    expect(hand(s, 'a')[0]).toBe('AD');
    expect(s.discard.map((c) => c.id.split('#')[0])).toEqual(['9H']);
  });

  it('discarding a card without power just ends the turn', () => {
    let s = table([['9H'], ['5S']], 'AD', ['4D']);
    s = act(s, 'a', { type: 'draw' }).state;
    s = act(s, 'a', { type: 'discardDrawn' }).state;
    expect(s.step.kind).toBe('choose');
    expect(s.players[s.turn].id).toBe('b');
    expect(s.discard.at(-1)!.id).toMatch(/^4D/);
  });

  it('reshuffles the discard pile with new ids when the stack runs out, keeping the open card', () => {
    let s = table([['9H'], ['5S']], 'AD', []);
    s.discard = [card('2D'), card('3D'), card('AD')];
    const oldIds = s.discard.map((c) => c.id);
    expect(viewFor(s, 'a').canDraw).toBe(true);
    s = act(s, 'a', { type: 'draw' }).state;
    expect(s.discard.map((c) => c.id)).toEqual([oldIds[2]]);
    const drawn = (s.step as { card: Card }).card;
    expect(oldIds).not.toContain(drawn.id);
    expect(s.stack.every((c) => !oldIds.includes(c.id))).toBe(true);
  });

  it('refuses a draw when the stack is empty and only the open card is on the discard pile', () => {
    const s = table([['9H'], ['5S']], 'AD', []);
    expect(viewFor(s, 'a').canDraw).toBe(false);
    expect(() => act(s, 'a', { type: 'draw' })).toThrow('The stack is empty');
  });
});

describe('powers', () => {
  const usePower = (drawn: string, hands = [['9H', '2H'], ['5S', '6S']], hardMode = false) => {
    let s = table(hands, 'AD', [drawn, 'JOKER', '2S', '3S'], { hardMode });
    s = act(s, 'a', { type: 'draw' }).state;
    return act(s, 'a', { type: 'discardDrawn' });
  };

  it('7/8 look at one of your own cards, only you see it', () => {
    const { state } = usePower('7C');
    expect(state.step.kind).toBe('peekOwn');
    expect(() => act(state, 'a', { type: 'peek', cardId: id(state, 'b', '5S') })).toThrow('not your card');
    const r = act(state, 'a', { type: 'peek', cardId: id(state, 'a', '9H') });
    expect(r.reveals).toEqual([{ to: 'a', cards: [expect.objectContaining({ rank: '9' })], reason: 'peek' }]);
    expect(r.state.players[r.state.turn].id).toBe('b');
  });

  it('9/10 look at an opponent card', () => {
    const { state } = usePower('10C');
    const r = act(state, 'a', { type: 'peek', cardId: id(state, 'b', '6S') });
    expect(r.reveals[0]).toMatchObject({ to: 'a', reason: 'spy' });
  });

  it('J/Q blind-swap keeps positions', () => {
    const { state } = usePower('QC');
    const s = act(state, 'a', { type: 'blindSwap', own: id(state, 'a', '2H'), other: id(state, 'b', '5S') }).state;
    expect(hand(s, 'a')).toEqual(['9H', '5S']);
    expect(hand(s, 'b')).toEqual(['2H', '6S']);
  });

  it('black K: look at own, then opponent, then choose; only the active player sees the faces', () => {
    let { state: s } = usePower('KS');
    expect(s.step.kind).toBe('openSwap');
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'a', '9H') }).state;
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'b', '6S') }).state;
    expect(viewFor(s, 'a').step).toMatchObject({ own: { rank: '9' }, other: { rank: '6' } });
    expect(viewFor(s, 'b').step).toEqual({ kind: 'openSwap', own: { id: id(s, 'a', '9H') }, other: { id: id(s, 'b', '6S') } });
    s = act(s, 'a', { type: 'openSwap', swap: true }).state;
    expect(hand(s, 'a')).toEqual(['6S', '2H']);
    expect(hand(s, 'b')).toEqual(['5S', '9H']);
  });

  it('black K: own pick matched away still counts as picked, shows no face, and the decision keeps both', () => {
    let { state: s } = usePower('KS', [['KC', '2H'], ['5S', '6S']]);
    const kc = id(s, 'a', 'KC');
    s = act(s, 'a', { type: 'peek', cardId: kc }).state;
    s = act(s, 'b', { type: 'match', cardId: kc, openId: openId(s), give: id(s, 'b', '5S') }).state;
    for (const p of ['a', 'b']) expect(viewFor(s, p).step).toEqual({ kind: 'openSwap', own: { id: kc } });
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'b', '6S') }).state;
    s = act(s, 'a', { type: 'openSwap', swap: true }).state;
    expect(hand(s, 'a')).toEqual(['5S', '2H']);
    expect(hand(s, 'b')).toEqual(['6S']);
    expect(s.players[s.turn].id).toBe('b');
  });

  it('black K: opponent pick matched away shows no face, and the decision keeps both', () => {
    let { state: s } = usePower('KS', [['9H', '2H'], ['KD', '6S']]);
    const kd = id(s, 'b', 'KD');
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'a', '9H') }).state;
    s = act(s, 'a', { type: 'peek', cardId: kd }).state;
    s = act(s, 'b', { type: 'match', cardId: kd, openId: openId(s) }).state;
    expect(viewFor(s, 'a').step).toEqual({ kind: 'openSwap', own: expect.objectContaining({ rank: '9' }), other: { id: kd } });
    expect(viewFor(s, 'b').step).toEqual({ kind: 'openSwap', own: { id: id(s, 'a', '9H') }, other: { id: kd } });
    s = act(s, 'a', { type: 'openSwap', swap: true }).state;
    expect(hand(s, 'a')).toEqual(['9H', '2H']);
    expect(hand(s, 'b')).toEqual(['6S']);
    expect(s.players[s.turn].id).toBe('b');
  });

  it('red K has no power', () => {
    expect(usePower('KH').state.step.kind).toBe('choose');
  });

  it('powers can be skipped', () => {
    const { state } = usePower('JC');
    const s = act(state, 'a', { type: 'skip' }).state;
    expect([s.step.kind, s.players[s.turn].id]).toEqual(['choose', 'b']);
  });
});

describe('matching', () => {
  it('own card of equal value: placed on the discard pile, out of turn', () => {
    const s0 = table([['9H', '2H'], ['5S', '6S']], '6D');
    const { state: s } = act(s0, 'b', { type: 'match', cardId: id(s0, 'b', '6S'), openId: openId(s0) });
    expect(hand(s, 'b')).toEqual(['5S']);
    expect(s.discard.at(-1)!.id).toMatch(/^6S/);
  });

  it('matches by rank, so a black king matches a red king', () => {
    const s = table([['KS', '2H'], ['5S']], 'KH', ['2C']);
    const r = act(s, 'a', { type: 'match', cardId: id(s, 'a', 'KS'), openId: openId(s) });
    expect(hand(r.state, 'a')).toEqual(['2H']);
    expect(r.state.discard.at(-1)!.id).toMatch(/^KS/);
  });

  it('a joker matches a joker', () => {
    const s = table([['JOKER', '2H'], ['5S']], 'JOKER', ['2C']);
    const r = act(s, 'a', { type: 'match', cardId: id(s, 'a', 'JOKER'), openId: openId(s) });
    expect(hand(r.state, 'a')).toEqual(['2H']);
  });

  it('wrong match: card shown to all, penalty card added', () => {
    const s = table([['9H'], ['5S']], '6D', ['QC']);
    const r = act(s, 'a', { type: 'match', cardId: id(s, 'a', '9H'), openId: openId(s) });
    expect(r.reveals).toEqual([{ to: 'all', cards: [s.players[0].hand[0]], reason: 'mismatch' }]);
    expect(hand(r.state, 'a')).toEqual(['9H', 'QC']);
  });

  it('opponent card: removed from them, and you give them one of yours in its place', () => {
    const s = table([['9H', '2H'], ['5S', '6S', '7S']], '6D');
    const r = act(s, 'a', { type: 'match', cardId: id(s, 'b', '6S'), openId: openId(s), give: id(s, 'a', '9H') });
    expect(hand(r.state, 'a')).toEqual(['2H']);
    expect(hand(r.state, 'b')).toEqual(['5S', '9H', '7S']);
  });

  it('second match against an open card that already changed is too late, without penalty', () => {
    const s = table([['6H'], ['6S']], '6D');
    const first = act(s, 'a', { type: 'match', cardId: id(s, 'a', '6H'), openId: openId(s) }).state;
    expect(() => act(first, 'b', { type: 'match', cardId: id(s, 'b', '6S'), openId: openId(s) })).toThrow('Too late');
  });
});

describe('swish-swish', () => {
  it('locks the caller, gives everyone else one turn, then ends with scores revealed', () => {
    let s = table([['AH'], ['9S'], ['9C']], '6D', ['2C', '3C', '4C', '5C'], { turnsTaken: 3 });
    s = act(s, 'a', { type: 'swish' }).state;
    expect(s.players[0].locked).toBe(true);
    expect(() =>
      act(s, 'b', { type: 'match', cardId: id(s, 'a', 'AH'), openId: openId(s), give: id(s, 'b', '9S') })
    ).toThrow('locked');
    for (const p of ['b', 'c']) {
      s = act(s, p, { type: 'draw' }).state;
      s = act(s, p, { type: 'discardDrawn' }).state;
    }
    expect(s.phase).toBe('ended');
    expect(viewFor(s, 'b').players.map((p) => p.score)).toEqual([1, 9, 9]);
  });

  it('is not allowed before everyone had a turn', () => {
    expect(() => act(table([['AH'], ['9S']], '6D'), 'a', { type: 'swish' })).toThrow('one turn');
  });
});

describe('swish penalty house rule (row 9)', () => {
  /** a called swish-swish; the round is over. Scores and penalties as everyone sees them. */
  const ended = (hands: string[][], swishPenalty = true) => {
    const s = table(hands, '6D', [], { phase: 'ended', swishBy: 'a', swishPenalty });
    return viewFor(s, 'b').players.map((p) => [p.score, p.penalty]);
  };

  it('is off unless chosen at the start', () => {
    const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
    expect(createGame(players, { hardMode: false }, ctx).swishPenalty).toBe(false);
    expect(createGame(players, { hardMode: false, swishPenalty: true }, ctx).swishPenalty).toBe(true);
    expect(ended([['9H'], ['2S']], false)).toEqual([[9, undefined], [2, undefined]]);
  });

  it('charges nothing when the caller is lowest', () => {
    expect(ended([['2H'], ['9S'], ['5C']])).toEqual([[2, undefined], [9, undefined], [5, undefined]]);
  });

  it('charges nothing when the caller is tied for lowest', () => {
    expect(ended([['4H'], ['4S'], ['9C']])).toEqual([[4, undefined], [4, undefined], [9, undefined]]);
  });

  it('adds 5 to the caller when someone is lower, judged on card points before the penalty', () => {
    expect(ended([['5H'], ['4S'], ['9C']])).toEqual([[10, 5], [4, undefined], [9, undefined]]);
  });
});

describe('hard mode', () => {
  it('putting down a 3 (not by matching) costs a penalty card', () => {
    let s = table([['9H'], ['5S']], '6D', ['3C', 'KS'], { hardMode: true });
    s = act(s, 'a', { type: 'draw' }).state;
    s = act(s, 'a', { type: 'discardDrawn' }).state;
    expect(hand(s, 'a')).toEqual(['9H', 'KS']);
  });

  it('6 shows the top 3 of the stack, top first', () => {
    let s = table([['9H'], ['5S']], 'AD', ['6C', '2C', '3C', '4C', '5C'], { hardMode: true });
    s = act(s, 'a', { type: 'draw' }).state;
    const r = act(s, 'a', { type: 'discardDrawn' });
    expect(r.reveals[0].cards.map((c) => c.id.split('#')[0])).toEqual(['2C', '3C', '4C']);
  });
});

describe('view', () => {
  it('never contains the face of a hidden card', () => {
    let s = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, ctx);
    s.players.forEach((p) => (p.hasPeeked = true));
    s.phase = 'turn';
    s = act(s, 'a', { type: 'draw' }).state;
    const faces = (v: object) => JSON.stringify(v).match(/"rank"/g)?.length ?? 0;
    expect(faces(viewFor(s, 'b'))).toBe(1); // only the open card
    expect(faces(viewFor(s, 'a'))).toBe(2); // plus the drawn card
  });
});

describe('peek position (rule 3d)', () => {
  const faces = (v: object) => JSON.stringify(v).match(/"rank"/g)?.length ?? 0;
  /** b sees which card a looked at, but no face beyond the open card. */
  const expectSeenByB = (s: GameState, cardId: string) => {
    expect(s.lastPeek).toEqual({ by: 'a', cardIds: [cardId] });
    expect(viewFor(s, 'b').lastPeek).toEqual({ by: 'a', cardIds: [cardId] });
    expect(faces(viewFor(s, 'b'))).toBe(1);
  };
  const afterPower = (drawn: string, hardMode = false) => {
    let s = table([['9H', '2H'], ['5S', '6S']], 'AD', [drawn, '2C', '3C', '4C', '5C'], { hardMode });
    s = act(s, 'a', { type: 'draw' }).state;
    return act(s, 'a', { type: 'discardDrawn' }).state;
  };

  it('first peek', () => {
    const s0 = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, ctx);
    const cardId = s0.players[0].hand[1].id;
    expectSeenByB(act(s0, 'a', { type: 'initialPeek', cardId }).state, cardId);
  });

  it('7/8, then cleared by the next action that is not a peek', () => {
    let s = afterPower('8C');
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'a', '9H') }).state;
    expectSeenByB(s, id(s, 'a', '9H'));
    s = act(s, 'b', { type: 'draw' }).state;
    expect(viewFor(s, 'a').lastPeek).toBeNull();
  });

  it('9/10', () => {
    let s = afterPower('9C');
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'b', '6S') }).state;
    expectSeenByB(s, id(s, 'b', '6S'));
  });

  it('both black-K looks, each replacing the last', () => {
    let s = afterPower('KC');
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'a', '2H') }).state;
    expectSeenByB(s, id(s, 'a', '2H'));
    s = act(s, 'a', { type: 'peek', cardId: id(s, 'b', '5S') }).state;
    expectSeenByB(s, id(s, 'b', '5S'));
    s = act(s, 'a', { type: 'openSwap', swap: false }).state;
    expect(s.lastPeek).toBeNull();
  });

  it('hard-mode 6 (stack peek) shares no hand position', () => {
    expect(viewFor(afterPower('6C', true), 'b').lastPeek).toBeNull();
  });
});

describe('bots', () => {
  it('match a known card of the same rank, whatever its colour', () => {
    const s = table([['5S'], ['KS', '9H']], 'KH');
    const memory: BotMemory = { [id(s, 'b', 'KS')]: s.players[1].hand[0] };
    expect(botAction(viewFor(s, 'b'), memory)).toEqual({ type: 'match', cardId: id(s, 'b', 'KS'), openId: openId(s) });
  });

  it('match a known opponent card of the open rank and give their worst card', () => {
    const s = table([['5S', 'KS'], ['2H', '9H']], 'KH');
    const [two, nine] = s.players[1].hand;
    const memory: BotMemory = { [id(s, 'a', 'KS')]: s.players[0].hand[1], [two.id]: two, [nine.id]: nine };
    expect(botAction(viewFor(s, 'b'), memory)).toEqual({
      type: 'match',
      cardId: id(s, 'a', 'KS'),
      openId: openId(s),
      give: nine.id,
    });
  });

  it("never match a locked player's card", () => {
    const s = table([['5S', 'KS'], ['2H', '9H']], 'KH');
    s.players[0].locked = true;
    s.turn = 1;
    const memory: BotMemory = { [id(s, 'a', 'KS')]: s.players[0].hand[1] };
    expect(botAction(viewFor(s, 'b'), memory)?.type).not.toBe('match');
  });

  it('take the open card when the stack is empty and nothing can be shuffled in', () => {
    const s = table([['5S'], ['KS', '9H']], 'QH', [], { turn: 1 });
    expect(botAction(viewFor(s, 'b'), {})).toEqual({ type: 'takeOpen', replace: id(s, 'b', 'KS') });
  });

  it('play complete games against each other without breaking a rule', () => {
    for (let game = 0; game < 30; game++) {
      const players = ['a', 'b', 'c'].map((id) => ({ id, name: id }));
      let s = createGame(players, { hardMode: game % 2 === 0 }, seeded(game + 1));
      const memory: Record<string, BotMemory> = { a: {}, b: {}, c: {} };
      for (let i = 0; i < 5000 && s.phase !== 'ended'; i++) {
        const moves = players
          .map((p) => [p.id, botAction(viewFor(s, p.id), memory[p.id])] as const)
          .filter(([, action]) => action);
        expect(moves.length).toBeGreaterThan(0);
        const [player, action] = moves[i % moves.length];
        const r = apply(s, player, action!, ctx);
        for (const reveal of r.reveals)
          for (const p of players) if (reveal.to === 'all' || reveal.to === p.id) remember(memory[p.id], reveal.cards);
        s = r.state;
      }
      expect(s.phase).toBe('ended');
    }
  });
});

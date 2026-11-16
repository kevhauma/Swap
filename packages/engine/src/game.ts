import {
  ALL_RANKS,
  cardName,
  newDeck,
  points,
  powerOf,
  shuffle,
  type Card,
  type Power,
  type Rank,
} from './cards.ts';

/** Randomness is injected so the server can use crypto and tests can be deterministic. */
export interface Ctx {
  random: () => number;
  id: () => string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  locked: boolean;
  hasPeeked: boolean;
}

export type Step =
  | { kind: 'choose' }
  | { kind: 'drawn'; card: Card }
  | { kind: 'peekOwn' | 'spy' | 'blindSwap' }
  | { kind: 'openSwap'; own?: string; other?: string };

export interface GameState {
  phase: 'peek' | 'turn' | 'ended';
  hardMode: boolean;
  /** House rule (row 9): the swish caller pays SWISH_PENALTY when not (shared) lowest. */
  swishPenalty: boolean;
  /** The ranks in the deck (custom deck, row 1). */
  ranks: Rank[];
  players: Player[];
  /** Last element is the top. */
  stack: Card[];
  /** Last element is the open card. */
  discard: Card[];
  turn: number;
  step: Step;
  turnsTaken: number;
  swishBy: string | null;
  /** Turns left after a swish-swish; null before. */
  turnsLeft: number | null;
  /** The card(s) just looked at, for everyone to see where (rule 3d); null after any other action. */
  lastPeek: { by: string; cardIds: string[] } | null;
  log: string[];
}

export type Action =
  | { type: 'initialPeek'; cardId: string }
  | { type: 'draw' }
  | { type: 'takeOpen'; replace: string }
  | { type: 'swapDrawn'; replace: string }
  | { type: 'discardDrawn' }
  | { type: 'peek'; cardId: string }
  | { type: 'blindSwap'; own: string; other: string }
  | { type: 'openSwap'; swap: boolean }
  | { type: 'skip' }
  | { type: 'match'; cardId: string; openId: string; give?: string }
  | { type: 'swish' };

/** A face shown to one player (or everyone) without staying in their view. */
export interface Reveal {
  to: string | 'all';
  cards: Card[];
  reason: 'peek' | 'spy' | 'stack' | 'mismatch';
}

/** An action that is not allowed. Rejected without penalty, unlike a wrong match. */
export class RuleError extends Error {}

const fail = (message: string): never => {
  throw new RuleError(message);
};

/** Most players at one table (GAME_OVERVIEW.md section 6). */
export const MAX_PLAYERS = 6;

const MAX_LOG = 30;
const POWER_STEPS: Step['kind'][] = ['peekOwn', 'spy', 'blindSwap', 'openSwap'];

export function createGame(
  players: { id: string; name: string }[],
  options: { hardMode: boolean; swishPenalty?: boolean; ranks?: Rank[] },
  ctx: Ctx
): GameState {
  if (players.length < 2 || players.length > MAX_PLAYERS) fail(`Swap needs 2 to ${MAX_PLAYERS} players`);
  // Checked here rather than on the server alone: `ranks` arrives straight from a client message.
  const ranks = options.ranks ?? ALL_RANKS;
  if (!Array.isArray(ranks) || !ranks.every((r) => ALL_RANKS.includes(r))) fail('Unknown card rank');
  if (new Set(ranks).size !== ranks.length) fail('A rank is chosen twice');
  const deck = shuffle(newDeck(players.length > 4 ? 2 : 1, ctx.id, ranks), ctx.random);
  if (deck.length < players.length * 4 + 1) fail(`Too few cards to deal ${players.length} players: choose more ranks`);
  return {
    phase: 'peek',
    hardMode: options.hardMode,
    swishPenalty: options.swishPenalty === true,
    ranks: [...ranks],
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: deck.splice(0, 4),
      locked: false,
      hasPeeked: false,
    })),
    discard: [deck.pop()!],
    stack: deck,
    turn: 0,
    step: { kind: 'choose' },
    turnsTaken: 0,
    swishBy: null,
    turnsLeft: null,
    lastPeek: null,
    log: ['Everyone: look at one of your cards'],
  };
}

export function apply(
  prev: GameState,
  playerId: string,
  action: Action,
  ctx: Ctx
): { state: GameState; reveals: Reveal[] } {
  const s = structuredClone(prev);
  s.lastPeek = null;
  const reveals: Reveal[] = [];
  const me = s.players.find((p) => p.id === playerId) ?? fail('Unknown player');
  const log = (line: string) => {
    s.log = [...s.log, line].slice(-MAX_LOG);
  };
  const peeked = (card: Card) => {
    s.lastPeek = { by: me.id, cardIds: [card.id] };
    return card;
  };

  const locate = (cardId: unknown) => {
    for (const player of s.players) {
      const index = player.hand.findIndex((c) => c.id === cardId);
      if (index >= 0) return { player, index, card: player.hand[index] };
    }
    return fail('No such card');
  };
  const own = (cardId: unknown) => {
    const loc = locate(cardId);
    return loc.player === me ? loc : fail('That is not your card');
  };
  const opponents = (cardId: unknown) => {
    const loc = locate(cardId);
    if (loc.player === me) fail('Pick an opponent card');
    if (loc.player.locked) fail('Swish-swished cards are locked');
    return loc;
  };

  const drawFromStack = (): Card | null => {
    if (!s.stack.length && s.discard.length > 1) {
      const open = s.discard.pop()!;
      // New ids, or cards seen face up on the discard pile would be recognisable once drawn.
      s.stack = shuffle(
        s.discard.map((c) => ({ ...c, id: ctx.id() })),
        ctx.random
      );
      s.discard = [open];
      log('The discard pile was shuffled into the stack');
    }
    return s.stack.pop() ?? null;
  };
  const penalty = (player: Player) => {
    const card = drawFromStack();
    if (card) player.hand.push(card);
  };
  const toDiscard = (card: Card, by: Player, matched = false) => {
    s.discard.push(card);
    if (s.hardMode && card.rank === '3' && !matched) {
      penalty(by);
      log(`${by.name} put down a 3 and takes a penalty card`);
    }
  };

  const nextUnlocked = () =>
    s.players
      .map((_, k) => (s.turn + 1 + k) % s.players.length)
      .find((i) => !s.players[i].locked) ?? -1;
  const endTurn = (consumesLastRound = true) => {
    s.step = { kind: 'choose' };
    s.turnsTaken++;
    if (consumesLastRound && s.turnsLeft !== null) s.turnsLeft--;
    const next = nextUnlocked();
    if (next === -1 || s.turnsLeft === 0) {
      s.phase = 'ended';
      log('Round over: cards revealed');
    } else s.turn = next;
  };

  const requireTurn = (...kinds: Step['kind'][]) => {
    if (s.phase !== 'turn') fail('No turns yet');
    if (s.players[s.turn] !== me) fail('Not your turn');
    if (!kinds.includes(s.step.kind)) fail('You cannot do that now');
    return s.step;
  };

  switch (action.type) {
    case 'initialPeek': {
      if (s.phase !== 'peek' || me.hasPeeked) fail('You already looked');
      const card = peeked(own(action.cardId).card);
      me.hasPeeked = true;
      reveals.push({ to: me.id, cards: [card], reason: 'peek' });
      log(`${me.name} looked at a card`);
      if (s.players.every((p) => p.hasPeeked)) {
        s.phase = 'turn';
        log(`${s.players[s.turn].name} starts`);
      }
      break;
    }

    case 'draw': {
      requireTurn('choose');
      s.step = { kind: 'drawn', card: drawFromStack() ?? fail('The stack is empty') };
      log(`${me.name} drew a card`);
      break;
    }

    case 'takeOpen': {
      requireTurn('choose');
      const { index, card } = own(action.replace);
      const open = s.discard.pop() ?? fail('There is no open card');
      me.hand[index] = open;
      log(`${me.name} took the open ${cardName(open)} and put down ${cardName(card)}`);
      toDiscard(card, me);
      endTurn();
      break;
    }

    case 'swapDrawn': {
      const step = requireTurn('drawn') as Extract<Step, { kind: 'drawn' }>;
      const { index, card } = own(action.replace);
      me.hand[index] = step.card;
      log(`${me.name} swapped in the drawn card and put down ${cardName(card)}`);
      toDiscard(card, me);
      endTurn();
      break;
    }

    case 'discardDrawn': {
      const { card } = requireTurn('drawn') as Extract<Step, { kind: 'drawn' }>;
      const power = powerOf(card, s.hardMode);
      log(`${me.name} put down ${cardName(card)}${power ? ' and uses it' : ''}`);
      toDiscard(card, me);
      const opponentCards = s.players.some((p) => p !== me && !p.locked && p.hand.length);
      const usable =
        power === 'peekOwn'
          ? me.hand.length > 0
          : power === 'spy'
            ? opponentCards
            : power === 'blindSwap' || power === 'openSwap'
              ? me.hand.length > 0 && opponentCards
              : false;
      if (power === 'peekStack') {
        reveals.push({ to: me.id, cards: s.stack.slice(-3).reverse(), reason: 'stack' });
        log(`${me.name} looked at the top of the stack`);
      }
      if (usable) s.step = { kind: power as Exclude<Power, 'peekStack'> };
      else endTurn();
      break;
    }

    case 'peek': {
      const step = requireTurn('peekOwn', 'spy', 'openSwap');
      if (step.kind === 'peekOwn') {
        const card = peeked(own(action.cardId).card);
        reveals.push({ to: me.id, cards: [card], reason: 'peek' });
        log(`${me.name} looked at one of their cards`);
        endTurn();
      } else if (step.kind === 'spy') {
        const { card, player } = opponents(action.cardId);
        peeked(card);
        reveals.push({ to: me.id, cards: [card], reason: 'spy' });
        log(`${me.name} looked at a card of ${player.name}`);
        endTurn();
      } else if (step.kind === 'openSwap' && !step.own) {
        step.own = peeked(own(action.cardId).card).id;
      } else if (step.kind === 'openSwap' && !step.other) {
        step.other = peeked(opponents(action.cardId).card).id;
      } else fail('Decide whether to swap');
      break;
    }

    case 'blindSwap': {
      requireTurn('blindSwap');
      const mine = own(action.own);
      const theirs = opponents(action.other);
      mine.player.hand[mine.index] = theirs.card;
      theirs.player.hand[theirs.index] = mine.card;
      log(`${me.name} blind-swapped a card with ${theirs.player.name}`);
      endTurn();
      break;
    }

    case 'openSwap': {
      const step = requireTurn('openSwap') as Extract<Step, { kind: 'openSwap' }>;
      if (!step.own || !step.other) fail('Look at both cards first');
      // Either card may have been matched away while deciding; then there is nothing to swap.
      const mine = me.hand.findIndex((c) => c.id === step.own);
      const holder = s.players.find((p) => p.hand.some((c) => c.id === step.other));
      if (action.swap === true && mine >= 0 && holder && !holder.locked) {
        const theirs = holder.hand.findIndex((c) => c.id === step.other);
        [me.hand[mine], holder.hand[theirs]] = [holder.hand[theirs], me.hand[mine]];
        log(`${me.name} swapped a card with ${holder.name}`);
      } else log(`${me.name} kept their card`);
      endTurn();
      break;
    }

    case 'skip': {
      requireTurn(...POWER_STEPS);
      log(`${me.name} skipped the power`);
      endTurn();
      break;
    }

    case 'match': {
      if (s.phase === 'ended') fail('The round is over');
      if (me.locked) fail('Your cards are locked');
      const open = s.discard.at(-1) ?? fail('There is no open card');
      if (action.openId !== open.id) fail('Too late: the open card changed');
      const target = locate(action.cardId);
      if (target.player.locked) fail('Swish-swished cards are locked');
      const forOpponent = target.player !== me;
      const give = forOpponent && me.hand.length ? own(action.give) : null;

      if (target.card.rank !== open.rank) {
        reveals.push({ to: 'all', cards: [target.card], reason: 'mismatch' });
        penalty(me);
        log(`${me.name} wrongly matched ${cardName(target.card)} and takes a penalty card`);
        break;
      }
      target.player.hand.splice(target.index, 1);
      toDiscard(target.card, me, true);
      if (give) {
        me.hand.splice(me.hand.indexOf(give.card), 1);
        target.player.hand.splice(target.index, 0, give.card);
        log(`${me.name} matched ${cardName(target.card)} of ${target.player.name} and gave them a card`);
      } else log(`${me.name} matched ${cardName(target.card)}`);
      break;
    }

    case 'swish': {
      requireTurn('choose');
      if (s.turnsTaken < s.players.length) fail('Everyone needs one turn first');
      me.locked = true;
      log(`${me.name}: swish-swish!`);
      if (s.swishBy === null) {
        s.swishBy = me.id;
        s.turnsLeft = s.players.filter((p) => !p.locked).length;
        endTurn(false);
      } else endTurn();
      break;
    }

    default:
      fail('Unknown action');
  }

  return { state: s, reveals };
}

export const score = (player: Player) =>
  player.hand.reduce((sum, card) => sum + points(card), 0);

/** Points added to the swish caller's round score under the house rule (GAME_OVERVIEW.md row 9). */
export const SWISH_PENALTY = 5;

/** The house-rule penalty for this player: "lowest" is judged on card points, before any penalty. */
export const swishPenaltyFor = (s: GameState, player: Player) =>
  s.swishPenalty && s.swishBy === player.id && score(player) > Math.min(...s.players.map(score)) ? SWISH_PENALTY : 0;

/** A player's score for the round: card points plus any house-rule penalty. */
export const roundScore = (s: GameState, player: Player) => score(player) + swishPenaltyFor(s, player);

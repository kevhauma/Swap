import { RuleError, roundScore, type GameState, type Match, type Tally } from '@swap/engine';

/** Allowed targets per mode, inclusive. */
const TARGETS = new Map<Match['mode'], [number, number]>([
  ['wins', [1, 10]],
  ['points', [5, 200]],
]);

/** Validates a client's match choice; anything else is refused. */
export const parseMatch = (match: unknown): Match => {
  const { mode, target } = (match ?? {}) as Partial<Match>;
  const [min, max] = TARGETS.get(mode!) ?? [NaN, NaN];
  if (!Number.isInteger(target) || !(target! >= min && target! <= max))
    throw new RuleError('Play first to 1 to 10 round wins, or to 5 to 200 points');
  return { mode: mode!, target: target! };
};

export const newTally = (match: Match): Tally => ({ match, totals: {}, champions: [] });

/** Each player's points for the round, by seat id, house-rule penalty included. */
export const roundScores = (game: GameState): Record<string, number> =>
  Object.fromEntries(game.players.map((p) => [p.id, roundScore(game, p)]));

/** Everyone tied on the lowest number (rule 8: shared win on ties). */
const lowest = (byId: Record<string, number>) => {
  const min = Math.min(...Object.values(byId));
  return Object.keys(byId).filter((id) => byId[id] === min);
};

/** Counts one finished round and decides whether the match is over. */
export const recordRound = ({ match, totals }: Tally, round: Record<string, number>): Tally => {
  const gained = match.mode === 'wins' ? Object.fromEntries(lowest(round).map((id) => [id, 1])) : round;
  const next = { ...totals };
  for (const [id, n] of Object.entries(gained)) next[id] = (next[id] ?? 0) + n;
  const reached = Object.keys(next).filter((id) => next[id] >= match.target);
  const champions = match.mode === 'wins' ? reached : reached.length ? lowest(next) : [];
  return { match, totals: next, champions };
};

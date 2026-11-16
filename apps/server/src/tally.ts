import { RuleError, score, type GameState, type Match, type Tally } from '@swap/engine';

export const MAX_TARGET_WINS = 10;

/** Validates a client's match choice; anything else is refused. */
export const parseMatch = (match: unknown): Match => {
  const { mode, target } = (match ?? {}) as Partial<Match>;
  if (mode !== 'wins' || !Number.isInteger(target) || target! < 1 || target! > MAX_TARGET_WINS)
    throw new RuleError(`Play first to 1 to ${MAX_TARGET_WINS} round wins`);
  return { mode, target: target! };
};

export const newTally = (match: Match): Tally => ({ match, wins: {}, champions: [] });

/** Everyone with the lowest hand wins the round (rule 8: shared win on ties). */
export const roundWinners = (game: GameState) => {
  const lowest = Math.min(...game.players.map(score));
  return game.players.filter((p) => score(p) === lowest).map((p) => p.id);
};

/** Counts one finished round; every winner who reaches the target wins the match. */
export const recordRound = (tally: Tally, winners: string[]): Tally => {
  const wins = { ...tally.wins };
  for (const id of winners) wins[id] = (wins[id] ?? 0) + 1;
  return { ...tally, wins, champions: Object.keys(wins).filter((id) => wins[id] >= tally.match.target) };
};

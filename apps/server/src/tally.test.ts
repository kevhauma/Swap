import { describe, expect, it } from 'vitest';
import { createGame, RuleError, type Card, type Rank } from '@swap/engine';
import { newTally, parseMatch, recordRound, roundScores } from './tally.ts';

describe('match tally', () => {
  const firstTo = (target: number) => newTally({ mode: 'wins', target });
  const toPoints = (target: number) => newTally({ mode: 'points', target });
  const play = (tally: ReturnType<typeof newTally>, ...rounds: Record<string, number>[]) => rounds.reduce(recordRound, tally);

  it('counts one win per round for the lowest hand', () => {
    const tally = play(firstTo(3), { a: 1, b: 5 }, { a: 7, b: 2 });
    expect(tally.totals).toEqual({ a: 1, b: 1 });
    expect(tally.champions).toEqual([]);
  });

  it('counts a shared win for every winner', () => {
    expect(play(firstTo(3), { a: 1, b: 1, c: 4 }).totals).toEqual({ a: 1, b: 1 });
  });

  it('ends the match when a winner reaches the target', () => {
    expect(play(firstTo(2), { a: 1, b: 5 }, { a: 0, b: 5 }).champions).toEqual(['a']);
  });

  it('lets everyone who reaches the target in the same round win the match', () => {
    expect(play(firstTo(2), { a: 1, b: 1, c: 3 }, { a: 0, b: 0, c: 0 }).champions).toEqual(['a', 'b']);
  });

  it('treats a single round as first to 1', () => {
    expect(play(firstTo(1), { a: 1, b: 5 }).champions).toEqual(['a']);
  });

  it('adds up round scores in points mode, red kings included', () => {
    const tally = play(toPoints(30), { a: 4, b: 9 }, { a: -1, b: 6 });
    expect(tally.totals).toEqual({ a: 3, b: 15 });
    expect(tally.champions).toEqual([]);
  });

  it('ends a points match once a total reaches the target, and the lowest total wins', () => {
    const tally = play(toPoints(10), { a: 2, b: 6, c: 4 }, { a: 3, b: 4, c: 5 });
    expect(tally.totals).toEqual({ a: 5, b: 10, c: 9 });
    expect(tally.champions).toEqual(['a']);
  });

  it('shares a points match between the lowest totals when they tie at the end', () => {
    expect(play(toPoints(10), { a: 4, b: 12, c: 4 }).champions).toEqual(['a', 'c']);
  });

  it('reads every player\'s round score from their hand', () => {
    const game = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, { random: () => 0.5, id: () => 'c' });
    const hand = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ id: rank, rank, suit: 'S' }));
    game.players[0].hand = hand('2', '3');
    game.players[1].hand = hand('K');
    expect(roundScores(game)).toEqual({ a: 5, b: 13 });
  });

  it('adds the swish penalty to the round score, so it counts in points totals', () => {
    const game = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false, swishPenalty: true }, { random: () => 0.5, id: () => 'c' });
    game.players[0].hand = [{ id: '9', rank: '9', suit: 'S' }];
    game.players[1].hand = [{ id: '2', rank: '2', suit: 'S' }];
    game.swishBy = 'a';
    expect(roundScores(game)).toEqual({ a: 14, b: 2 });
    expect(recordRound(toPoints(30), roundScores(game)).totals).toEqual({ a: 14, b: 2 });
  });

  it('accepts first to 1 to 10 round wins or 5 to 200 points, and refuses anything else', () => {
    expect(parseMatch({ mode: 'wins', target: 3 })).toEqual({ mode: 'wins', target: 3 });
    expect(parseMatch({ mode: 'points', target: 30 })).toEqual({ mode: 'points', target: 30 });
    const bad = [undefined, null, {}, { mode: 'nope', target: 3 }, { mode: 'toString', target: 3 }, { mode: 'wins', target: 0 }, { mode: 'wins', target: 11 },
      { mode: 'wins', target: 2.5 }, { mode: 'wins', target: '3' }, { mode: 'points', target: 4 }, { mode: 'points', target: 201 }, { mode: 'points', target: 'x' }];
    for (const match of bad) expect(() => parseMatch(match)).toThrow(RuleError);
  });
});

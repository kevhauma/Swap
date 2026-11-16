import { describe, expect, it } from 'vitest';
import { createGame, RuleError, type Card, type Rank } from '@swap/engine';
import { newTally, parseMatch, recordRound, roundWinners } from './tally.ts';

describe('match tally', () => {
  const firstTo = (target: number) => newTally({ mode: 'wins', target });

  it('counts one win per round for the winner', () => {
    const tally = recordRound(recordRound(firstTo(3), ['a']), ['b']);
    expect(tally.wins).toEqual({ a: 1, b: 1 });
    expect(tally.champions).toEqual([]);
  });

  it('counts a shared win for every winner', () => {
    expect(recordRound(firstTo(3), ['a', 'b']).wins).toEqual({ a: 1, b: 1 });
  });

  it('ends the match when a winner reaches the target', () => {
    const tally = recordRound(recordRound(firstTo(2), ['a']), ['a']);
    expect(tally.champions).toEqual(['a']);
  });

  it('lets everyone who reaches the target in the same round win the match', () => {
    const tally = recordRound(recordRound(firstTo(2), ['a', 'b']), ['a', 'b', 'c']);
    expect(tally.champions).toEqual(['a', 'b']);
  });

  it('treats a single round as first to 1', () => {
    expect(recordRound(firstTo(1), ['a']).champions).toEqual(['a']);
  });

  it('gives the round to every lowest hand', () => {
    const game = createGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], { hardMode: false }, { random: () => 0.5, id: () => 'c' });
    const hand = (rank: Rank): Card[] => [{ id: rank, rank, suit: 'S' }];
    game.players[0].hand = hand('2');
    game.players[1].hand = hand('K');
    expect(roundWinners(game)).toEqual(['a']);
    game.players[1].hand = hand('2');
    expect(roundWinners(game)).toEqual(['a', 'b']);
  });

  it('accepts first to 1 to 10 round wins and refuses anything else', () => {
    expect(parseMatch({ mode: 'wins', target: 3 })).toEqual({ mode: 'wins', target: 3 });
    for (const bad of [undefined, null, {}, { mode: 'points', target: 10 }, { mode: 'wins', target: 0 }, { mode: 'wins', target: 11 }, { mode: 'wins', target: 2.5 }, { mode: 'wins', target: '3' }])
      expect(() => parseMatch(bad)).toThrow(RuleError);
  });
});

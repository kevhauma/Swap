# MODE-3 · House rule: wrong swish-swish penalty

**Priority:** P3 · **Area:** Game modes & options (later) · **Type:** Feature

## User story

As a group, I want an optional penalty when the swish-swish caller doesn't have the lowest score,
so calling it early is a real risk.

## Description

Rule 9 is "no penalty" as written; this adds an optional house rule, toggled in the lobby.

## Current situation (as-is)

- `score` in [game.ts](../packages/engine/src/game.ts) sums card points; the caller (`swishBy`)
  gets no penalty.

## Desired result (to-be)

- With the toggle on, a caller who is not (shared) lowest gets a penalty on their score, shown on
  the end screen.

## Acceptance criteria

- [x] The penalty amount is decided and written in `GAME_OVERVIEW.md` section 5, row 9. (flat +5, decided 2026-11-16; lowest judged before the penalty; row 9 updated)
- [x] Lobby toggle, passed to `createGame` like `hardMode`. (`apps/web/src/App.tsx` checkbox, kept on play-again via `view.swishPenalty`; `start` message `swishPenalty` in `protocol.ts`; server passes `msg.swishPenalty === true` in `apps/server/src/index.ts`; `createGame` option, test "is off unless chosen at the start")
- [x] The end screen shows the penalty separately. (`PlayerView.penalty` in `view.ts`; `Board.tsx` line under the winner: "X called swish-swish without the lowest score: +5 points penalty (included in their N)")
- [x] Engine tests cover: caller lowest → no penalty; caller tied for lowest → no penalty;
      caller not lowest → penalty. (`game.test.ts` "swish penalty house rule (row 9)"; points total in `tally.test.ts` "adds the swish penalty to the round score")
- [x] `npm run check` passes. (tsc clean, 66 tests passed)
- [ ] Verified live in the browser: end screen with and without the penalty. — not ticked: browser verification pending

## Notes

- Interacts with MODE-1: the penalty counts in the points total.

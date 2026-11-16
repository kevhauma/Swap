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

- [ ] The penalty amount is decided and written in `GAME_OVERVIEW.md` section 5, row 9.
- [ ] Lobby toggle, passed to `createGame` like `hardMode`.
- [ ] The end screen shows the penalty separately.
- [ ] Engine tests cover: caller lowest → no penalty; caller tied for lowest → no penalty;
      caller not lowest → penalty.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: end screen with and without the penalty.

## Notes

- Interacts with MODE-1: the penalty counts in the points total.

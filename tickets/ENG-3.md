# ENG-3 · Show *which* card was peeked to everyone

**Priority:** P1 · **Area:** Engine · **Type:** Feature

## User story

As a player, I want to see which card an opponent looked at (not its value), so I can track
what they know, as at the real table.

## Description

Rule 3d: others see the position of a peek, never the value. Today only a log line goes out, so
the information is lost. The engine should put the peeked card id in every player's view.

## Current situation (as-is)

- [game.ts:190](../packages/engine/src/game.ts#L190),
  [254](../packages/engine/src/game.ts#L254), [259](../packages/engine/src/game.ts#L259): first
  peek, 7/8 and 9/10 only push a private `Reveal` and a log line ("looked at a card").
- The black K looks are kept in `step.own` / `step.other`, but
  [view.ts](../packages/engine/src/view.ts) hides them from everyone but the active player.
- `GameView` has no field for "this card was just looked at".

## Desired result (to-be)

- The state records the last peek (e.g. `lastPeek: { by, cardIds }`), replaced on the next peek
  and cleared on the next action that isn't a peek.
- `viewFor` exposes the peeked card ids to every player, never a face.

## Acceptance criteria

- [x] Every peek kind sets the last peek: first peek, 7/8, 9/10, both black-K looks. (`GameState.lastPeek`
      in `packages/engine/src/game.ts`: reset at the top of `apply`, set by `peeked()` in `initialPeek`
      and every `peek` branch; the second K look replaces the first)
- [x] `viewFor` shows the ids to all players; faces stay hidden for everyone but the peeker. (`GameView.lastPeek`
      in `packages/engine/src/view.ts` carries ids only; faces still reach the peeker only via `reveal` / step)
- [x] Engine tests cover: an opponent's view contains the peeked id and no face, for each peek
      kind; the hard-mode 6 (stack peek) shares no hand position. (`game.test.ts` › "peek position
      (rule 3d)": first peek, 7/8 + cleared by next action, 9/10, both black-K looks, hard-mode 6)
- [x] `npm run check` passes. (tsc clean, 33/33 vitest tests pass)

## Notes

- WEB-1 is the client side and needs this ticket first.
- Card ids are opaque and follow the card, so a later swap leaks nothing new.

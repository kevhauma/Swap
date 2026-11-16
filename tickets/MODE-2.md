# MODE-2 · Custom deck

**Priority:** P3 · **Area:** Game modes & options (later) · **Type:** Feature

## User story

As a host, I want to choose which card sets are in the deck, so we can play the variants we know
from another game.

## Description

Rule 1's later option: a lobby setting that picks which ranks are in play.

## Current situation (as-is)

- [cards.ts:88](../packages/engine/src/cards.ts#L88): `newDeck` always builds full 52-card decks
  plus 2 Jokers; [game.ts:84](../packages/engine/src/game.ts#L84) only picks 1 or 2 decks.

## Desired result (to-be)

- The lobby offers the deck choice; `createGame` builds the deck from it.

## Acceptance criteria

- [x] `createGame` takes the chosen ranks; the default stays the full deck. (`options.ranks` in
      [game.ts](../packages/engine/src/game.ts), `newDeck(decks, id, ranks)` in
      [cards.ts](../packages/engine/src/cards.ts); the 1-or-2 decks rule is unchanged; tests
      "deals only the chosen ranks…" and "defaults to the full deck")
- [x] The server validates the choice: known ranks, no duplicates, enough cards to deal 4 per
      player plus the open card. (2026-11-16: the check lives in `createGame`, which throws
      `RuleError`, so server and tests share it; the server passes `msg.ranks` through and now
      builds the game before touching the tally, so a rejected deck leaves the room as it was.
      Server test "passes the chosen ranks to the engine; a rejected deck leaves the room as it
      was")
- [x] Lobby UI for the choice: a compact rank picker, one checkbox per rank (Jokers included),
      all ranks by default, no presets; "Play again" reuses the round's ranks. (`ranks` state and
      the "Cards in the deck" fieldset in [App.tsx](../apps/web/src/App.tsx), a 7-column grid of
      14 chips sized for a 360 px phone; `GameView.ranks` feeds "Play again")
- [x] Engine tests cover: a custom deck deals only chosen ranks; a too-small deck is rejected;
      an unknown rank is rejected. (`custom deck (row 1)` in
      [game.test.ts](../packages/engine/src/game.test.ts), which also covers repeated ranks and
      the two-deck size at 5 players)
- [x] `npm run check` passes. (tsc + 71 tests across 4 files, 2026-11-16)
- [ ] Verified live in the browser: start a game with a reduced deck, and the rank picker fits a
      360 px wide screen. — not ticked: browser verification pending

## Notes

- Decided 2026-11-16: a free rank picker (one checkbox per rank, Jokers count as a rank), all
  ranks by default, no named presets. Recorded in `GAME_OVERVIEW.md` section 2 and section 5,
  row 1.
- Powers belong to ranks (7/8 peek, 9/10 spy, J/Q blind swap, black K open swap, hard-mode 3 and
  6). Removing a rank removes those cards and nothing else; no special handling.

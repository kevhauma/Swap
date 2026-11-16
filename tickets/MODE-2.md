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

- [ ] `createGame` takes the chosen ranks; the default stays the full deck.
- [ ] The server validates the choice: known ranks, enough cards to deal 4 per player plus the
      open card.
- [ ] Lobby UI for the choice.
- [ ] Engine tests cover: a custom deck deals only chosen ranks; a too-small deck is rejected.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: start a game with a reduced deck.

## Notes

- Which presets the group wants is open; ask before building.

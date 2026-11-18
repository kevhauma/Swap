# ENG-2 · Player count 2–6 vs 2–8

**Priority:** P1 · **Area:** Engine · **Type:** Bug fix

## User story

As a host, I want the lobby, server and rules to agree on how many players fit at the table, so
I never fill a room the docs say the game doesn't support.

## Description

`GAME_OVERVIEW.md` says 2–6 players; the code allows 8 in three places. Align everything on the
documented 6.

## Current situation (as-is)

- [game.ts:83](../packages/engine/src/game.ts#L83): `createGame` accepts 2 to 8 players.
- [server index.ts:35](../apps/server/src/index.ts#L35): `MAX_SEATS = 8`, checked on join and on
  `addBot`.
- [App.tsx:123](../apps/web/src/App.tsx#L123): "Add bot" is disabled at a hard-coded 8.

## Desired result (to-be)

- One maximum (6), defined once in `packages/engine` and used by engine, server and lobby.

## Acceptance criteria

- [x] The engine exports the maximum; `createGame` rejects 7+ players with a `RuleError`. (`MAX_PLAYERS = 6` exported from `packages/engine/src/game.ts`, checked in `createGame`)
- [x] The server's seat limit and the lobby's "Add bot" button use that export, no literal 8. (`apps/server/src/index.ts` join + `addBot` use `MAX_PLAYERS`, `MAX_SEATS` removed; `apps/web/src/App.tsx` button uses `MAX_PLAYERS`)
- [x] Engine test covers: 6 players start, 7 are rejected. (`game.test.ts` › setup › "seats up to 6 players and rejects more")
- [x] `npm run check` passes. (tsc clean, vitest 28/28 passed)
- [ ] Verified live in the browser: "Add bot" disables at 6 seats. — not ticked: browser verification pending

## Notes

- If the group wants 8, change `GAME_OVERVIEW.md` (sections 6 and 7) instead; either way, one
  number.
- Two decks above 4 players stays as is.

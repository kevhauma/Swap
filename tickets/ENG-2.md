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

- [ ] The engine exports the maximum; `createGame` rejects 7+ players with a `RuleError`.
- [ ] The server's seat limit and the lobby's "Add bot" button use that export, no literal 8.
- [ ] Engine test covers: 6 players start, 7 are rejected.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: "Add bot" disables at 6 seats.

## Notes

- If the group wants 8, change `GAME_OVERVIEW.md` (sections 6 and 7) instead; either way, one
  number.
- Two decks above 4 players stays as is.

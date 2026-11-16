# SRV-2 · Server integration test

**Priority:** P2 · **Area:** Server · **Type:** Feature

## User story

As a developer, I want the server's room logic under test, so reconnect and match-race bugs show
up in `npm run check` instead of on a game night.

## Description

Only the engine has tests. Add one Vitest file that drives the real WebSocket server.

## Current situation (as-is)

- [apps/server/src/index.ts](../apps/server/src/index.ts) has no tests; it starts listening on
  import ([line 115](../apps/server/src/index.ts#L115)) and reads `PORT`
  ([line 34](../apps/server/src/index.ts#L34)).

## Desired result (to-be)

- A test starts the server on a free port, connects clients with the built-in `WebSocket`, and
  checks the room rules end to end.

## Acceptance criteria

- [x] Test: two clients join one room and both receive the seat list. (apps/server/src/index.test.ts: 'sends the seat list to both clients in a room')
- [x] Test: reconnecting with the token reclaims the same seat id. (apps/server/src/index.test.ts: 'gives a reconnecting player the same seat via the token')
- [x] Test: joining the same seat from a second socket closes the first with code 4000. (apps/server/src/index.test.ts: 'closes the old socket with 4000 when the seat joins from another socket')
- [x] Test: two matches against one open card → the second gets "Too late", no penalty. (apps/server/src/index.test.ts: 'rejects the second of two matches on one open card as too late, without penalty'; deterministic `Ctx` passed to `startServer`, deal rebuilt with `createGame`)
- [x] The test cleans up (server closed, timers cleared) so Vitest exits. (`afterAll` closes the server and asserts the active `Timeout` count is back to its pre-start value; the server's `close` handler clears the heartbeat and every room's timers. Removing that clearing makes the assertion fail, 7 vs 1)
- [x] `npm run check` passes. (tsc + vitest: 2 files, 39 tests passed)

## Notes

- If the server must export a start function to be testable, keep `npm start` unchanged.
- The match race needs a known hand: seed a deterministic `Ctx` or read cards from a reveal.
  Choose the smaller change.

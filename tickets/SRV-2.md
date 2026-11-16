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

- [ ] Test: two clients join one room and both receive the seat list.
- [ ] Test: reconnecting with the token reclaims the same seat id.
- [ ] Test: joining the same seat from a second socket closes the first with code 4000.
- [ ] Test: two matches against one open card → the second gets "Too late", no penalty.
- [ ] The test cleans up (server closed, timers cleared) so Vitest exits.
- [ ] `npm run check` passes.

## Notes

- If the server must export a start function to be testable, keep `npm start` unchanged.
- The match race needs a known hand: seed a deterministic `Ctx` or read cards from a reveal.
  Choose the smaller change.

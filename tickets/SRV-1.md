# SRV-1 · An offline player stalls the game

**Priority:** P1 · **Area:** Server · **Type:** Feature

## User story

As a player, I want the game to keep going when someone's phone drops, so one bad connection
doesn't freeze the round for everyone.

## Description

When a human goes offline on their turn, or before their first peek, nothing moves until they
come back. Reuse the existing bot to play the seat while it is away.

## Current situation (as-is)

- [server index.ts:164](../apps/server/src/index.ts#L164): on `close` the seat only loses its
  socket (`seat.socket = null`); its turn waits forever.
- Bots already play seats via `scheduleBot` and `botAction`
  ([server index.ts:75](../apps/server/src/index.ts#L75)).
- [App.tsx:114](../apps/web/src/App.tsx#L114): the seat list shows "offline", nothing more.

## Desired result (to-be)

- After ~30 s offline during a running game, a bot plays the seat with empty memory (it knows
  nothing the player knew).
- When the player reconnects with their token, they take the seat back immediately.
- The seat list shows "away (bot playing)".

## Acceptance criteria

- [ ] A seat offline for 30 s in a running game gets bot moves; an online seat never does.
- [ ] Reconnecting stops the bot before its next move; the player keeps their cards.
- [ ] The takeover bot starts with empty memory.
- [ ] `Seat` in `protocol.ts` carries the away state; the client shows "away (bot playing)".
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: close one tab on its turn, the game continues after ~30 s;
      reopen it, the seat is yours again.

## Notes

- The 30 s timeout is a constant, not a setting.
- A visible countdown would be WEB-5's timer; not part of this ticket.

# WEB-1 · Highlight the peeked slot for everyone

**Priority:** P1 · **Area:** Web client · **Type:** Feature

## User story

As a player, I want the card an opponent just looked at to light up on my screen, so I notice
the peek without reading the log.

## Description

Client side of ENG-3: when the view names peeked card ids, highlight those cards on every screen
for about 2 seconds.

## Current situation (as-is)

- [Board.tsx](../apps/web/src/Board.tsx) shows peeks only to the peeker, through the `revealed`
  faces from [useSwap.ts](../apps/web/src/useSwap.ts) (`REVEAL_MS` = 2.5 s).
- Other players see only the log line.

## Desired result (to-be)

- Every player sees a short highlight on the peeked card(s), theirs or an opponent's. No face is
  shown to anyone but the peeker.

## Acceptance criteria

- [ ] The highlight shows for ~2 s on the peeked card id(s) from the view, then stops.
- [ ] Works for first peek, 7/8, 9/10 and both black-K looks.
- [ ] The highlight is not colour-only (outline or motion too) and respects
      `prefers-reduced-motion`.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: in two tabs, a peek in one highlights the same card in the
      other.

## Notes

- Needs ENG-3 first.

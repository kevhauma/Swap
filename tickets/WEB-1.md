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

- [x] The highlight shows for ~2 s on the peeked card id(s) from the view, then stops.
      (`apps/web/src/Board.tsx`: `peeked` state set when `view.lastPeek.cardIds` changes, cleared
      by its own `PEEK_HIGHLIGHT_MS` = 2000 timer, so the next action clearing `lastPeek` does not
      cut it short)
- [x] Works for first peek, 7/8, 9/10 and both black-K looks. (the client keys on whatever ids
      `lastPeek` names; engine tests `peek position (rule 3d)` cover each case setting them; for
      the black K the second look changes the ids, so the highlight moves to the opponent's card
      and its timer restarts)
- [x] The highlight is not colour-only (outline or motion too) and respects
      `prefers-reduced-motion`. (`apps/web/src/index.css` `.peeked`: dashed outline plus a
      `scale` pulse; the pulse is turned off under `prefers-reduced-motion: reduce`, the outline
      stays)
- [x] `npm run check` passes. (tsc clean, 33 tests passed)
- [ ] Verified live in the browser: in two tabs, a peek in one highlights the same card in the
      other. — not ticked: browser verification pending

## Notes

- Needs ENG-3 first.

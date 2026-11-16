# WEB-5 · Table mood from the 3D render

**Priority:** P2 · **Area:** Web client · **Type:** Feature

## User story

As a player, I want the table to feel like the render in the rules PDF, so the game feels like
our game night and not a form.

## Description

Borrow the mood of the 3D render, still in 2D: a name plate with avatar per player and a clear
turn indicator next to the active player.

## Current situation (as-is)

- [Board.tsx](../apps/web/src/Board.tsx) renders the kitchen card table; opponents show a name,
  the turn dot and a locked badge.
- No avatar or name plate like "Salat" in the render (page 2 of `Swap rules_.pdf`).

## Desired result (to-be)

- Each player has a name plate with an avatar (initials or a generated pattern, no uploads).
- The active player's plate is clearly marked, not by colour alone.

## Acceptance criteria

- [ ] Name plate and avatar per opponent and for yourself.
- [ ] The turn indicator reads without colour (shape, text or motion).
- [ ] Still fits the 6-seat phone layout from WEB-2.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: 2 and 6 seats.

## Notes

- The render's timer is out of scope; it only comes in if SRV-1 needs a visible countdown.
- Use the `impeccable` skill for the design pass.

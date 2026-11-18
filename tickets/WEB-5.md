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

- [x] Name plate and avatar per opponent and for yourself. (`Avatar` + `.plate` in `Board.tsx`/`index.css`: a 28 px poker-chip disc with the initials, hue stepped by the golden angle per seat, on a darker-felt plate with the name; headless Edge screenshots `seats-2-play.png`, `seats-6-play.png` in the WEB-5 scratchpad show it for every opponent and "You")
- [x] The turn indicator reads without colour (shape, text or motion). (Shape: the chalk loop now circles the whole plate; motion: `.their-turn .avatar` bobs (`turn-bob`, off under `prefers-reduced-motion`); text: "your go!" for you, sr-only "(their turn)" for all; headless Edge read `animationName` = `turn-bob` on Bot 1's turn, `seats-6-opponent-turn.png`)
- [x] Still fits the 6-seat phone layout from WEB-2. (WEB-2 harness `layout.mjs` at 360 × 740, 5 bots, before vs after this diff: identical `myHandBottom` 742, `stackBottom` 517, 7-card `scrollHeight` 1350, `scrollWidth` 360, 0 cards off-screen; plate is 28 px avatar + 28 px name inside the 64 px card height, lock and score sit beside the avatar in rows)
- [x] `npm run check` passes. (tsc clean, 46/46 Vitest tests)
- [ ] Verified live in the browser: 2 and 6 seats. — not ticked: browser verification pending (headless Edge screenshots at 2 and 6 seats exist, but no interactive check)

## Notes

- The render's timer is out of scope; it only comes in if SRV-1 needs a visible countdown.
- Use the `impeccable` skill for the design pass.

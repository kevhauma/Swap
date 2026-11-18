# WEB-2 · Layout for 3–6 players on a phone

**Priority:** P2 · **Area:** Web client · **Type:** Feature

## User story

As a player in a bigger group, I want every opponent's cards to fit on my phone screen, so a
6-player game is as playable as a 2-player one.

## Description

The mocks are 2-player. Make the opponent area work with up to 5 opponents in portrait at 360 px
wide.

## Current situation (as-is)

- [Board.tsx:194](../apps/web/src/Board.tsx#L194): opponents sit in a 2-column grid once there is
  more than one; hands wrap with `flex-wrap` ([Board.tsx:164](../apps/web/src/Board.tsx#L164)).
- Not checked with 5 opponents or with hands grown by penalty cards.

## Desired result (to-be)

- With 1–5 opponents, every opponent card is visible and tappable without horizontal scroll; the
  stack, open card and your own row stay on screen.
- Rows stay unrotated (Motion layout animations are not corrected for rotated parents).

## Acceptance criteria

- [x] 6 seats on a 360 × 740 viewport: no horizontal scroll, every card visible. (Headless Edge
  via CDP at 360 × 740, 5 bots: `scrollWidth` 360 = `clientWidth`, 0 cards outside 0–360 px; with
  opponents one per line (`renderHand(…, row)` in `Board.tsx`) and the felt gaps tightened, the
  bottom of your own hand sits at y = 734 with a two-line hint, so all 24 dealt cards show without
  scrolling.)
- [x] Opponent cards keep a hit area of at least 44 × 44 px (spy and swaps tap them). (`SIZES.sm`
  in `PlayingCard.tsx` is now `w-11` at every width: 44 × 64 px; measured ≥ 45 × 65 bounding boxes
  including the fan tilt.)
- [x] A hand of 6+ cards (after penalties) still fits. (Same harness with every hand padded to 7
  cards at 2, 4 and 6 seats: hands wrap to a second row (third for your own), `scrollWidth` stays
  360, 0 cards off-screen horizontally. The page then scrolls vertically.)
- [x] `npm run check` passes. (tsc clean, 33/33 Vitest tests.)
- [ ] Verified live in the browser: 2, 4 and 6 seats (bots) at 360 px width. — not ticked: browser verification pending

## Notes

- The final maximum comes from ENG-2.

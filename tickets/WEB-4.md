# WEB-4 · Animation gaps

**Priority:** P2 · **Area:** Web client · **Type:** Feature

## User story

As a player, I want every card move to animate from where it came from, so I can follow what
just happened on the table.

## Description

Shared layout animations already move cards between rows and piles. Fix the moves that jump or
pop, and honour reduced motion.

## Current situation (as-is)

- [PlayingCard.tsx:44](../apps/web/src/PlayingCard.tsx#L44): each card has `layoutId={card.id}`;
  [line 57](../apps/web/src/PlayingCard.tsx#L57) flips it with `rotateY`.
- Not checked: penalty card from stack to hand, matched opponent card plus the card given back,
  reshuffle (new ids, so cards appear without a source).
- No `prefers-reduced-motion` handling.

## Desired result (to-be)

- Penalty cards and given cards slide from their source; a reshuffle has a short, deliberate
  effect instead of cards popping in.
- With reduced motion, moves become instant or fades.

## Acceptance criteria

- [x] A penalty card animates from the stack into the hand. (Already worked through the shared
      `layoutId`; headless Edge at 360x740 with scripted views: the new hand card starts at the stack
      (75,147, stack at 98,140) and springs to its slot (145,466) over ~350 ms.)
- [x] Opponent match: the matched card goes to the open pile and the given card moves to the
      opponent, both visibly. (Headless Edge: matched card slides from Bob's row (137,68) to the
      open pile (195,146); given card slides from my hand (118,352) to Bob's slot (134,63). Before
      the fix the given card passed behind the stack for ~100 ms (`elementFromPoint` hit another
      element); [PlayingCard.tsx](../apps/web/src/PlayingCard.tsx) now raises `zIndex` during a
      layout animation and it stays on top for every sample.)
- [x] A reshuffle has a short visual cue on the stack. ([Board.tsx](../apps/web/src/Board.tsx)
      counts stack growth and re-keys the stack wrapper, which plays the 0.6 s `riffle` keyframes in
      [index.css](../apps/web/src/index.css); headless Edge: `document.getAnimations()` shows
      `riffle` right after the stack goes from 0 to 20. Also plays when a new round is dealt.)
- [x] `prefers-reduced-motion: reduce` disables movement (e.g. `MotionConfig
      reducedMotion="user"`). ([main.tsx](../apps/web/src/main.tsx) wraps the app in
      `MotionConfig reducedMotion="user"`; `.reshuffled` is in the reduced-motion block of
      index.css. Headless Edge with emulated `prefers-reduced-motion: reduce`: all three cards sit
      at their final position from the first frame, and no `riffle` animation runs.)
- [x] `npm run check` passes. (tsc clean, 33/33 vitest tests.)
- [ ] Verified live in the browser: each case above, in two tabs. � not ticked: browser
      verification pending (headless measurements above are not a check of how the motion feels).

## Notes

- The stack's top card id is already in the view (`stackTopId` in
  [view.ts](../packages/engine/src/view.ts)), so a penalty card has a source to animate from.

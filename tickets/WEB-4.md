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

- [ ] A penalty card animates from the stack into the hand.
- [ ] Opponent match: the matched card goes to the open pile and the given card moves to the
      opponent, both visibly.
- [ ] A reshuffle has a short visual cue on the stack.
- [ ] `prefers-reduced-motion: reduce` disables movement (e.g. `MotionConfig
      reducedMotion="user"`).
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: each case above, in two tabs.

## Notes

- The stack's top card id is already in the view (`stackTopId` in
  [view.ts](../packages/engine/src/view.ts)), so a penalty card has a source to animate from.

# WEB-6 · Draw from an empty stack

**Priority:** P1 · **Area:** Web client · **Type:** Bug fix

## User story

As a player in a long round, I want to draw when the stack is empty, so the discard pile gets
shuffled back in as the rules say instead of the Draw button going dead.

## Description

The engine reshuffles the discard pile on the next draw (rule 7), but the client disables Draw
as soon as the stack hits 0, so a normal draw can never trigger the reshuffle.

## Current situation (as-is)

- [game.ts:148](../packages/engine/src/game.ts#L148): `drawFromStack` reshuffles lazily when the
  stack is empty and the discard pile has more than one card.
- [Board.tsx:293](../apps/web/src/Board.tsx#L293): Draw is `disabled={!view.stackCount}`, and
  the stack shows an empty `Slot` (not tappable) when `stackTopId` is null. Root cause: the view
  only exposes the stack, not whether a draw is possible.
- The bot has the same blind spot if it checks the stack count.

## Desired result (to-be)

- Draw is possible whenever the engine would accept it (stack non-empty, or discard pile > 1).
- The WEB-4 riffle plays on that reshuffle.

## Acceptance criteria

- [ ] The view tells the client whether a draw is possible, without client-side rule logic.
- [ ] Board enables Draw and the stack tap from it; bot draws in the same case.
- [ ] Engine tests cover: draw with empty stack and discard > 1 reshuffles with new ids; with
      discard of 1 the draw is refused.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: empty the stack, draw, the riffle plays.

## Notes

- Found while working WEB-4 (2026-11-16).

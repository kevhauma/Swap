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
  _2026-11-16, checked against the code: [bot.ts](../packages/engine/src/bot.ts) never looked at
  the stack; it always drew, so the reshuffle case already worked, but with nothing to draw it
  sent a refused `draw` and the seat stalled (the server only logs a bot's invalid move)._

## Desired result (to-be)

- Draw is possible whenever the engine would accept it (stack non-empty, or discard pile > 1).
- The WEB-4 riffle plays on that reshuffle.

## Acceptance criteria

- [x] The view tells the client whether a draw is possible, without client-side rule logic.
      (`canDraw` in `GameView`, computed by `viewFor` in
      [view.ts](../packages/engine/src/view.ts))
- [x] Board enables Draw and the stack tap from it; bot draws in the same case.
      ([Board.tsx](../apps/web/src/Board.tsx): one `draw` handler drives the Draw button, the
      stack card and, when the stack is empty but drawable, a tappable empty slot. The bot already
      drew in this case; _amended 2026-11-16:_ when `canDraw` is false it now takes the open card
      instead of sending a refused draw, test "take the open card when the stack is empty and
      nothing can be shuffled in")
- [x] Engine tests cover: draw with empty stack and discard > 1 reshuffles with new ids; with
      discard of 1 the draw is refused. (game.test.ts: "reshuffles the discard pile with new ids
      when the stack runs out, keeping the open card", now also asserting `canDraw`; "refuses a
      draw when the stack is empty and only the open card is on the discard pile")
- [x] `npm run check` passes. (tsc clean, 50 tests passed)
- [ ] Verified live in the browser: empty the stack, draw, the riffle plays. — not ticked: browser
      verification pending. (The riffle keys on `stackCount` growing, which a draw-triggered
      reshuffle does whenever the discard pile has 3+ cards; a 2-card pile leaves the count at 0
      and plays no riffle, noted as a `shortcut:` in Board.tsx.)

## Notes

- Found while working WEB-4 (2026-11-16).

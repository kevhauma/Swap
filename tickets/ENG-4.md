# ENG-4 · Open swap: a picked card that was matched away

**Priority:** P1 · **Area:** Engine · **Type:** Bug fix

## User story

As a player using a black K, I want the game to know I already picked a card even if someone
matched it away meanwhile, so I can finish the power instead of getting "Pick an opponent card".

## Description

During an open swap (black K) other players can still match. If they match away a card the
active player already picked, the view drops it and the client (and bot) believe nothing was
picked yet.

## Current situation (as-is)

- [view.ts:65](../packages/engine/src/view.ts#L65): `own` / `other` are built with
  `handCard(step.own)`, which is `undefined` once the card left every hand. Root cause: the view
  cannot tell "not picked" from "picked, then matched away".
- [game.ts:273](../packages/engine/src/game.ts#L273): the engine still has `step.own` set, so a
  second pick of an own card falls into the `!step.other` branch and fails with "Pick an
  opponent card".
- [game.ts:294](../packages/engine/src/game.ts#L294): the final `openSwap` already handles a
  matched-away card (keeps both, ends the turn).
- [bot.ts](../packages/engine/src/bot.ts): bots skip matching during an open swap (`shortcut:`
  from ENG-1) only to dodge this.

## Desired result (to-be)

- The view says a card was picked even when it is gone, without leaking any face.
- The client and bot move on to the next pick / the decision instead of re-picking.
- The bot's open-swap matching guard is removed.

## Acceptance criteria

- [ ] `StepView` for `openSwap` distinguishes "not picked" from "picked, now gone".
- [ ] Board and bot use it: no re-pick of a gone card; the swap decision still ends the turn.
- [ ] The ENG-1 `shortcut:` guard in `bot.ts` is removed; bot-vs-bot games still pass.
- [ ] Engine tests cover: own pick matched away, other pick matched away, view shows no hidden
      face.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: two tabs, one matches away the other's picked card mid-K.

## Notes

- Found while working ENG-1 (2026-11-16).

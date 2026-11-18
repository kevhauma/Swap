# BOT-1 · Bots match opponent cards

**Priority:** P2 · **Area:** Bots · **Type:** Feature

## User story

As a solo player, I want bots that also match my cards when they know them, so playing against
bots feels like playing against people.

## Description

Bots only match their own cards. Let them match a known opponent card and give away their worst
card, as the rules allow.

## Current situation (as-is)

- [bot.ts:25](../packages/engine/src/bot.ts#L25): `shortcut: never matches opponent cards and
  never bluffs`.
- [bot.ts:38](../packages/engine/src/bot.ts#L38): the match check only scans `me.cards`.

## Desired result (to-be)

- When a known, unlocked opponent card has the open card's rank, the bot matches it and gives the
  opponent its highest-estimated card.

## Acceptance criteria

- [x] The bot matches a known opponent card of the open rank and passes `give` = its worst card.
      (`packages/engine/src/bot.ts`: own match first, then `others.find(ofOpenRank)` with
      `give: worst?.id`)
- [x] The bot never matches a locked player's card. (`others` filters `!p.locked`; test "never
      match a locked player's card")
- [x] The `shortcut:` comment is updated (bluffing is still not done). (bot.ts docblock:
      `shortcut: never bluffs; enough to fill a seat.`)
- [x] Engine test covers: a bot that knows an opponent card of the open rank returns that match.
      (`game.test.ts` "match a known opponent card of the open rank and give their worst card")
- [x] The "bots play complete games without breaking a rule" test still passes with opponent
      matching active. (`npm run check`: 35/35 tests pass)
- [x] `npm run check` passes. (tsc + vitest, 35 passed)

## Notes

- Needs ENG-1 first (match by rank).

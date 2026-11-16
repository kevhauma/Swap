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

- [ ] The bot matches a known opponent card of the open rank and passes `give` = its worst card.
- [ ] The bot never matches a locked player's card.
- [ ] The `shortcut:` comment is updated (bluffing is still not done).
- [ ] Engine test covers: a bot that knows an opponent card of the open rank returns that match.
- [ ] The "bots play complete games without breaking a rule" test still passes with opponent
      matching active.
- [ ] `npm run check` passes.

## Notes

- Needs ENG-1 first (match by rank).

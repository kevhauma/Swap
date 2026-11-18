# ENG-1 · Match by rank, not by point value

**Priority:** P0 · **Area:** Engine · **Type:** Bug fix

## User story

As a player, I want a card to match the open card whenever it has the same rank, so matching
works the way we play at the table (a red K on a black K, a Joker on a Joker).

## Description

Rule 3a in `GAME_OVERVIEW.md` changed from "same point value" to "same rank, colour does not
matter". The engine and the bot still use the old rule.

## Current situation (as-is)

- [game.ts:312](../packages/engine/src/game.ts#L312): `match` compares `points(target.card)`
  with `points(open)`. Root cause: a red K (-1) never matches a black K (13), so a correct match
  is punished with a penalty card.
- [game.test.ts:206](../packages/engine/src/game.test.ts#L206): the test "matches by value, so
  red and black kings do not match" asserts the old rule.
- [bot.ts:38](../packages/engine/src/bot.ts#L38): the bot looks for matches by `points` too.

## Desired result (to-be)

- A match succeeds when `target.card.rank === open.rank`; suit and colour are ignored.
- Bots look for matches by rank.

## Acceptance criteria

- [x] `match` in `game.ts` compares ranks, not points. (`game.ts` match case:
      `target.card.rank !== open.rank`)
- [x] The bot in `bot.ts` matches by rank. (`bot.ts`: `known(c).rank === open.rank`; test
      "bots > match a known card of the same rank, whatever its colour")
- [x] Engine tests cover: red K matches black K; Joker matches Joker; a different rank still
      gets the penalty card. (`game.test.ts` "matching > matches by rank, so a black king matches
      a red king", "a joker matches a joker", "wrong match: card shown to all, penalty card added")
- [x] The old "red and black kings do not match" test is replaced, not left contradicting.
      (replaced by "matches by rank, so a black king matches a red king")
- [x] `npm run check` passes. (tsc clean, 27/27 vitest tests pass)

## Notes

- `GAME_OVERVIEW.md` already states the new rule (section 4.4 and row 3a); no doc change.
- Independent, can ship any time.
- 2026-11-16: matching by rank made the bot self-play test hit a hidden bug. During an open
  swap, `viewFor` drops a picked card once it has been matched away, so the bot picked again and
  broke a rule. Bots now skip matching while an open swap is in progress (`bot.ts`). Humans can
  still match a bot's picked card away mid-swap. The real fix is in the view, and it needs its
  own ticket.

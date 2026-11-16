# MODE-1 · Multi-round games

**Priority:** P3 · **Area:** Game modes & options (later) · **Type:** Feature

## User story

As a group, I want to play several rounds and keep score, so a game night has an overall winner
like it does at the table.

## Description

Rule 8's later modes: count round **wins** (how the group plays now), or add up points and play
to a target (e.g. 10 or 30).

## Current situation (as-is)

- One round per game; "play again" starts a fresh round with no history
  ([App.tsx:92](../apps/web/src/App.tsx#L92),
  [server index.ts:145](../apps/server/src/index.ts#L145)).
- The end screen shows only this round's winner ([Board.tsx:187](../apps/web/src/Board.tsx#L187)).

## Desired result (to-be)

- The lobby picks a mode: single round, first to N round wins, or points to a target.
- The server room keeps the tally across rounds; the engine stays single-round.
- The end screen shows the scoreboard and, once reached, the overall winner.

## Acceptance criteria

- [x] Mode and target are chosen in the lobby and validated on the server. (Lobby select `MATCHES` in `apps/web/src/App.tsx`: "Single round" / "First to 2, 3, 5, 10 round wins" / "Points to 10, 30, 50"; `parseMatch` in `apps/server/src/tally.ts` refuses anything but `{ mode: 'wins', target: 1..10 }` or `{ mode: 'points', target: 5..200 }`; tests `accepts first to 1 to 10 round wins or 5 to 200 points, and refuses anything else` and the server test's rejected `mode: 'nope'` start.)
- [x] The room tally updates once per finished round; a shared win counts for every winner. (`act` in `apps/server/src/index.ts` records the round only on the transition into `ended`; `recordRound` adds one win per winner; tests `counts a shared win for every winner` and `keeps the round-win tally across rounds until the target, then starts a new match`.)
- [x] Points mode: the rule for who wins at the target is decided and written in
      `GAME_OVERVIEW.md` section 5 before building. (User decision 2026-11-16, written into row 8: totals add up; once anyone reaches the target at the end of a round, the lowest total wins, ties shared. Built as `{ mode: 'points'; target }` in `packages/engine/src/protocol.ts` and `recordRound` in `apps/server/src/tally.ts`.)
- [x] Scoreboard on the end screen. (`Board.tsx`: "Round wins, first to N" or, in points mode, "Points, ends at N, lowest total wins" with each player's total; the match winner once reached, and the button reads Next round / New match; hidden for a single round, which keeps today's end screen.)
- [x] Tests cover the tally: win counting, ties, target reached. (`apps/server/src/tally.test.ts`: win counting, shared win, target reached, several reach the target together; points totals (`adds up round scores in points mode, red kings included`), target reached with lowest total winning, tie at the end shared; `roundScores` from the hands; plus the WebSocket round-trip in `apps/server/src/index.test.ts`.)
- [x] `npm run check` passes. (61 tests, tsc clean, after points mode.)
- [ ] Verified live in the browser: three rounds with bots in each mode. — not ticked: browser verification pending

## Notes

- Points mode needs that rule decision first; the wins mode can ship alone.
- 2026-11-16, wins mode built: a single round is "first to 1 round win", so both shipped modes are
  one `Match = { mode: 'wins', target }`; points mode adds a `mode: 'points'` variant later. If
  several players reach N in the same round (a shared round win), they all win the match, as rule 8's
  shared win (written into `GAME_OVERVIEW.md` section 5, row 8). A match in progress keeps its mode;
  the next start after a match is won opens a fresh tally. Seats that join between rounds start at 0.
- 2026-11-16, points mode built: `Tally.wins` became `Tally.totals` (round wins or points, per mode).
  `roundScores(game)` in `apps/server/src/tally.ts` is the one place a player's round score is read,
  so MODE-3's swish penalty adds there and counts in both the round winner and the points total.
  Points targets are 5 to 200 (lobby presets 10, 30, 50). Seats that join mid-match start at 0 in
  points mode too, which puts a late joiner ahead; whether to block that or seed them is open.

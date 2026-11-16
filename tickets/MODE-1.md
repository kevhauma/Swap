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

- [ ] Mode and target are chosen in the lobby and validated on the server.
- [ ] The room tally updates once per finished round; a shared win counts for every winner.
- [ ] Points mode: the rule for who wins at the target is decided and written in
      `GAME_OVERVIEW.md` section 5 before building.
- [ ] Scoreboard on the end screen.
- [ ] Tests cover the tally: win counting, ties, target reached.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: three rounds with bots in each mode.

## Notes

- Points mode needs that rule decision first; the wins mode can ship alone.

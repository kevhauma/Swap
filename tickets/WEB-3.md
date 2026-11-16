# WEB-3 · Sounds

**Priority:** P2 · **Area:** Web client · **Type:** Feature

## User story

As a player, I want short sounds for the main moves, so I notice what happens even when I'm not
looking at the screen.

## Description

Add sounds for draw, flip, swap, match, wrong match and swish-swish, with a mute toggle.

## Current situation (as-is)

- No audio anywhere in [apps/web/src](../apps/web/src).

## Desired result (to-be)

- Each event plays one short sound; a mute toggle is remembered per device.

## Acceptance criteria

- [x] Sounds for draw, flip, swap, match, wrong match and swish-swish, triggered by view and
      reveal changes, not by client-side rule logic. (`soundFor(prev, next)` in
      `apps/web/src/sounds.ts` diffs two server views: a seat newly locked = swish, fewer hand
      cards = match, a hand holding a new card id = swap, step becomes `drawn` = draw, a new
      `lastPeek` or the round ending = flip. `useSwap.ts` plays it on each `room` message, and
      plays wrong/flip on `mismatch`/`stack` reveals. Covered by `apps/web/src/sounds.test.ts`,
      which uses real `apply` + `viewFor` states.)
- [x] Mute toggle with an accessible label, stored in `localStorage` (wrapped in try/catch like
      `storage` in `useSwap.ts`). (Board's speaker button: `aria-label="Mute sounds"` +
      `aria-pressed`. `isMuted`/`setMuted` in `sounds.ts` use key `swap:muted` inside try/catch.)
- [x] No sound before the first user interaction (browser autoplay rules). (The `AudioContext`
      is created only by `unlockAudio`, which App attaches to `click`/`keydown`. Until then
      `play` is a no-op.)
- [x] ~~Sound files are small (under 100 kB in total) and licensed for use.~~ 2026-11-16: no
      sound files. All six sounds are synthesized with the Web Audio API (`TONES` in
      `sounds.ts`: oscillator sweeps with a gain decay), so they add 0 kB of assets and raise no
      licensing question. Nothing was downloaded.
- [x] `npm run check` passes. (tsc clean; vitest 3 files / 46 tests passed, including 7 new
      `soundFor` tests.)
- [ ] Verified live in the browser: each sound plays once per event; mute silences all. — not
      ticked: browser verification pending

## Notes

- Whether sound starts muted is decided during the browser check. Implemented default:
  unmuted (sounds only start after the first click or key press anyway).
- Not covered: another player's hard-mode stack peek (6). Their view carries no `lastPeek` for
  it, so only the peeker hears a flip.

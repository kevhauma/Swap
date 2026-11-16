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

- [ ] Sounds for draw, flip, swap, match, wrong match and swish-swish, triggered by view and
      reveal changes, not by client-side rule logic.
- [ ] Mute toggle with an accessible label, stored in `localStorage` (wrapped in try/catch like
      `storage` in `useSwap.ts`).
- [ ] No sound before the first user interaction (browser autoplay rules).
- [ ] Sound files are small (under 100 kB in total) and licensed for use.
- [ ] `npm run check` passes.
- [ ] Verified live in the browser: each sound plays once per event; mute silences all.

## Notes

- Whether sound starts muted is decided during the browser check.

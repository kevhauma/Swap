# INF-2 · Deploy

**Priority:** P1 · **Area:** Infra · **Type:** Feature

## User story

As a host, I want a public URL for the game, so friends can join from their own phones with an
invite link.

## Description

Deploy the static client and the WebSocket server, as the README and `GAME_OVERVIEW.md`
section 7 describe.

## Current situation (as-is)

- [README.md](../README.md) describes the production build (`VITE_WS_URL`, `npm start`, `PORT`);
  no host is configured.
- The `/ws` proxy only exists in dev ([vite.config.ts](../apps/web/vite.config.ts)); production
  needs `VITE_WS_URL`.

## Desired result (to-be)

- Client on a static host (Cloudflare Pages or Netlify), server on Fly.io or Render as one
  instance, reached over `wss://`.

## Acceptance criteria

- [ ] Host config in the repo for the server (e.g. `fly.toml` or `render.yaml`) and the client
      build.
- [ ] The client is built with `VITE_WS_URL` pointing at the server.
- [ ] README has a short deploy section (commands and env vars).
- [ ] Verified live: two phones join one room through the invite link and play a round.

## Notes

- Rooms live in memory, so a deploy ends running games: acceptable for now.
- Picking the host is the user's call; account setup is a manual step.

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

- ~~Client on a static host (Cloudflare Pages or Netlify), server on Fly.io or Render as one
  instance, reached over `wss://`.~~
- *2026-11-16, user decision: self-hosted, not Render/Fly/Netlify.* `docker compose up` runs two
  services: `server` (Node 24, `npm start`) and `web` (nginx serving `apps/web/dist`, proxying
  `/ws` to `server`). One host port (`PORT`, default 8080); TLS (`wss://`) comes from the user's
  own reverse proxy in front.

## Acceptance criteria

- [x] ~~Host config in the repo for the server (e.g. `fly.toml` or `render.yaml`) and the client
      build.~~ *(2026-11-16: self-hosted instead.)* `Dockerfile` (targets `server` and `web`,
      pinned `node:24-alpine` / `nginx:1-alpine`), `nginx.conf`, `compose.yaml` and
      `.dockerignore` in the repo; `docker compose build` builds both images. (`docker compose
      build` built `swap-server` and `swap-web` on Docker 27.3.1.)
- [x] ~~The client is built with `VITE_WS_URL` pointing at the server.~~ *(2026-11-16)* The
      client reaches the server same-origin at `/ws` (nginx proxies it with the WebSocket
      `Upgrade`/`Connection` headers and a long read timeout), so the image is built without
      `VITE_WS_URL`; that variable stays only for split hosting. (`nginx.conf` `location /ws`;
      `Dockerfile` `web-build` runs `npm run build` with no `VITE_WS_URL`; the default URL in
      `apps/web/src/useSwap.ts` derives `ws(s)://<host>/ws`.)
- [x] `docker compose up` serves the client on one host port and a WebSocket join through `/ws`
      gets a room back. (`PORT=18080 docker compose up -d`: `GET /` 200 with the built assets;
      `join` room `PROBE` on `ws://localhost:18080/ws` answered `{"type":"joined",...}`.)
- [x] README has a short self-hosting section (commands, env vars, TLS left to the reverse
      proxy). (`README.md` "Self-hosting".)
- [x] `npm run check` and `npm run build` pass. (71 tests pass; vite build OK.)
- [ ] Verified live: two phones join one room through the invite link and play a round. — not
      ticked: needs a deployed host and two phones (browser verification pending).

## Notes

- Rooms live in memory, so a deploy ends running games: acceptable for now.
- ~~Picking the host is the user's call; account setup is a manual step.~~ Settled 2026-11-16:
  self-hosted with Docker Compose.

# Swap

A web version of the Swap card game. Rules, rule decisions and the stack: [GAME_OVERVIEW.md](GAME_OVERVIEW.md).

```
npm install
npm run dev     # game server on :3001 + web app on http://localhost:5173
npm run check   # type check + engine and server tests
```

Open a room, share the invite link (or add bots), start. Two browser tabs are two players.

| Path | What |
|---|---|
| `packages/engine` | Rules as a pure reducer (`apply`), per-player redaction (`viewFor`), bot, message types |
| `apps/server` | Plain WebSocket server (`ws`): rooms, reconnect by token, bots, heartbeat |
| `apps/web` | React + Motion + Tailwind client |

Deploying on a plain server (git pull, npm ci, npm run build, npm start): [DEPLOY.md](DEPLOY.md).

## Self-hosting

```
docker compose up -d --build   # http://<host>:8080
docker compose down            # stop (rooms live in memory, so running games end)
```

Two containers: `server` (the WebSocket server, `npm start`) and `web` (nginx serving the built
client and proxying `/ws` to `server`). Only `web` is published.

| Env var | Default | What |
|---|---|---|
| `PORT` | `8080` | Host port for `web` (set it in the shell or a `.env` file next to `compose.yaml`) |

TLS is not included: put your own reverse proxy (Caddy, Traefik, nginx…) in front for `https://`,
and let it pass WebSocket upgrades on `/ws`. The client connects to `wss://<same host>/ws` on its
own.

Split hosting instead: `npm run build` produces `apps/web/dist` for any static host; build it with
`VITE_WS_URL=wss://your-server` and run `npm start` (`PORT` env, default 3001) on a
WebSocket-friendly host.

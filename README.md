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

Production: `npm run build` produces `apps/web/dist` for any static host; build it with
`VITE_WS_URL=wss://your-server` and run `npm start` (`PORT` env) on a WebSocket-friendly host.

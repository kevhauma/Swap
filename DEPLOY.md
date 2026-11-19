# Deploy

Swap runs as one Node process: it serves the web client and the game (`/ws`) on one port.
Rooms live in memory, so a deploy ends running games.

Needs Node 24.2 or newer and git. Prefer containers? See "Self-hosting" in the
[README](README.md#self-hosting).

## First time

```
git clone https://github.com/kevhauma/Swap.git /opt/swap
cd /opt/swap
```

Then do the steps below.

## Every deploy

```
git pull
npm ci
npm run build    # web client → apps/web/dist
npm start        # http://<host>:3001 (PORT env to change)
```

Stop the old `npm start` first (Ctrl+C), or use the service below.

## Run it as a Linux service

[deploy/swap.service](deploy/swap.service) is a systemd unit. It assumes the clone is in
`/opt/swap` and runs as a `swap` user that only needs to read it. Once:

```
sudo useradd --system --no-create-home --shell /usr/sbin/nologin swap   # skip if User= is an existing account
sudo cp deploy/swap.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now swap
```

After that, every deploy ends with `sudo systemctl restart swap` instead of `npm start`.
Logs: `journalctl -u swap -f`. `status=217/USER` there means the `User=` account does not exist.
The service needs `node` in `/usr/bin` or `/usr/local/bin` (not an nvm install under `/root`).

## HTTPS

Optional: put a reverse proxy (Caddy, nginx, Traefik…) in front for `https://`, pointing the whole
site at `127.0.0.1:3001` with WebSocket upgrades allowed. The client then connects to
`wss://<same host>/ws` on its own.

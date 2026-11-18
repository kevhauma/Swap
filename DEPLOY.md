# Deploy

Swap runs as one Node process (the game server) plus a folder of static files (the web client).
Rooms live in memory, so a deploy ends running games.

Needs Node 24.2 or newer and git. Prefer containers? See "Self-hosting" in the
[README](README.md#self-hosting).

## First time

```
git clone https://github.com/kevhauma/Swap.git /opt/swap
cd /opt/swap
```

Then do the steps below, and set up the web server once (see the end).

## Every deploy

```
git pull
npm ci
npm run build    # web client → apps/web/dist
npm start        # game server on :3001 (PORT env to change)
```

Stop the old `npm start` first (Ctrl+C), or use the service below.

## Run it as a Linux service

[deploy/swap.service](deploy/swap.service) is a systemd unit. It assumes the clone is in
`/opt/swap`; set `User=` to the account that owns the clone (default `swap`). Once:

```
sudo cp deploy/swap.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now swap
```

After that, every deploy ends with `sudo systemctl restart swap` instead of `npm start`.
Logs: `journalctl -u swap -f`.

## Web server

Serve `apps/web/dist` and pass `/ws` to the game server. nginx example:

```
server {
  listen 80;
  root /opt/swap/apps/web/dist;

  location /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 1h;
  }
}
```

Add TLS (`https://`) however you normally do; the client connects to `wss://<same host>/ws` on
its own.

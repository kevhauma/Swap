# Deploy

Swap runs as one Node process (the game server) plus a folder of static files (the web client).
Rooms live in memory, so a deploy ends running games.

Needs Node 24.2 or newer and git. Prefer containers? See "Self-hosting" in the
[README](README.md#self-hosting).

## First time

```
git clone https://github.com/kevhauma/Swap.git swap
cd swap
```

Then do the steps below, and set up the web server once (see the end).

## Every deploy

```
git pull
npm ci
npm run build    # web client → apps/web/dist
npm start        # game server on :3001 (PORT env to change)
```

Stop the old `npm start` first (Ctrl+C), or restart the service if you set one up.

## Keep the server running (optional)

`/etc/systemd/system/swap.service`:

```
[Unit]
Description=Swap game server
After=network.target

[Service]
WorkingDirectory=/path/to/swap
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now swap` once; after each deploy replace `npm start` with
`sudo systemctl restart swap`.

## Web server

Serve `apps/web/dist` and pass `/ws` to the game server. nginx example:

```
server {
  listen 80;
  root /path/to/swap/apps/web/dist;

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

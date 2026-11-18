# Two images from one file: `server` (WebSocket game server) and `web` (nginx + built client).
FROM node:24-alpine AS server
WORKDIR /app
COPY . .
RUN npm ci --omit=dev -w @swap/server
USER node
# Node runs the server's .ts directly (type stripping); PORT defaults to 3001.
CMD ["npm", "start"]

FROM node:24-alpine AS web-build
WORKDIR /app
COPY . .
# No VITE_WS_URL: the client connects same-origin to /ws, which nginx proxies.
RUN npm ci && npm run build

FROM nginx:1-alpine AS web
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html

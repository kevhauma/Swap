# One image: the Node server serves the built web client and the game (/ws) on one port.
FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm ci --omit=dev -w @swap/server
COPY --from=build /app/apps/web/dist apps/web/dist
USER node
EXPOSE 3001
# Node runs the server's .ts directly (type stripping); PORT defaults to 3001.
CMD ["npm", "start"]

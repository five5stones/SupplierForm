FROM node:22-bookworm-slim AS builder

WORKDIR /app

# npm often crashes with "Exit handler never called" when the host is low on RAM.
ENV NODE_OPTIONS=--max-old-space-size=1024
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_maxsockets=2

COPY package*.json ./
RUN npm ci --no-audit --fund=false --progress=false \
  || npm ci --no-audit --fund=false --progress=false

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000
ENV DATA_DIR=/app/data
ENV UPLOAD_DIR=/app/data/uploads

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data/uploads

EXPOSE 4000

CMD ["node", "./dist/server/entry.mjs"]

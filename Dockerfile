FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Low-RAM VPS builds often kill npm mid-install (shows as "Exit handler never called").
ENV NODE_OPTIONS=--max-old-space-size=768
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_maxsockets=1

COPY package*.json ./
RUN npm install --no-audit --fund=false --progress=false --ignore-scripts \
  && npm rebuild esbuild --foreground-scripts

COPY . .
RUN node ./node_modules/astro/astro.js build && npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

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
